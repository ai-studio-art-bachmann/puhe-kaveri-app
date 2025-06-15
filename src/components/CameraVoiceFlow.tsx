
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
        return 'Vajuta nuppu kaamera käivitamiseks';
      case 'camera':
        return 'Kaamera on valmis - vajuta suurt nuppu foto tegemiseks';
      case 'captured':
        return 'Foto tehtud - sisesta failinimi';
      case 'processing':
        return 'Töötlen pilti...';
      case 'playing':
        return 'Mängin vastust...';
      default:
        return 'Vajuta nuppu alustamiseks';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Camera View Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-slate-900 overflow-hidden">
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
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="text-center text-slate-300">
                  <Camera size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Kaamera pole aktiivsed</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <canvas ref={flow.canvasRef} className="hidden" />

      {/* Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <p className="font-medium text-slate-700">{getStepDescription()}</p>
            {flow.fileName && (
              <p className="text-sm text-slate-500">Fail: {flow.fileName}.jpg</p>
            )}
            {!flow.isOnline && (
              <div className="flex items-center justify-center space-x-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Offline režiim</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filename Input */}
      {showFilenameInput && (
        <Card>
          <CardContent className="p-4">
            <FilenameInput
              onSubmit={handleFilenameSubmit}
              onCancel={handleFilenameCancel}
            />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!showFilenameInput && (
        <div className="flex flex-col items-center space-y-4">
          {flow.step === 'idle' && (
            <Button
              onClick={flow.startFlow}
              size="lg"
              className="w-32 h-32 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <Camera size={40} />
                <span className="text-sm font-medium">Käivita</span>
              </div>
            </Button>
          )}
          
          {flow.step === 'camera' && (
            <Button
              onClick={handlePhotoCapture}
              size="lg"
              className="w-32 h-32 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              <div className="flex flex-col items-center space-y-2">
                <Camera size={40} />
                <span className="text-sm font-medium">Tee foto</span>
              </div>
            </Button>
          )}
          
          {flow.step === 'processing' && (
            <div className="w-32 h-32 rounded-full bg-slate-100 border flex items-center justify-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-400 border-t-transparent"></div>
                <span className="text-sm text-slate-600 font-medium">Töötlen</span>
              </div>
            </div>
          )}
          
          {flow.step === 'playing' && (
            <div className="w-32 h-32 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                  <Volume2 size={28} className="text-green-600" />
                </div>
                <span className="text-sm text-green-700 font-medium">Mängin</span>
              </div>
            </div>
          )}
          
          {/* Reset Button */}
          {flow.step !== 'idle' && (
            <Button
              onClick={flow.resetFlow}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <RotateCcw size={16} className="mr-2" />
              Lähtesta
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
