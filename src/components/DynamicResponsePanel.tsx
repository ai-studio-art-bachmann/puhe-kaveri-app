import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/voice';
import { ChatBubble } from './ChatBubble';
import { getTranslations, Language } from '@/translations';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DynamicResponsePanelProps {
  messages: ChatMessage[];
  language: Language; // Use imported Language type
}

export const DynamicResponsePanel: React.FC<DynamicResponsePanelProps> = ({ 
  messages,
  language
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = getTranslations(language);

  // Auto-scroll to bottom when new messages arrive with smooth behavior
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      setTimeout(() => {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col bg-muted/30">
      <ScrollArea 
        ref={scrollRef}
        className="flex-1 px-4 py-6"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <p className="text-muted-foreground text-center">
              {t.pressToStart}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
