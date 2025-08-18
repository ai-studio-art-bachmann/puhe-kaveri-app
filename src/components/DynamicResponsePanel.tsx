import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/voice';
import { ChatBubble } from './ChatBubble';
import { getTranslations, Language } from '@/translations';

interface DynamicResponsePanelProps {
  messages: ChatMessage[];
  language: Language; // Use imported Language type
}

export const DynamicResponsePanel: React.FC<DynamicResponsePanelProps> = ({ 
  messages,
  language
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const t = getTranslations(language);

  // Auto-scroll to bottom when new messages arrive (without blocking manual scroll)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div 
      className="flex-1 w-full overflow-y-auto overflow-x-hidden px-4 py-6 bg-muted/30 min-w-0"
      style={{ maxHeight: 'calc(100vh - 300px)', scrollbarGutter: 'stable' }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <p className="text-muted-foreground text-center">
            {t.pressToStart}
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-4 w-full max-w-full break-words whitespace-pre-wrap min-w-0">
          {messages.map((message) => (
            <div key={message.id} className="w-full max-w-full min-w-0">
              <ChatBubble message={message} />
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};
