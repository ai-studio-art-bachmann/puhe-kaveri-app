
import { useState, useCallback } from 'react';
import { useCamera } from './useCamera';
import { useOfflineStorage } from './useOfflineStorage';
import { toast } from '@/hooks/use-toast';

interface CameraVoiceFlowState {
  step: 'idle' | 'camera' | 'captured' | 'processing' | 'playing';
  photoBlob: Blob | null;
  fileName: string;
  isOnline: boolean;
}

export const useCameraVoiceFlow = (webhookUrl: string, conversation: any) => {
  const camera = useCamera();
  const offlineStorage = useOfflineStorage();
  
  const [state, setState] = useState<CameraVoiceFlowState>({
    step: 'idle',
    photoBlob: null,
    fileName: '',
    isOnline: navigator.onLine
  });

  const addMessage = useCallback((message: any) => {
    // Safely add message if conversation is available
    if (conversation?.messages && typeof conversation.messages.push === 'function') {
      conversation.messages.push(message);
    }
  }, [conversation]);

  const startFlow = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, step: 'camera' }));
      await camera.open();
      
      // Add system message to chat safely
      addMessage({
        id: `msg-${Date.now()}`,
        type: 'system',
        content: "Kamera käivitatud - ota kuva",
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast({
        title: "Kamera ei käynnisty",
        description: "Tarkista kameran käyttöoikeudet",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, step: 'idle' }));
    }
  }, [camera, addMessage]);

  const capturePhoto = useCallback(async () => {
    try {
      const blob = await camera.capture();
      
      setState(prev => ({ ...prev, step: 'captured', photoBlob: blob }));
      camera.close();
      
      // Add user message with image to chat safely
      const imageUrl = URL.createObjectURL(blob);
      addMessage({
        id: `msg-${Date.now()}`,
        type: 'user',
        content: "Kuva võetud",
        fileUrl: imageUrl,
        fileType: "image/jpeg",
        timestamp: new Date()
      });
      
      return blob;
    } catch (error) {
      console.error('Photo capture failed:', error);
      toast({
        title: "Kuvan otto epäonnistui",
        description: "Yritä uudelleen",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, step: 'camera' }));
      throw error;
    }
  }, [camera, addMessage]);

  const processPhotoWithFilename = useCallback(async (blob: Blob, fileName: string) => {
    setState(prev => ({ ...prev, step: 'processing', fileName }));
    
    // Add system message to chat safely
    addMessage({
      id: `msg-${Date.now()}`,
      type: 'system',
      content: `Analüüsin pilti: ${fileName}.jpg...`,
      timestamp: new Date()
    });
    
    try {
      if (!navigator.onLine) {
        // Offline mode - save for later sync
        await offlineStorage.saveOffline(blob, fileName, false);
        
        addMessage({
          id: `msg-${Date.now()}`,
          type: 'system',
          content: "Kuva tallennettu offline-tilassa. Lähetetään kun verkko palaa.",
          timestamp: new Date()
        });
        
        toast({
          title: "Tallennettu offline-tilassa",
          description: "Kuva lähetetään kun verkko palaa"
        });
        resetFlow();
        return;
      }

      // Online mode - upload immediately
      const formData = new FormData();
      formData.append('file', blob, `${fileName}.jpg`);
      formData.append('filename', `${fileName}.jpg`);

      console.log('Uploading photo to n8n webhook:', webhookUrl);
      console.log('Photo details:', {
        fileName: `${fileName}.jpg`,
        fileSize: blob.size
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('N8N webhook response status:', response.status);

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
      }

      // Handle response
      let data = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const responseText = await response.text();
        console.log('N8N webhook response text:', responseText);
        
        if (responseText.trim()) {
          try {
            data = JSON.parse(responseText);
            console.log('N8N webhook parsed response:', data);
          } catch (parseError) {
            console.warn('Failed to parse JSON response:', parseError);
            data = { textResponse: responseText };
          }
        } else {
          console.log('Empty response from n8n webhook');
          data = { success: true };
        }
      } else {
        console.log('Non-JSON response from n8n webhook');
        data = { success: true };
      }
      
      // Handle the analysis response - fix the field mapping
      if (data && data.textResponse) {
        const analysisText = data.textResponse;
        
        console.log('Adding analysis to chat:', analysisText);
        
        // Add the analysis to the chat safely
        const analysisMessage = {
          id: `msg-${Date.now()}`,
          type: 'assistant' as const,
          content: analysisText,
          timestamp: new Date()
        };

        // Add audio URL if provided
        if (data.audioResponse) {
          analysisMessage.audioUrl = `data:audio/mpeg;base64,${data.audioResponse}`;
        }

        addMessage(analysisMessage);
        
        // Handle audio response if provided - with better error handling
        if (data.audioResponse) {
          setState(prev => ({ ...prev, step: 'playing' }));
          try {
            await playAudioResponse(data.audioResponse);
          } catch (audioError) {
            console.warn('Audio playback failed:', audioError);
            // Continue without audio
          }
        }
        
        addMessage({
          id: `msg-${Date.now()}`,
          type: 'system',
          content: "Analüüs valmis",
          timestamp: new Date()
        });
      } else {
        // Fallback if no textResponse field
        addMessage({
          id: `msg-${Date.now()}`,
          type: 'system',
          content: "Kuva lähetetty onnistuneesti",
          timestamp: new Date()
        });
      }

      toast({
        title: "Kuva lähetetty",
        description: `${fileName}.jpg lähetetty n8n webhookiin`
      });
      
      resetFlow();
    } catch (error) {
      console.error('Photo processing failed:', error);
      
      addMessage({
        id: `msg-${Date.now()}`,
        type: 'system',
        content: `Viga: Kuva analüüs epäonnistus - ${error instanceof Error ? error.message : "Tuntematon virhe"}`,
        timestamp: new Date()
      });
      
      toast({
        title: "Lähetys epäonnistui",
        description: error instanceof Error ? error.message : "Tuntematon virhe",
        variant: "destructive"
      });
      resetFlow();
    }
  }, [webhookUrl, offlineStorage, addMessage]);

  const playAudioResponse = useCallback(async (audioData: string) => {
    try {
      // Handle different audio data formats with better error handling
      let audioUrl = audioData;
      
      if (audioData.startsWith('data:audio/')) {
        audioUrl = audioData;
      } else if (audioData.startsWith('blob:')) {
        audioUrl = audioData;
      } else {
        // Convert base64 to blob for better compatibility
        try {
          const binaryString = atob(audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
          audioUrl = URL.createObjectURL(audioBlob);
        } catch (decodeError) {
          console.error('Failed to decode base64 audio:', decodeError);
          throw new Error('Audio format not supported');
        }
      }
      
      const audio = new Audio(audioUrl);
      
      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          if (audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
          }
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          if (audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
          }
          reject(new Error('Audio playback failed'));
        };
        
        audio.oncanplaythrough = () => {
          audio.play().catch((playError) => {
            console.error('Audio play failed:', playError);
            if (audioUrl.startsWith('blob:')) {
              URL.revokeObjectURL(audioUrl);
            }
            reject(new Error('Audio play failed'));
          });
        };
        
        audio.load();
      });
    } catch (error) {
      console.error('Audio response failed:', error);
      throw error;
    }
  }, []);

  const resetFlow = useCallback(() => {
    setState({
      step: 'idle',
      photoBlob: null,
      fileName: '',
      isOnline: navigator.onLine
    });
    camera.close();
  }, [camera]);

  return {
    ...state,
    videoRef: camera.videoRef,
    canvasRef: camera.canvasRef,
    startFlow,
    capturePhoto,
    processPhotoWithFilename,
    resetFlow
  };
};
