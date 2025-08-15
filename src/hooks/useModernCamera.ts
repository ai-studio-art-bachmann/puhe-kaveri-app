import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

type CameraConstraints = MediaStreamConstraints;

export const useModernCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsActive(false);
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      console.log('Starting camera...');
      
      // Simple constraint that works
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('Camera stream obtained');
      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        const onReady = () => {
          setIsActive(true);
          console.log('Camera is now active');
        };

        // Ensure playback starts on mobile Safari/iOS
        video.onloadedmetadata = onReady;
        // Some browsers fire canplay instead
        video.oncanplay = onReady;
        try {
          await video.play();
          onReady();
        } catch (e) {
          console.warn('video.play() failed, relying on events:', e);
          // Fallback timeout in case events don't fire
          setTimeout(onReady, 1200);
        }
      }
    } catch (error) {
      console.error('Camera start failed:', error);
      setError('Kamera ei käynnisty');
      setIsActive(false);
      
      toast({
        title: "Kamera ei käynnisty",
        description: "Tarkista kameran käyttöoikeudet",
        variant: "destructive"
      });
    }
  }, []);

  const capturePhoto = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current || !isActive) {
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

      // Use the video element's display dimensions
      const displayWidth = video.clientWidth;
      const displayHeight = video.clientHeight;
      
      if (displayWidth === 0 || displayHeight === 0) {
        reject(new Error('Video element not visible'));
        return;
      }

      // Set canvas to match display dimensions
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Clear and draw exactly what's visible
      context.clearRect(0, 0, displayWidth, displayHeight);
      context.drawImage(video, 0, 0, displayWidth, displayHeight);

      // Convert to JPEG
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Photo captured:', {
            size: blob.size,
            dimensions: `${displayWidth}x${displayHeight}`
          });
          resolve(blob);
        } else {
          reject(new Error('Failed to create photo blob'));
        }
      }, 'image/jpeg', 0.9);
    });
  }, [isActive]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setError(null);
  }, []);

  const switchCamera = useCallback(async () => {
    if (!isActive) return;
    
    try {
      const currentStream = streamRef.current;
      if (!currentStream) return;

      const currentTrack = currentStream.getVideoTracks()[0];
      const currentFacingMode = currentTrack.getSettings().facingMode;
      
      // Toggle between front and back camera
      const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      
      stopCamera();
      
      // Small delay before starting new camera
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (error) {
      console.error('Camera switch failed:', error);
      toast({
        title: "Kameran vaihto epäonnistui",
        description: "Yritä uudelleen",
        variant: "destructive"
      });
    }
  }, [isActive, stopCamera]);

  // Cleanup on unmount
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
    isActive,
    error,
    startCamera,
    capturePhoto,
    stopCamera,
    switchCamera
  };
};