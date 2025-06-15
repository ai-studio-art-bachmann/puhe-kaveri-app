
import React from 'react';
import { CameraVoiceFlow } from './CameraVoiceFlow';
import { useConversation } from '@/hooks/useConversation';
import { ConversationConfig, ChatMessage } from '@/types/voice';

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

  // Create message handlers that work with the actual conversation API
  const messageHandlers = {
    addUserMessage: (content: string): ChatMessage => {
      // Since we don't have direct access to messageManager, we'll create a simple message structure
      // This is a temporary solution - the actual message will be handled by the voice flow
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'user' as const,
        content,
        timestamp: new Date()
      };
      return userMessage;
    },
    addAssistantMessage: (content: string, audioUrl?: string, fileUrl?: string, fileType?: string): ChatMessage => {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant' as const,
        content,
        audioUrl,
        fileUrl,
        fileType,
        timestamp: new Date()
      };
      return assistantMessage;
    },
    addSystemMessage: (content: string): ChatMessage => {
      const systemMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'system' as const,
        content,
        timestamp: new Date()
      };
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
