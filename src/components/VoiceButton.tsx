
import React from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceState } from '@/types/voice';
import { cn } from '@/lib/utils';
import { getTranslations } from '@/translations';

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
      pulse: true
    };
  }

  switch (status) {
    case 'idle':
      return {
        text: t.startConversation,
        bgColor: 'bg-primary',
        hoverColor: 'hover:bg-primary/90',
        iconColor: 'text-primary-foreground',
        pulse: false
      };
    case 'greeting':
      return {
        text: t.greetingInProgress,
        bgColor: 'bg-blue-500',
        hoverColor: 'hover:bg-blue-600',
        iconColor: 'text-white',
        pulse: true
      };
    case 'recording':
      return {
        text: t.listening,
        bgColor: 'bg-red-500',
        hoverColor: 'hover:bg-red-600',
        iconColor: 'text-white',
        pulse: true
      };
    case 'sending':
      return {
        text: t.sending,
        bgColor: 'bg-yellow-500',
        hoverColor: 'hover:bg-yellow-600',
        iconColor: 'text-white',
        pulse: false
      };
    case 'waiting':
      return {
        text: t.waitingResponse,
        bgColor: 'bg-blue-500',
        hoverColor: 'hover:bg-blue-600',
        iconColor: 'text-white',
        pulse: true
      };
    case 'playing':
      return {
        text: t.playingResponse,
        bgColor: 'bg-green-500',
        hoverColor: 'hover:bg-green-600',
        iconColor: 'text-white',
        pulse: false
      };
    default:
      return {
        text: t.startConversation,
        bgColor: 'bg-primary',
        hoverColor: 'hover:bg-primary/90',
        iconColor: 'text-primary-foreground',
        pulse: false
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
        style={{ width: '8rem', height: '8rem' }}
      >
        <div className="flex flex-col items-center justify-center space-y-1">
          <Mic className={cn('w-8 h-8', buttonState.iconColor)} />
          <span className="text-xs font-medium">Ääni</span>
        </div>
      </Button>
      
      <p className="text-sm font-medium text-muted-foreground text-center max-w-xs">
        {buttonState.text}
      </p>
      
      {voiceState.error && (
        <div className="text-sm text-destructive text-center max-w-xs px-3 py-2 bg-destructive/10 rounded border border-destructive/20">
          {voiceState.error}
        </div>
      )}
    </div>
  );
};
