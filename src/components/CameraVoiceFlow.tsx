
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCameraVoiceFlow } from '@/hooks/useCameraVoiceFlow';
import { FilenameInput } from './FilenameInput';
import { Mic, Camera, RotateCcw, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraVoiceFlowProps {
  webhookUrl: string;
  conversation: any; // conversation object from useConversation
}

export const CameraVoiceFlow: React.FC<CameraVoiceFlowProps> = ({ webhookUrl, conversation }) => {
  const [showFilenameInput, setShowFilenameInput] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  
  const flow = useCameraVoiceFlow(webhookUrl, conversation);

  const handlePhotoCapture = async () => {
    try {
      const blob = await flow.capturePhoto();
      setPendingPhoto(blob);
      setShowFilenameInput(true);
    } catch (error) {
      console.error('Photo capture failed:', error);
    }
  };

  const handleFilenameSubmit = (fileName: string) => {
    if (pendingPhoto) {
      flow.processPhotoWithFilename(pendingPhoto, fileName);
      setPendingPhoto(null);
      setShowFilenameInput(false);
    }
  };

  const handleFilenameCancel = () => {
    setPendingPhoto(null);
    setShowFilenameInput(false);
    flow.resetFlow();
  };

  const getStepDescription = () => {
    switch (flow.step) {
      case 'idle':
        return 'Aloita ottamalla kuva';
      case 'camera':
        return 'Kamera on päällä - ota kuva';
      case 'captured':
        return 'Kuva otettu - anna failile nimi';
      case 'processing':
        return 'Käsittelen kuvaa...';
      case 'playing':
        return 'Toisin analyysiä...';
      default:
        return 'Aloita ottamalla kuva';
    }
  };

  const getMainButton = () => {
    if (showFilenameInput) {
      return null; // FilenameInput handles this
    }

    switch (flow.step) {
      case 'idle':
        return (
          <Button
            onClick={flow.startFlow}
            className="w-full h-20 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-semibold"
          >
            <Camera className="mr-2" size={24} />
            Aloita kuvanotto
          </Button>
        );
      
      case 'camera':
        return (
          <Button
            onClick={handlePhotoCapture}
            className="w-full h-20 rounded-full shadow-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg font-semibold"
          >
            <Camera className="mr-2" size={24} />
            Ota kuva
          </Button>
        );
      
      case 'processing':
        return (
          <div className="w-full h-20 rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
            <span className="text-white font-semibold">Käsittelen...</span>
          </div>
        );
      
      case 'playing':
        return (
          <div className="w-full h-20 rounded-full shadow-lg bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center animate-pulse">
              <Volume2 size={32} className="text-indigo-600" />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-4">
      {/* Camera View */}
      <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
        <video
          ref={flow.videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            flow.step === 'camera' ? 'block' : 'hidden'
          )}
        />
        {flow.photoBlob && (
          <img
            src={URL.createObjectURL(flow.photoBlob)}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}
        {flow.step === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <Camera size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-lg">Kamera ei ole käytössä</p>
            </div>
          </div>
        )}
      </div>

      <canvas ref={flow.canvasRef} className="hidden" />

      {/* Status */}
      <div className="text-center max-w-md">
        <p className="text-gray-700 font-medium text-lg">{getStepDescription()}</p>
        {flow.fileName && (
          <p className="text-sm text-gray-500 mt-1">Tiedosto: {flow.fileName}.jpg</p>
        )}
        {!flow.isOnline && (
          <p className="text-sm text-amber-600 mt-1 font-medium">⚠️ Offline-tila - tallennus lykätään</p>
        )}
      </div>

      {/* Filename Input */}
      {showFilenameInput && (
        <FilenameInput
          onSubmit={handleFilenameSubmit}
          onCancel={handleFilenameCancel}
        />
      )}

      {/* Main Action Button */}
      {!showFilenameInput && (
        <div className="w-full max-w-md">
          {getMainButton()}
        </div>
      )}

      {/* Reset Button */}
      {flow.step !== 'idle' && !showFilenameInput && (
        <Button
          onClick={flow.resetFlow}
          variant="outline"
          className="w-full max-w-md border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <RotateCcw className="mr-2" size={16} />
          Aloita alusta
        </Button>
      )}
    </div>
  );
};
