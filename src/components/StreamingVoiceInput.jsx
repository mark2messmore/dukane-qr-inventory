import { useState, useRef, useEffect } from 'react';

export default function StreamingVoiceInput({ onTranscriptComplete, scannedCode, deviceId }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [status, setStatus] = useState('Ready');

  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const audioBufferQueueRef = useRef(new Int16Array(0));

  const startRecording = async () => {
    try {
      console.log('🎬 Starting recording process...');
      setStatus('Getting token...');

      // STEP 1: Fetch temporary token from our backend
      console.log('📞 Fetching token from /api/token...');
      const tokenResponse = await fetch('/api/token');
      const { token } = await tokenResponse.json();
      console.log('✅ Token received');

      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      setStatus('Connecting...');
      console.log('🔌 Connecting to AssemblyAI WebSocket...');

      // STEP 2: Connect to AssemblyAI WebSocket with token
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&formatted_finals=true&token=${token}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      // STEP 3: Set up WebSocket event handlers
      socket.onopen = async () => {
        console.log('AssemblyAI WebSocket connected');
        setStatus('Listening...');
        setIsRecording(true);

        try {
          // Get microphone access
          const audioConstraints = {
            channelCount: 1,
            sampleRate: 16000
          };

          // Use specific device if provided
          if (deviceId) {
            audioConstraints.deviceId = { exact: deviceId };
            console.log('🎤 Using device:', deviceId);
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints
          });
          streamRef.current = stream;
          console.log('✅ Microphone stream acquired');

          // Create AudioContext with 16kHz sample rate
          const audioContext = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = audioContext;

          // Load AudioWorklet processor
          await audioContext.audioWorklet.addModule('/audio-processor.js');

          const source = audioContext.createMediaStreamSource(stream);
          const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
          workletNodeRef.current = workletNode;

          // Helper to merge audio buffers
          const mergeBuffers = (lhs, rhs) => {
            const merged = new Int16Array(lhs.length + rhs.length);
            merged.set(lhs, 0);
            merged.set(rhs, lhs.length);
            return merged;
          };

          // Handle processed audio from worklet
          workletNode.port.onmessage = (event) => {
            if (socket.readyState !== WebSocket.OPEN) return;

            const currentBuffer = new Int16Array(event.data.audio_data);
            audioBufferQueueRef.current = mergeBuffers(audioBufferQueueRef.current, currentBuffer);

            // Calculate buffer duration
            const bufferDuration = (audioBufferQueueRef.current.length / audioContext.sampleRate) * 1000;

            // Send 100ms chunks for optimal performance
            if (bufferDuration >= 100) {
              const totalSamples = Math.floor(audioContext.sampleRate * 0.1);
              const finalBuffer = new Uint8Array(
                audioBufferQueueRef.current.subarray(0, totalSamples).buffer
              );
              audioBufferQueueRef.current = audioBufferQueueRef.current.subarray(totalSamples);

              socket.send(finalBuffer);
            }
          };

          source.connect(workletNode);
          workletNode.connect(audioContext.destination);

        } catch (audioError) {
          console.error('Failed to get microphone access:', audioError);
          setStatus('Microphone access denied');
          socket.close();
        }
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('📩 Received message:', message);

        // AssemblyAI v3 uses "Turn" type messages
        if (message.type === 'Turn') {
          const text = message.transcript;

          if (message.turn_is_formatted && message.end_of_turn) {
            // Final formatted transcript - locked in!
            console.log('✅ Final formatted transcript:', text);
            finalTranscriptRef.current = finalTranscriptRef.current
              ? `${finalTranscriptRef.current} ${text}`
              : text;
            setTranscript(finalTranscriptRef.current);
            setPartialTranscript('');
            console.log('📝 Full transcript accumulated:', finalTranscriptRef.current);
          } else if (!message.turn_is_formatted && text) {
            // Partial transcript - still being transcribed
            console.log('⏳ Partial transcript:', text);
            setPartialTranscript(text);
          }
        } else if (message.type === 'SessionBegins') {
          console.log('🎙️ Session started:', message);
          setStatus('🎙️ Listening...');
        } else {
          console.log('ℹ️ Other message type:', message.type);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('Connection error');
        stopRecording();
      };

      socket.onclose = () => {
        console.log('WebSocket closed');
        setStatus('Ready');
      };

    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setStatus('Processing...');

    // Disconnect audio worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'Terminate' }));
      socketRef.current.close();
      socketRef.current = null;
    }

    // Send final transcript to parent for Claude processing
    const finalText = finalTranscriptRef.current.trim();
    if (finalText) {
      console.log('🚀 Sending to Claude:', finalText);
      onTranscriptComplete(finalText, scannedCode);
    } else {
      console.log('⚠️ No transcript to send');
    }

    // Clear transcript and reset
    setTranscript('');
    setPartialTranscript('');
    finalTranscriptRef.current = '';
    audioBufferQueueRef.current = new Int16Array(0);
    setStatus('Ready');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <div style={{ margin: '20px 0' }}>
      {/* MAIN BUTTON */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={status === 'Processing...'}
          style={{
            padding: '24px 48px',
            fontSize: '20px',
            backgroundColor: isRecording ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: status === 'Processing...' ? 'not-allowed' : 'pointer',
            minWidth: '250px',
            fontWeight: 'bold',
            opacity: status === 'Processing...' ? 0.6 : 1,
            boxShadow: isRecording ? '0 0 20px rgba(220, 53, 69, 0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease'
          }}
        >
          {isRecording ? '⏹️ DONE TALKING' : '🎤 START TALKING'}
        </button>

        {/* STATUS INDICATOR */}
        <div style={{
          marginTop: '15px',
          fontSize: '16px',
          fontWeight: '600',
          color: isRecording ? '#dc3545' : status === 'Processing...' ? '#ffc107' : '#6c757d'
        }}>
          {status}
        </div>
      </div>

      {/* LIVE TRANSCRIPT BOX - ALWAYS VISIBLE */}
      <div style={{
        padding: '24px',
        backgroundColor: isRecording ? '#fff3cd' : transcript ? '#d4edda' : '#f8f9fa',
        borderRadius: '16px',
        border: `3px solid ${isRecording ? '#ffc107' : transcript ? '#28a745' : '#dee2e6'}`,
        minHeight: '150px',
        textAlign: 'left',
        boxShadow: isRecording ? '0 0 20px rgba(255, 193, 7, 0.3)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '2px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: isRecording ? '#856404' : transcript ? '#155724' : '#6c757d'
          }}>
            {isRecording ? '🔴 LISTENING - SPEAK NOW' : transcript ? '✅ TRANSCRIPT CAPTURED' : '⏸️ READY TO RECORD'}
          </div>
          {isRecording && (
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#dc3545',
              animation: 'pulse 1.5s infinite'
            }} />
          )}
        </div>

        {/* TRANSCRIPT TEXT */}
        <div style={{
          fontSize: '18px',
          color: '#212529',
          lineHeight: '1.8',
          minHeight: '60px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {transcript && <span style={{ fontWeight: '600' }}>{transcript}</span>}
          {partialTranscript && (
            <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
              {transcript ? ' ' : ''}{partialTranscript}
            </span>
          )}
          {!transcript && !partialTranscript && (
            isRecording ? 'Listening... start speaking!' : 'Click "Start Talking" to begin recording your command'
          )}
        </div>

        {/* WORD COUNT */}
        {transcript && (
          <div style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#6c757d',
            textAlign: 'right'
          }}>
            {transcript.split(' ').length} words
          </div>
        )}
      </div>

      {/* CSS ANIMATION */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
