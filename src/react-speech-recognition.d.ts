declare module 'react-speech-recognition' {
  const SpeechRecognition: any;
  export const useSpeechRecognition: (options?: any) => {
    transcript: string;
    listening: boolean;
    resetTranscript: () => void;
    browserSupportsSpeechRecognition: boolean;
    isMicrophoneAvailable: boolean;
  };
  export default SpeechRecognition;
}
