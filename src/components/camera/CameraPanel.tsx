import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

type CameraState = 'idle' | 'opening' | 'ready' | 'capturing' | 'denied' | 'error';
type CameraFacingMode = 'user' | 'environment';

interface CameraPanelProps {
  onCapture: (image: Blob) => void;
  className?: string;
  // Whether this panel is currently active (e.g., Camera tab is selected). If false, stream will be closed.
  isActive?: boolean;
}

export function CameraPanel({ onCapture, className = '', isActive = true }: CameraPanelProps) {
  const { t } = useTranslation('camera');
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openWatchdogRef = useRef<number | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [showFilenameInput, setShowFilenameInput] = useState(false);
  const [filename, setFilename] = useState<string>('');

  // Cleanup function to stop all media streams
  const cleanup = () => {
    // Clear any pending watchdog
    if (openWatchdogRef.current) {
      window.clearTimeout(openWatchdogRef.current);
      openWatchdogRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Initialize camera devices
  const initializeDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      
      if (videoDevices.length === 0) {
        throw new Error(t('errors.noCamera'));
      }
      
      return videoDevices;
    } catch (err: any) {
      console.error('Error initializing devices:', err);
      setState('error');
      setError(t('errors.deviceInit'));
      return [];
    }
  };

  // Start camera stream
  const startCamera = async (force = false) => {
    if (state === 'opening' || (state === 'ready' && !force)) return;
    
    setState('opening');
    setError(null);
    
    try {
      // Always stop existing tracks before starting a new stream (prevents multiple instances and switching issues)
      cleanup();

      const tryGetStream = async (): Promise<MediaStream> => {
        const attempts: MediaStreamConstraints[] = [];
        // If a specific device is selected, try it first
        if (selectedDeviceId) {
          attempts.push({ video: { deviceId: { exact: selectedDeviceId } }, audio: false });
        }
        // Try requested facing mode
        attempts.push({ video: { facingMode }, audio: false });
        // Fallbacks
        attempts.push({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        attempts.push({ video: { facingMode: { ideal: 'user' } }, audio: false });
        attempts.push({ video: true, audio: false });

        let lastErr: unknown;
        for (const c of attempts) {
          try {
            console.debug('[CameraPanel] getUserMedia with', c);
            return await navigator.mediaDevices.getUserMedia(c);
          } catch (e) {
            console.warn('[CameraPanel] constraint failed, trying next', e);
            lastErr = e;
          }
        }
        throw lastErr ?? new Error('Camera open failed');
      };

      const stream = await tryGetStream();
      
      if (!videoRef.current) {
        cleanup();
        throw new Error(t('errors.videoElement'));
      }

      streamRef.current = stream;
      const vid = videoRef.current;
      vid.srcObject = stream;

      // Mark ready (idempotent)
      const markReady = () => {
        if (openWatchdogRef.current) {
          window.clearTimeout(openWatchdogRef.current);
          openWatchdogRef.current = null;
        }
        setState(prev => (prev === 'opening' ? 'ready' : prev));
        console.debug('[CameraPanel] markReady; video.readyState=', vid.readyState);
      };

      const tryPlay = async () => {
        try {
          await vid.play();
        } catch (e) {
          // Ignore autoplay errors; watchdog will handle readiness
          console.warn('[CameraPanel] video.play() error (ignored):', e);
        }
      };

      const onAnyReady = () => {
        if (vid.readyState >= 2) {
          markReady();
        }
      };

      vid.addEventListener('loadedmetadata', onAnyReady, { once: true });
      vid.addEventListener('canplay', onAnyReady, { once: true });
      vid.addEventListener('loadeddata', onAnyReady, { once: true });
      vid.addEventListener('playing', onAnyReady, { once: true });

      // Track-based readiness: when the video track unmutes or becomes live, we are good
      const tracks = stream.getVideoTracks();
      const track = tracks[0];
      if (track) {
        console.debug('[CameraPanel] track state:', track.readyState, 'muted=', track.muted);
        if (track.readyState === 'live' && !track.muted) {
          markReady();
        } else {
          const onUnmute = () => {
            console.debug('[CameraPanel] track unmuted');
            markReady();
            (track as any).removeEventListener?.('unmute', onUnmute as any);
          };
          (track as any).addEventListener?.('unmute', onUnmute as any);
        }
      }

      // Kick playback attempt
      tryPlay();

      // Watchdog: after 6000ms, if enough data then ready, else error
      openWatchdogRef.current = window.setTimeout(() => {
        console.error('[CameraPanel] readiness watchdog fired; readyState=', vid.readyState);
        if (vid.readyState >= 2) {
          markReady();
        } else {
          const tracksNow = streamRef.current?.getVideoTracks();
          const st = tracksNow && tracksNow[0];
          console.error('[CameraPanel] track state now:', st?.readyState, 'muted=', st?.muted);
          setState('error');
          setError(t('errors.cameraAccess'));
        }
      }, 6000);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      cleanup();
      const name = err?.name as string | undefined;
      setState(name === 'NotAllowedError' ? 'denied' : 'error');
      setError(
        name === 'NotAllowedError'
          ? t('errors.permissionDenied')
          : name === 'NotFoundError'
          ? t('errors.noCamera')
          : t('errors.cameraAccess')
      );
    }
  };

  // Capture image from video stream
  const captureImage = () => {
    if (state !== 'ready' || !videoRef.current || !canvasRef.current) return;
    
    setState('capturing');
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error(t('errors.canvasContext'));
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error(t('errors.imageCapture'));
        }

        // Prepare filename and preview, show overlay
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreviewUrl(url);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        setFilename(`photo-${ts}`);
        setShowFilenameInput(true);

        // Return to ready to keep camera visible behind overlay
        setState('ready');
      }, 'image/jpeg', 0.9);
      
    } catch (err: any) {
      console.error('Error capturing image:', err);
      setState('error');
      setError(t('errors.captureFailed'));
    }
  };

  // Confirm save: forward blob to parent and close overlay
  const confirmSave = () => {
    if (!capturedBlob) return;
    try {
      onCapture(capturedBlob);
    } finally {
      if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedBlob(null);
      setCapturedPreviewUrl(null);
      setShowFilenameInput(false);
    }
  };

  const retake = () => {
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setShowFilenameInput(false);
    // Stay in ready state; user can capture again
  };

  // Toggle between front and back camera
  const toggleCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    // Reset specific device selection when using facingMode to avoid conflicts
    setSelectedDeviceId('');
    
    if (state === 'ready') {
      await startCamera(true);
    }
  };

  // Close camera
  const closeCamera = () => {
    cleanup();
    setState('idle');
    setError(null);
  };

  // Initialize on mount
  useEffect(() => {
    initializeDevices();
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  // React to active tab/panel changes
  useEffect(() => {
    if (!isActive && state === 'ready') {
      closeCamera();
    }
    // When becoming active, do not auto-open; user must click CTA per UX.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Handle visibility change to pause/resume camera
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state === 'ready') {
        closeCamera();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state]);

  // Update device list when devices change (e.g., plugging in webcam)
  useEffect(() => {
    const handler = () => {
      initializeDevices();
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render different UI states
  const renderState = () => {
    switch (state) {
      case 'idle':
        return (
          <div className="flex h-full w-full items-center justify-center bg-gray-50">
            <div className="text-center p-4">
              <p className="mb-4 text-gray-700">{t('instructions.initial')}</p>
              <button
                onClick={() => startCamera()}
                className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={t('actions.openCamera')}
              >
                {t('actions.openCamera')}
              </button>
            </div>
          </div>
        );

      case 'opening':
        return (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-700">{t('states.opening')}</span>
          </div>
        );

      case 'ready':
        return (
          <div className="relative overflow-hidden bg-black rounded-lg h-full w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              disablePictureInPicture
              controlsList="nofullscreen noplaybackrate nodownload"
              className="w-full h-full object-cover"
              aria-label={t('labels.cameraPreview')}
            />
            {/* Filename overlay after capture */}
            {showFilenameInput && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
                  {capturedPreviewUrl && (
                    <img src={capturedPreviewUrl} alt="preview" className="w-full rounded-lg mb-3" />
                  )}
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('labels.filename') || 'Tiedoston nimi'}
                  </label>
                  <input
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={retake}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('actions.retake') || 'Ota uusi'}
                    </button>
                    <button
                      onClick={confirmSave}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('actions.save') || 'Tallenna'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex justify-center space-x-4">
                <button
                  onClick={captureImage}
                  className="w-16 h-16 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                  aria-label={t('actions.capture')}
                >
                  <div className="w-12 h-12 mx-auto bg-red-600 rounded-full"></div>
                </button>
                {availableDevices.length > 1 && (
                  <button
                    onClick={toggleCamera}
                    className="p-2 text-white bg-black/50 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                    aria-label={t('actions.switchCamera')}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={closeCamera}
                  className="p-2 text-white bg-black/50 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                  aria-label={t('actions.close')}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );

      case 'capturing':
        return (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <div className="animate-pulse">
              <span className="text-gray-700">{t('states.capturing')}</span>
            </div>
          </div>
        );

      case 'denied':
      case 'error':
        return (
          <div className="h-full w-full p-6 text-center bg-red-50 rounded-lg">
            <div className="text-red-600">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium">{t('errors.title')}</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => startCamera()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('actions.retry')}
              </button>
              <button
                onClick={closeCamera}
                className="px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('actions.close')}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`camera-panel w-full max-w-md mx-auto max-h-[80vh] ${className}`}>
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Stable aspect-ratio container to prevent layout shifts and avoid fullscreen */}
      <div className="w-full mx-auto max-w-md">
        <div className="rounded-lg overflow-hidden aspect-video bg-gray-100">
          {/* Render state directly, sized by the aspect box */}
          <div className="h-full w-full">
            {renderState()}
          </div>
        </div>
      </div>
      
      {/* ARIA live region for status updates */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {state === 'ready' && t('aria.cameraReady')}
        {state === 'capturing' && t('aria.capturing')}
        {state === 'error' && t('aria.error')}
      </div>
    </div>
  );
}

export default CameraPanel;
