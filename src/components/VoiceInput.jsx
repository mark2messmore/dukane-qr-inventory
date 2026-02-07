import { useState, useRef } from 'react';

export default function VoiceInput({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      onTranscript(transcript);
      setTranscript('');
    }
    setIsRecording(false);
  };

  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          padding: '20px 40px',
          fontSize: '18px',
          backgroundColor: isRecording ? '#dc3545' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          minWidth: '200px',
          fontWeight: 'bold'
        }}
      >
        {isRecording ? '⏸️ Stop Recording' : '🎤 Hold to Talk'}
      </button>

      {isRecording && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          minHeight: '60px'
        }}>
          <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>
            Listening...
          </div>
          <div style={{ fontSize: '16px', color: '#212529' }}>
            {transcript || '(speak now)'}
          </div>
        </div>
      )}
    </div>
  );
}
