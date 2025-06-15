
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
        className={cn(
          'w-24 h-24 rounded-full border-2 transition-all duration-200 shadow-sm hover:shadow-md',
          buttonState.bgColor,
          buttonState.borderColor,
          'hover:scale-105',
          buttonState.pulse && 'animate-pulse',
          isDisabled && 'opacity-50 cursor-not-allowed hover:scale-100'
        )}
        size="lg"
      >
        <Mic className={cn('w-8 h-8', buttonState.iconColor)} />
      </Button>
      
      <p className="text-sm font-medium text-gray-700 text-center max-w-xs">
        {buttonState.text}
      </p>
      
      {voiceState.error && (
        <p className="text-xs text-red-600 text-center max-w-xs px-2 py-1 bg-red-50 rounded border border-red-200">
          {voiceState.error}
        </p>
      )}
    </div>
  );
};
