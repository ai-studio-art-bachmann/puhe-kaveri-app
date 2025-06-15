
import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(async () => {
    try {
      // Sulge kõik olemasolevad vood enne uue avamist
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopping existing track:', track.kind);
        });
        streamRef.current = null;
        setIsOpen(false);
        
        // Anna veidi aega kaamera sulgemiseks
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('Requesting camera access...');
      
      // Proovi erinevaid seadeid
      const constraints = [
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
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          } 
        },
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
          
          // Kui kaamera on kasutuses, oota ja proovi uuesti
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
        
        // Oota video valmidust
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
          
          // Timeout kaitseks
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
      
      // Cleanup ebaõnnestumisel
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsOpen(false);
      
      // Konkreetsed veateated
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
      
      // Optimize to max 1280px width
      const aspectRatio = video.videoHeight / video.videoWidth;
      const maxWidth = 1280;
      const width = Math.min(video.videoWidth, maxWidth);
      const height = width * aspectRatio;
      
      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      context.drawImage(video, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.9);
    });
  }, [isOpen]);

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

  // Cleanup on unmount - fix: use useEffect instead of useState
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
    open,
    capture,
    close
  };
};
