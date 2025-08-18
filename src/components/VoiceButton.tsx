import React from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceState } from '@/types/voice';
import { cn } from '@/lib/utils';
import { getTranslations } from '@/translations';
import { Card, CardContent } from '@/components/ui/card';

interface VoiceButtonProps {
  voiceState: VoiceState;
  onPress: () => void;
  disabled?: boolean;
  isWaitingForClick?: boolean;
  language: 'fi' | 'et' | 'en';
}

const getButtonState = (status: VoiceState['status'], isWaitingForClick: boolean = false, t: any) => {
  if (isWaitingForClick) {
    return {
      text: t.readyForClick,
      bgColor: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      iconColor: 'text-white',
      pulse: true,
      animation: 'animate-[pulse_3s_ease-in-out_infinite]' // Ultra slow pulse
    };
  }

  switch (status) {
    case 'idle':
      return {
        text: t.startConversation,
        bgColor: 'bg-slate-800',
        hoverColor: 'hover:bg-slate-700',
        iconColor: 'text-white',
        pulse: false,
        animation: ''
      };
    case 'greeting':
      return {
        text: t.greetingInProgress,
        bgColor: 'bg-blue-600',
        hoverColor: 'hover:bg-blue-700',
        iconColor: 'text-white',
        pulse: true,
        animation: 'animate-[pulse_3s_ease-in-out_infinite]'
      };
    case 'recording':
      return {
        text: t.listening,
        bgColor: 'bg-red-600',
        hoverColor: 'hover:bg-red-700',
        iconColor: 'text-white',
        pulse: true,
        animation: 'animate-[pulse_3s_ease-in-out_infinite]'
      };
    case 'sending':
      return {
        text: t.sending,
        bgColor: 'bg-yellow-600',
        hoverColor: 'hover:bg-yellow-700',
        iconColor: 'text-white',
        pulse: false,
        animation: ''
      };
    case 'waiting':
      return {
        text: t.waitingResponse,
        bgColor: 'bg-blue-600',
        hoverColor: 'hover:bg-blue-700',
        iconColor: 'text-white',
        pulse: true,
        animation: 'animate-[pulse_3s_ease-in-out_infinite]'
      };
    case 'playing':
      return {
        text: t.playingResponse,
        bgColor: 'bg-green-600',
        hoverColor: 'hover:bg-green-700',
        iconColor: 'text-white',
        pulse: false,
        animation: ''
      };
    default:
      return {
        text: t.startConversation,
        bgColor: 'bg-slate-800',
        hoverColor: 'hover:bg-slate-700',
        iconColor: 'text-white',
        pulse: false,
        animation: ''
      };
  }
};

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  voiceState,
  onPress,
  disabled = false,
  isWaitingForClick = false,
  language
}) => {
  const t = getTranslations(language);
  const buttonState = getButtonState(voiceState.status, isWaitingForClick, t);
  const isDisabled = disabled || (voiceState.status !== 'idle' && !isWaitingForClick);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <p className="font-medium text-slate-700">{buttonState.text}</p>
            {!navigator.onLine && (
              <div className="flex items-center justify-center space-x-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Offline-tila</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voice Button - matching camera button size and style */}
      <div className="flex flex-col items-center space-y-4">
        <Button
          onClick={onPress}
          disabled={isDisabled}
          size="lg"
          className={cn(
            'rounded-full shadow-lg transition-all duration-200 ease-in-out',
            buttonState.bgColor,
            buttonState.hoverColor,
            'hover:scale-105 active:scale-95',
            buttonState.pulse && 'animate-pulse',
            isDisabled && 'opacity-50 cursor-not-allowed hover:scale-100'
          )}
          style={{ width: '6.5rem', height: '6.5rem' }}
        >
          <div className="flex flex-col items-center space-y-2">
            <Mic size={144} className={buttonState.iconColor} />
            <span className="text-sm font-medium text-white">Ääni</span>
          </div>
        </Button>
      </div>
      
      {voiceState.error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-destructive text-center bg-destructive/10 rounded p-3 border border-destructive/20">
              {voiceState.error}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
