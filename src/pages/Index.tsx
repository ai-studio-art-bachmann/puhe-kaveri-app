
import React, { useState, useRef } from 'react';
import { VoiceButton } from '@/components/VoiceButton';
import { DynamicResponsePanel } from '@/components/DynamicResponsePanel';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useConversation } from '@/hooks/useConversation';
import { ConversationConfig } from '@/types/voice';
import { Button } from '@/components/ui/button';
import { getTranslations } from '@/translations';
import { FileUploader } from '@/components/FileUploader';
import { Camera } from '@/components/Camera';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [config, setConfig] = useState<ConversationConfig>({
    language: 'fi',
    webhookUrl: 'https://n8n.artbachmann.eu/webhook/voice-assistant'
  });
  const [activeTab, setActiveTab] = useState<string>("voice");

  const conversation = useConversation(config);
  const t = getTranslations(config.language);

  const handleLanguageChange = (language: ConversationConfig['language']) => {
    setConfig(prev => ({ ...prev, language }));
    conversation.reset();
  };

  const handleReset = () => {
    conversation.reset();
  };

  return (
    <div className="min-h-screen max-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col overflow-hidden">
      {/* Header - compact version */}
      <div className="max-w-sm mx-auto w-full px-2 flex-shrink-0">
        <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-orange-100 rounded-b-3xl">
          <div className="px-6 py-3">
            <h1 className="text-2xl font-bold text-center text-[#184560]">
              TyömaaPilotti
            </h1>
          </div>
        </header>
      </div>

      {/* Language Selector - compact */}
      <div className="max-w-sm mx-auto w-full px-2 flex-shrink-0">
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 mt-2 rounded-xl">
          <LanguageSelector
            currentLanguage={config.language}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      </div>

      {/* Main Content - flexible height */}
      <div className="flex-1 max-w-sm mx-auto w-full flex flex-col px-2 mt-2 min-h-0">
        {/* Chat Panel - flexible height */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 flex-1 overflow-hidden min-h-0">
          <DynamicResponsePanel 
            messages={conversation.messages} 
            language={config.language}
          />
        </div>

        {/* Interaction Controls - fixed height */}
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg mt-2 flex-shrink-0">
          <Tabs defaultValue="voice" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-2">
              <TabsTrigger value="voice">{t.voice || "Voice"}</TabsTrigger>
              <TabsTrigger value="files">{t.files || "Files"}</TabsTrigger>
              <TabsTrigger value="camera">{t.camera || "Camera"}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="voice" className="p-4">
              <div className="flex flex-col items-center space-y-3">
                <VoiceButton
                  voiceState={conversation.voiceState}
                  onPress={conversation.handleVoiceInteraction}
                  disabled={conversation.isDisabled}
                  isWaitingForClick={conversation.isWaitingForClick}
                  language={config.language}
                />
                
                {conversation.messages.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleReset}
                    className="text-xs px-4 py-2 rounded-full border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    {t.resetConversation}
                  </Button>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="files" className="p-4">
              <FileUploader webhookUrl={config.webhookUrl} language={config.language} />
            </TabsContent>
            
            <TabsContent value="camera" className="p-4">
              <Camera webhookUrl={config.webhookUrl} language={config.language} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer - fixed height */}
      <div className="max-w-sm mx-auto w-full px-2 flex-shrink-0">
        <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 py-2 rounded-t-xl">
          <p className="text-xs text-gray-500 text-center font-medium">
            {t.footerText}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
