import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModernCamera } from '@/hooks/useModernCamera';
import { ModernCameraView } from './ModernCameraView';
import { FilenameInput } from './FilenameInput';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ModernCameraAppProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
  onClose?: () => void;
}

export const ModernCameraApp: React.FC<ModernCameraAppProps> = ({ 
  webhookUrl, 
  language,
  onClose 
}) => {
  const camera = useModernCamera();
  const [isOpen, setIsOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [showFilenameInput, setShowFilenameInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Start camera only after the overlay is mounted so videoRef exists
  useEffect(() => {
    if (isOpen) {
      camera.startCamera();
    }
  }, [isOpen]);

  const handleOpenCamera = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleCloseCamera = useCallback(() => {
    camera.stopCamera();
    setIsOpen(false);
    setCapturedBlob(null);
    setCapturedImageUrl(null);
    setShowFilenameInput(false);
    onClose?.();
  }, [camera, onClose]);

  const handleCapture = useCallback(async () => {
    try {
      setIsProcessing(true);
      const blob = await camera.capturePhoto();
      setCapturedBlob(blob);
      
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImageUrl(imageUrl);
      setShowFilenameInput(true);
    } catch (error) {
      console.error('Capture failed:', error);
      toast({
        title: "Kuvan otto epäonnistui",
        description: "Yritä uudelleen",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [camera]);

  const handleRetake = useCallback(async () => {
    setCapturedBlob(null);
    setCapturedImageUrl(null);
    setShowFilenameInput(false);
    
    try {
      await camera.startCamera();
    } catch (error) {
      handleCloseCamera();
    }
  }, [camera, handleCloseCamera]);

  const handleFilenameSubmit = useCallback(async (filename: string) => {
    if (!capturedBlob) return;

    setIsProcessing(true);
    setShowFilenameInput(false);

    try {
      const formData = new FormData();
      formData.append('file', capturedBlob, `${filename}.jpg`);
      formData.append('filename', `${filename}.jpg`);
      formData.append('filetype', 'image/jpeg');
      formData.append('source', 'modern-camera');
      formData.append('timestamp', new Date().toISOString());

      console.log('Uploading photo to webhook:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      toast({
        title: "Kuva lähetetty",
        description: `${filename}.jpg lähetetty onnistuneesti`,
      });

      handleCloseCamera();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Lähetys epäonnistui",
        description: error instanceof Error ? error.message : "Tuntematon virhe",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [capturedBlob, webhookUrl, handleCloseCamera]);

  const handleFilenameCancel = useCallback(() => {
    setShowFilenameInput(false);
    handleRetake();
  }, [handleRetake]);

  // Camera trigger button when not open
  if (!isOpen) {
    return (
      <div className="flex flex-col items-center space-y-4 p-4">
        <Button
          onClick={handleOpenCamera}
          size="lg"
          className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg"
        >
          <div className="flex items-center space-x-3">
            <Camera size={24} />
            <span className="text-lg font-medium">Avaa kamera</span>
          </div>
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          Ota kuvia ja analysoi niitä älykkäästi
        </p>
      </div>
    );
  }

  return (
    <>
      {createPortal(
        <ModernCameraView
          videoRef={camera.videoRef}
          isActive={camera.isActive}
          error={camera.error}
          capturedImage={capturedImageUrl}
          onCapture={handleCapture}
          onRetake={handleRetake}
          onClose={handleCloseCamera}
          onSwitchCamera={camera.switchCamera}
          isProcessing={isProcessing}
        />,
        document.body
      )}
      
      <canvas ref={camera.canvasRef} className="hidden" />
      
      {showFilenameInput && createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Anna kuvalle nimi
            </h3>
            <FilenameInput
              onSubmit={handleFilenameSubmit}
              onCancel={handleFilenameCancel}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};