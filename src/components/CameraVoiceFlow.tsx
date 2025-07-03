import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCameraVoiceFlow } from '@/hooks/useCameraVoiceFlow';
import { FilenameInput } from './FilenameInput';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Camera, RotateCcw, Volume2, Play, Square } from 'lucide-react';
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
        return 'Paina nappia kameran käynnistämiseksi';
      case 'camera':
        return 'Kamera on valmis - paina suurta nappia kuvan ottamiseksi';
      case 'captured':
        return 'Kuva otettu - syötä tiedostonimi';
      case 'processing':
        return 'Käsittelen kuvaa...';
      case 'playing':
        return 'Toistan vastausta...';
      default:
        return 'Paina nappia aloittaaksesi';
    }
  };

  // Get orientation description for user feedback
  const getOrientationDescription = () => {
    if (!flow.currentOrientation) return '';
    
    switch (flow.currentOrientation) {
      case 0:
        return 'Püstine asend';
      case 90:
      case -90:
      case 270:
        return 'Rõhtne asend';
      case 180:
        return 'Püstine asend (pea alaspidi)';
      default:
        return '';
    }
  };

  return (
    <div className="w-full h-screen flex flex-col relative">
      {/* Camera View - Full height */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
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
            className="w-full h-full object-contain bg-black"
          />
        )}
        {flow.step === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center text-slate-300">
              <Camera size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Kamera ei ole aktiivne</p>
            </div>
          </div>
        )}
        
        {/* Orientation indicator */}
        {flow.step === 'camera' && flow.currentOrientation !== undefined && (
          <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs">
            {getOrientationDescription()}
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-4 right-4 max-w-xs">
          <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg p-3">
            <div className="text-center space-y-1">
              <p className="font-medium text-white text-xs">{getStepDescription()}</p>
              {flow.fileName && (
                <p className="text-xs text-white/80">Tiedosto: {flow.fileName}.jpg</p>
              )}
              {!flow.isOnline && (
                <div className="flex items-center justify-center space-x-2 text-amber-300">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Action Button - Always visible when camera is active */}
        {flow.step === 'camera' && !showFilenameInput && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={handlePhotoCapture}
              size="lg"
              className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg border-4 border-white"
            >
              <Camera size={32} className="text-white" />
            </Button>
          </div>
        )}

        {/* Start Camera Button */}
        {flow.step === 'idle' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={flow.startFlow}
              size="lg"
              className="w-24 h-24 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
            >
              <div className="flex flex-col items-center space-y-1">
                <Camera size={32} />
                <span className="text-xs font-medium">Käynnistä</span>
              </div>
            </Button>
          </div>
        )}

        {/* Processing indicator */}
        {flow.step === 'processing' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="w-20 h-20 rounded-full bg-slate-100 border flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-400 border-t-transparent"></div>
                <span className="text-xs text-slate-600 font-medium">Käsittelen</span>
              </div>
            </div>
          </div>
        )}

        {/* Playing indicator */}
        {flow.step === 'playing' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-1">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                  <Volume2 size={20} className="text-green-600" />
                </div>
                <span className="text-xs text-green-700 font-medium">Toistan</span>
              </div>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {flow.step !== 'idle' && flow.step !== 'camera' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={flow.resetFlow}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RotateCcw size={16} className="mr-2" />
              Nollaa
            </Button>
          </div>
        )}
      </div>

      <canvas ref={flow.canvasRef} className="hidden" />

      {/* Filename Input Modal */}
      {showFilenameInput && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              <FilenameInput
                onSubmit={handleFilenameSubmit}
                onCancel={handleFilenameCancel}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};