
import React from 'react';
import { CameraVoiceFlow } from './CameraVoiceFlow';
import { useConversation } from '@/hooks/useConversation';
import { ConversationConfig } from '@/types/voice';
import { Card, CardContent } from '@/components/ui/card';

interface CameraContainerProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

export const CameraContainer: React.FC<CameraContainerProps> = ({ webhookUrl, language }) => {
  const config: ConversationConfig = {
    language,
    webhookUrl
  };
  
  const conversation = useConversation(config);

  return (
    <div className="w-full max-w-md mx-auto">
      <CameraVoiceFlow 
        webhookUrl={webhookUrl} 
        conversation={conversation}
      />
    </div>
  );
};
