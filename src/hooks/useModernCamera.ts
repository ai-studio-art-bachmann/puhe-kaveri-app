import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

type CameraConstraints = MediaStreamConstraints;

export const useModernCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchdogRef = useRef<number | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsActive(false);
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      console.log('Starting camera...');
      
      const tryGetStream = async (): Promise<MediaStream> => {
        // Try environment, then user, then generic
        const attempts: MediaStreamConstraints[] = [
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: true }
        ];
        let lastErr: unknown;
        for (const c of attempts) {
          try {
            console.log('[useModernCamera] getUserMedia with', c);
            return await navigator.mediaDevices.getUserMedia(c);
          } catch (e) {
            console.warn('[useModernCamera] constraint failed, trying next', e);
            lastErr = e;
          }
        }
        throw lastErr ?? new Error('Camera open failed');
      };

      const stream = await tryGetStream();

      console.log('Camera stream obtained');
      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        // idempotent activation
        const markActive = () => {
          if (!isActive) setIsActive(true);
          if (watchdogRef.current) {
            window.clearTimeout(watchdogRef.current);
            watchdogRef.current = null;
          }
          console.log('[useModernCamera] active; readyState=', video.readyState);
        };

        const onAnyReady = () => {
          if (video.readyState >= 2) markActive();
        };

        video.addEventListener('loadedmetadata', onAnyReady, { once: true });
        video.addEventListener('canplay', onAnyReady, { once: true });
        video.addEventListener('loadeddata', onAnyReady, { once: true });
        video.addEventListener('playing', onAnyReady, { once: true });

        // Track readiness as well
        const track = stream.getVideoTracks()[0];
        const onUnmute = () => {
          console.log('[useModernCamera] track unmuted');
          markActive();
          track.removeEventListener('unmute', onUnmute as any);
        };
        if (track) {
          if ((track as any).muted === false && track.readyState === 'live') markActive();
          // @ts-ignore unmute exists across browsers
          track.addEventListener?.('unmute', onUnmute);
        }

        // Try to play; ignore failures
        try {
          await video.play();
        } catch (e) {
          console.warn('[useModernCamera] video.play() error (ignored):', e);
        }

        // Watchdog in case events don't fire
        watchdogRef.current = window.setTimeout(() => {
          console.error('[useModernCamera] readiness watchdog; readyState=', video.readyState);
          if (video.readyState >= 2) markActive();
          else {
            setError('Kamera ei käynnisty');
            setIsActive(false);
          }
        }, 5000);
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
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
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
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
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