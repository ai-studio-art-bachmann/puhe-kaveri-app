
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

  // Create message handlers
  const messageHandlers = {
    addUserMessage: (content: string) => {
      // Create a user message (this will be for the photo upload)
      const userMessage = conversation.messageManager?.addMessage({
        type: 'user' as const,
        content
      });
      if (userMessage) {
        conversation.addMessage(userMessage);
      }
      return userMessage;
    },
    addAssistantMessage: (content: string, audioUrl?: string, fileUrl?: string, fileType?: string) => {
      const assistantMessage = conversation.messageManager?.addMessage({
        type: 'assistant' as const,
        content,
        audioUrl,
        fileUrl,
        fileType
      });
      if (assistantMessage) {
        conversation.addMessage(assistantMessage);
      }
      return assistantMessage;
    },
    addSystemMessage: (content: string) => {
      const systemMessage = conversation.messageManager?.addMessage({
        type: 'system' as const,
        content
      });
      if (systemMessage) {
        conversation.addMessage(systemMessage);
      }
      return systemMessage;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <CameraVoiceFlow 
        webhookUrl={webhookUrl} 
        messageHandlers={messageHandlers}
      />
    </div>
  );
};
