import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, SwitchCamera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernCameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  error: string | null;
  capturedImage: string | null;
  onCapture: () => void;
  onRetake: () => void;
  onClose: () => void;
  onSwitchCamera: () => void;
  isProcessing: boolean;
}

export const ModernCameraView: React.FC<ModernCameraViewProps> = ({
  videoRef,
  isActive,
  error,
  capturedImage,
  onCapture,
  onRetake,
  onClose,
  onSwitchCamera,
  isProcessing
}) => {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header Controls */}
      <div className="flex justify-between items-center p-4 bg-black/50 text-white z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X size={24} />
        </Button>
        
        {isActive && !capturedImage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSwitchCamera}
            className="text-white hover:bg-white/20"
          >
            <SwitchCamera size={24} />
          </Button>
        )}
      </div>

      {/* Camera/Image View */}
      <div className="flex-1 relative overflow-hidden">
        {/* Live Camera Feed */}
        {isActive && !capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: 'none' // Let the browser handle orientation naturally
            }}
          />
        )}

        {/* Captured Image */}
        {capturedImage && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedImage}
              alt="Captured"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white p-6">
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Kameravirhe</h3>
              <p className="text-sm opacity-75">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!isActive && !error && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm">Käynnistetään kamera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-center items-center p-6 bg-black/50">
        {isActive && !capturedImage && (
          <Button
            onClick={onCapture}
            disabled={isProcessing}
            className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 shadow-lg"
          >
            <Camera size={32} className="text-black" />
          </Button>
        )}

        {capturedImage && (
          <div className="flex space-x-4">
            <Button
              onClick={onRetake}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RotateCcw size={20} className="mr-2" />
              Ota uusi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};