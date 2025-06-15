import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(async () => {
    try {
      // Close any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      console.log('Requesting camera access...');
      
      // Try with different constraint configurations
      let stream: MediaStream;
      
      try {
        // First try with environment camera (back camera on mobile)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          } 
        });
      } catch (envError) {
        console.log('Environment camera failed, trying user camera:', envError);
        try {
          // Fallback to user camera (front camera)
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: "user",
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 }
            } 
          });
        } catch (userError) {
          console.log('User camera failed, trying basic constraints:', userError);
          // Final fallback - basic video only
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true
          });
        }
      }
      
      streamRef.current = stream;
      console.log('Camera stream obtained successfully');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
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
          
          // Set a timeout as additional safety
          setTimeout(() => {
            if (!isOpen) {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Video loading timeout'));
            }
          }, 5000);
        });
      }
    } catch (error) {
      console.error('Camera open failed:', error);
      
      // Cleanup on failure
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Provide specific error messages
      let errorMessage = 'Kamera ei käivitu';
      let description = 'Tarkista kameran käyttöoikeudet';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          description = 'Kamera kasutamise luba on vaja anda';
        } else if (error.name === 'NotFoundError') {
          description = 'Kameraid ei leitud';
        } else if (error.name === 'NotReadableError') {
          description = 'Kamera on juba kasutuses või ei ole kättesaadav';
        } else if (error.name === 'OverconstrainedError') {
          description = 'Kamera ei toeta nõutud seadeid';
        } else if (error.name === 'SecurityError') {
          description = 'Turvapoliitika blokeerib kamera kasutamise';
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
