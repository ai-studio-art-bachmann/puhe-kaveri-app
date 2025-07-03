
import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState<number>(0);

  // Detect device orientation
  const getDeviceOrientation = useCallback(() => {
    if (screen.orientation) {
      return screen.orientation.angle;
    }
    // Fallback for older browsers
    return window.orientation || 0;
  }, []);

  // Handle orientation changes
  const handleOrientationChange = useCallback(() => {
    const orientation = getDeviceOrientation();
    setCurrentOrientation(orientation);
    console.log('Orientation changed to:', orientation);
  }, [getDeviceOrientation]);

  useEffect(() => {
    // Listen for orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('orientationchange', handleOrientationChange);
    }

    // Set initial orientation
    setCurrentOrientation(getDeviceOrientation());

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      } else {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
    };
  }, [handleOrientationChange, getDeviceOrientation]);

  const open = useCallback(async () => {
    try {
      // Close existing streams first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopping existing track:', track.kind);
        });
        streamRef.current = null;
        setIsOpen(false);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('Requesting camera access...');
      
      // Enhanced constraints for better mobile camera experience
      const constraints = [
        { 
          video: { 
            facingMode: "environment",
            width: { ideal: 1920, max: 4096 },
            height: { ideal: 1080, max: 2160 },
            aspectRatio: { ideal: 16/9 }
          } 
        },
        { 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          } 
        },
        { 
          video: { 
            facingMode: "user",
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          } 
        },
        { video: { facingMode: "environment" } },
        { video: true }
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      for (const constraint of constraints) {
        try {
          console.log('Trying constraint:', constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('Camera access successful with constraint:', constraint);
          break;
        } catch (error) {
          console.log('Failed with constraint:', constraint, error);
          lastError = error as Error;
          
          if ((error as Error).name === 'NotReadableError') {
            console.log('Camera busy, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('No camera access possible');
      }
      
      streamRef.current = stream;
      console.log('Camera stream obtained successfully');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'));
            return;
          }
          
          const video = videoRef.current;
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            console.log('Video metadata loaded, camera ready');
            setIsOpen(true);
            resolve();
          };
          
          const onError = (error: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            console.error('Video loading error:', error);
            reject(new Error('Video loading failed'));
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
          
          setTimeout(() => {
            if (!isOpen) {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Video loading timeout'));
            }
          }, 10000);
        });
      }
    } catch (error) {
      console.error('Camera open failed:', error);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsOpen(false);
      
      let errorMessage = 'Kaamera ei käivitu';
      let description = 'Kontrolli kaamera õigusi';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          description = 'Kaamera kasutamise luba tuleb anda';
        } else if (error.name === 'NotFoundError') {
          description = 'Kaamerat ei leitud';
        } else if (error.name === 'NotReadableError') {
          description = 'Kaamera on juba kasutuses või pole kättesaadav. Proovi lehte uuesti laadida.';
        } else if (error.name === 'OverconstrainedError') {
          description = 'Kaamera ei toeta nõutud seadeid';
        } else if (error.name === 'SecurityError') {
          description = 'Turvapoliitika blokeerib kaamera kasutamise';
        }
      }
      
      toast({
        title: errorMessage,
        description: description,
        variant: "destructive"
      });
      
      throw error;
    }
  }, [isOpen]);

  const capture = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current || !isOpen) {
        reject(new Error('Camera not ready'));
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Get video dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      console.log('Video dimensions:', videoWidth, 'x', videoHeight);
      console.log('Current orientation:', currentOrientation);

      // Determine canvas dimensions based on orientation
      let canvasWidth: number;
      let canvasHeight: number;
      let rotation = 0;

      // Calculate rotation based on device orientation
      switch (currentOrientation) {
        case 0: // Portrait
          canvasWidth = Math.min(videoWidth, 1080);
          canvasHeight = Math.min(videoHeight, 1920);
          rotation = 0;
          break;
        case 90: // Landscape (rotated left)
          canvasWidth = Math.min(videoHeight, 1920);
          canvasHeight = Math.min(videoWidth, 1080);
          rotation = -90;
          break;
        case -90: // Landscape (rotated right)
        case 270:
          canvasWidth = Math.min(videoHeight, 1920);
          canvasHeight = Math.min(videoWidth, 1080);
          rotation = 90;
          break;
        case 180: // Portrait upside down
          canvasWidth = Math.min(videoWidth, 1080);
          canvasHeight = Math.min(videoHeight, 1920);
          rotation = 180;
          break;
        default:
          // Auto-detect based on video aspect ratio
          if (videoWidth > videoHeight) {
            // Landscape video
            canvasWidth = Math.min(videoWidth, 1920);
            canvasHeight = Math.min(videoHeight, 1080);
          } else {
            // Portrait video
            canvasWidth = Math.min(videoWidth, 1080);
            canvasHeight = Math.min(videoHeight, 1920);
          }
          rotation = 0;
      }

      // Set canvas dimensions
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Clear canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      // Apply rotation if needed
      if (rotation !== 0) {
        context.save();
        
        // Move to center for rotation
        context.translate(canvasWidth / 2, canvasHeight / 2);
        context.rotate((rotation * Math.PI) / 180);
        
        // Draw image centered
        if (Math.abs(rotation) === 90) {
          // For 90-degree rotations, swap width/height
          context.drawImage(
            video, 
            -canvasHeight / 2, 
            -canvasWidth / 2, 
            canvasHeight, 
            canvasWidth
          );
        } else {
          context.drawImage(
            video, 
            -canvasWidth / 2, 
            -canvasHeight / 2, 
            canvasWidth, 
            canvasHeight
          );
        }
        
        context.restore();
      } else {
        // No rotation needed
        context.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      }

      // Convert to blob with high quality
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Photo captured:', {
            size: blob.size,
            dimensions: `${canvasWidth}x${canvasHeight}`,
            orientation: currentOrientation,
            rotation: rotation
          });
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.92);
    });
  }, [isOpen, currentOrientation]);

  const close = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isOpen,
    currentOrientation,
    open,
    capture,
    close
  };
};
