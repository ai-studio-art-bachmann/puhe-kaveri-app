
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
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      iconColor: 'text-orange-600',
      pulse: true
    };
  }

  switch (status) {
    case 'idle':
      return {
        text: t.startConversation,
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        iconColor: 'text-gray-600',
        pulse: false
      };
    case 'greeting':
      return {
        text: t.greetingInProgress,
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        iconColor: 'text-blue-600',
        pulse: true
      };
    case 'recording':
      return {
        text: t.listening,
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        iconColor: 'text-red-600',
        pulse: true
      };
    case 'sending':
      return {
        text: t.sending,
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        iconColor: 'text-yellow-600',
        pulse: false
      };
    case 'waiting':
      return {
        text: t.waitingResponse,
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        iconColor: 'text-blue-600',
        pulse: true
      };
    case 'playing':
      return {
        text: t.playingResponse,
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        iconColor: 'text-green-600',
        pulse: false
      };
    default:
      return {
        text: t.startConversation,
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        iconColor: 'text-gray-600',
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
          'rounded-full bg-primary hover:bg-primary/90 shadow-lg',
          buttonState.bgColor,
          buttonState.borderColor,
          'hover:scale-105',
          buttonState.pulse && 'animate-pulse',
          isDisabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        style={{ width: '6.5rem', height: '6.5rem' }}
      >
        <div className="flex flex-col items-center space-y-2">
          <Mic className={cn('w-12 h-12', buttonState.iconColor)} />
          <span className="text-sm font-medium">Ääni</span>
        </div>
      </Button>
      
      <p className="text-base font-medium text-gray-700 text-center max-w-xs">
        {buttonState.text}
      </p>
      
      {voiceState.error && (
        <p className="text-sm text-red-600 text-center max-w-xs px-3 py-2 bg-red-50 rounded border border-red-200">
          {voiceState.error}
        </p>
      )}
    </div>
  );
};
