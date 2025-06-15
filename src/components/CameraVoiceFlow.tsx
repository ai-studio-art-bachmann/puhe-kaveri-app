
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCameraVoiceFlow } from '@/hooks/useCameraVoiceFlow';
import { FilenameInput } from './FilenameInput';
import { Mic, Camera, RotateCcw, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraVoiceFlowProps {
  webhookUrl: string;
  conversation: any;
}

export const CameraVoiceFlow: React.FC<CameraVoiceFlowProps> = ({ 
  webhookUrl, 
  conversation
}) => {
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
      return null;
    }

    switch (flow.step) {
      case 'idle':
        return (
          <Button
            onClick={flow.startFlow}
            className="w-40 h-40 rounded-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-lg transition-all duration-200 text-gray-700 hover:text-gray-800"
          >
            <div className="flex flex-col items-center space-y-2">
              <Camera size={64} className="text-gray-600" />
              <span className="text-sm font-medium">Aloita</span>
            </div>
          </Button>
        );
      
      case 'camera':
        return (
          <Button
            onClick={handlePhotoCapture}
            className="w-40 h-40 rounded-full bg-blue-500 hover:bg-blue-600 shadow-xl transition-all duration-200 text-white border-0"
          >
            <div className="flex flex-col items-center space-y-2">
              <Camera size={64} />
              <span className="text-sm font-medium">Ota kuva</span>
            </div>
          </Button>
        );
      
      case 'processing':
        return (
          <div className="w-40 h-40 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-400 border-t-transparent"></div>
              <span className="text-sm text-gray-600 font-medium">Käsittelen</span>
            </div>
          </div>
        );
      
      case 'playing':
        return (
          <div className="w-40 h-40 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <Volume2 size={48} className="text-green-600" />
              </div>
              <span className="text-sm text-green-700 font-medium">Toistan</span>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 mx-5">
      {/* Camera View - Made 50% larger */}
      <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-200">
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
            <div className="text-center text-gray-300">
              <Camera size={72} className="mx-auto mb-4 opacity-50" />
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
        <div className="w-full max-w-md flex justify-center">
          {getMainButton()}
        </div>
      )}

      {/* Reset Button */}
      {flow.step !== 'idle' && !showFilenameInput && (
        <Button
          onClick={flow.resetFlow}
          variant="outline"
          className="px-8 py-3 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition-colors duration-200"
        >
          <RotateCcw size={20} className="mr-2" />
          <span className="text-base font-medium">Aloita alusta</span>
        </Button>
      )}
    </div>
  );
};
