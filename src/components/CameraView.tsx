
import React from 'react';
import { Translations } from '@/translations/types';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraOn: boolean;
  photoTaken: string | null;
  currentOrientation?: number;
  t: Translations;
}

export const CameraView: React.FC<CameraViewProps> = ({ 
  videoRef, 
  isCameraOn, 
  photoTaken, 
  currentOrientation = 0,
  t 
}) => {
  // Determine if we should apply any CSS transforms based on orientation
  const getVideoTransform = () => {
    // Most modern mobile browsers handle video orientation automatically
    // But we can add specific handling if needed
    return '';
  };

  if (photoTaken) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black">
        <div className="relative aspect-video w-full">
          <img 
            src={photoTaken} 
            alt={t.capturedPhotoAlt}
            className="w-full h-full object-contain bg-black" 
            style={{
              transform: getVideoTransform()
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`}
        style={{
          transform: getVideoTransform()
        }}
      />
      {!isCameraOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <p className="text-white">{t.cameraOff || "Camera is off"}</p>
        </div>
      )}
      
      {/* Orientation indicator for debugging (can be removed in production) */}
      {isCameraOn && currentOrientation !== 0 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          {currentOrientation}°
        </div>
      )}
    </div>
  );
};
