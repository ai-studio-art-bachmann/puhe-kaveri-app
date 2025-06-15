
import React from 'react';
import { CameraVoiceFlow } from './CameraVoiceFlow';
import { useConversation } from '@/hooks/useConversation';
import { ConversationConfig } from '@/types/voice';

interface CameraContainerProps {
  webhookUrl: string;
  language: 'fi' | 'et' | 'en';
}

export const CameraContainer: React.FC<CameraContainerProps> = ({ webhookUrl, language }) => {
  // Create a minimal config for conversation integration
  const config: ConversationConfig = {
    language,
    webhookUrl
  };
  
  const conversation = useConversation(config);

  return (
    <div className="flex flex-col items-center space-y-4">
      <CameraVoiceFlow 
        webhookUrl={webhookUrl} 
        conversation={conversation}
        conversationState={conversation}
      />
    </div>
  );
};
