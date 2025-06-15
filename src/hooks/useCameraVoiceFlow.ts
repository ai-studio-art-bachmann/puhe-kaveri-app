
import { useState, useCallback } from 'react';
import { useCamera } from './useCamera';
import { useSpeech } from './useSpeech';
import { useOfflineStorage } from './useOfflineStorage';
import { toast } from '@/hooks/use-toast';

interface CameraVoiceFlowState {
  step: 'idle' | 'camera' | 'captured' | 'asking-name' | 'listening' | 'asking-choice' | 'processing' | 'playing';
  photoBlob: Blob | null;
  fileName: string;
  isOnline: boolean;
}

export const useCameraVoiceFlow = (webhookUrl: string) => {
  const camera = useCamera();
  const speech = useSpeech();
  const offlineStorage = useOfflineStorage();
  
  const [state, setState] = useState<CameraVoiceFlowState>({
    step: 'idle',
    photoBlob: null,
    fileName: '',
    isOnline: navigator.onLine
  });

  const startFlow = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, step: 'camera' }));
      await camera.open();
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast({
        title: "Kamera ei käynnisty",
        description: "Tarkista kameran käyttöoikeudet",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, step: 'idle' }));
    }
  }, [camera]);

  const capturePhoto = useCallback(async () => {
    try {
      const blob = await camera.capture();
      
      setState(prev => ({ ...prev, step: 'captured', photoBlob: blob }));
      camera.close();
      
      // Start the voice interaction after a short delay
      setTimeout(async () => {
        try {
          setState(prev => ({ ...prev, step: 'asking-name' }));
          const fileName = await speech.ask("Anna tiedostolle nimi");
          
          setState(prev => ({ ...prev, fileName, step: 'asking-choice' }));
          
          // Ask if user wants to hear analysis now
          const choice = await speech.ask("Haluatko kuulla analyysin nyt? Sano kyllä tai ei");
          const wantAudio = choice.toLowerCase().includes('kyllä') || choice.toLowerCase().includes('joo') || choice.toLowerCase().includes('yes');
          
          await processPhoto(blob, fileName, wantAudio);
        } catch (error) {
          console.error('Voice interaction failed:', error);
          await speech.speak("Äänitunnistus epäonnistui. Jatketaan ilman nimeä.");
          await processPhoto(blob, `kuva_${Date.now()}`, false);
        }
      }, 500);
    } catch (error) {
      console.error('Photo capture failed:', error);
      toast({
        title: "Kuvan otto epäonnistui",
        description: "Yritä uudelleen",
        variant: "destructive"
      });
      setState(prev => ({ ...prev, step: 'camera' }));
    }
  }, [camera, speech]);

  const processPhoto = useCallback(async (blob: Blob, fileName: string, wantAudio: boolean) => {
    setState(prev => ({ ...prev, step: 'processing' }));
    
    try {
      if (!navigator.onLine) {
        // Offline mode - save for later sync
        await offlineStorage.saveOffline(blob, fileName, wantAudio);
        await speech.speak("Kuva tallennettu offline-tilassa. Lähetetään kun verkko palaa.");
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
      formData.append('wantAudio', wantAudio.toString());

      console.log('Uploading photo to n8n webhook:', webhookUrl);
      console.log('Photo details:', {
        fileName: `${fileName}.jpg`,
        fileSize: blob.size,
        wantAudio: wantAudio
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('N8N webhook response status:', response.status);
      console.log('N8N webhook response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
      }

      // Handle response - n8n webhook might return empty response
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
            console.warn('Failed to parse JSON response, treating as text:', parseError);
            data = { message: responseText };
          }
        } else {
          console.log('Empty response from n8n webhook - this is normal');
          data = { success: true };
        }
      } else {
        console.log('Non-JSON response from n8n webhook');
        data = { success: true };
      }
      
      // Handle audio response if provided
      if (wantAudio && data && data.audioResponse) {
        setState(prev => ({ ...prev, step: 'playing' }));
        await playAudioResponse(data.audioResponse);
      }

      await speech.speak("Kuva lähetetty onnistuneesti");
      toast({
        title: "Kuva lähetetty",
        description: `${fileName}.jpg lähetetty n8n webhookiin`
      });
      
      resetFlow();
    } catch (error) {
      console.error('Photo processing failed:', error);
      await speech.speak("Tallennus epäonnistui. Yritä uudelleen.");
      toast({
        title: "Lähetys epäonnistui",
        description: error instanceof Error ? error.message : "Tuntematon virhe",
        variant: "destructive"
      });
      resetFlow();
    }
  }, [webhookUrl, offlineStorage, speech]);

  const playAudioResponse = useCallback(async (audioData: string) => {
    try {
      // Handle different audio data formats
      let audioUrl = audioData;
      
      if (audioData.startsWith('data:audio/')) {
        // Base64 data URI - use directly
        audioUrl = audioData;
      } else if (audioData.startsWith('blob:')) {
        // Blob URL - use directly
        audioUrl = audioData;
      } else {
        // Assume base64 string, convert to data URI
        audioUrl = `data:audio/mpeg;base64,${audioData}`;
      }
      
      const audio = new Audio(audioUrl);
      
      try {
        await audio.play();
        
        return new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve(); // Continue even if audio fails
        });
      } catch (autoplayError) {
        console.warn('Autoplay blocked:', autoplayError);
        toast({
          title: "Paina kuunnellaksesi",
          description: "Analyysi on valmis toistettavaksi"
        });
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
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
    resetFlow
  };
};
