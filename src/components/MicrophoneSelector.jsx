import { useState, useEffect } from 'react';

export default function MicrophoneSelector({ onDeviceChange, isRecording }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Get all audio input devices
    async function loadDevices() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);

        // Set default device
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to load devices:', error);
      }
    }

    loadDevices();
  }, []);

  const handleDeviceChange = (deviceId) => {
    setSelectedDevice(deviceId);
    if (onDeviceChange) {
      onDeviceChange(deviceId);
    }
  };

  // Test audio level from selected device
  const testAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedDevice ? { exact: selectedDevice } : undefined }
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const checkLevel = () => {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);

        if (stream.active) {
          requestAnimationFrame(checkLevel);
        }
      };

      checkLevel();

      // Stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        setAudioLevel(0);
      }, 3000);

    } catch (error) {
      console.error('Failed to test audio:', error);
    }
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      marginBottom: '20px',
      border: '2px solid #dee2e6'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#495057'
        }}>
          🎤 Select Microphone:
        </label>
        <select
          value={selectedDevice}
          onChange={(e) => handleDeviceChange(e.target.value)}
          disabled={isRecording}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            borderRadius: '6px',
            border: '2px solid #ced4da',
            backgroundColor: isRecording ? '#e9ecef' : 'white',
            cursor: isRecording ? 'not-allowed' : 'pointer'
          }}
        >
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={testAudio}
        disabled={isRecording || !selectedDevice}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          backgroundColor: isRecording ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isRecording || !selectedDevice ? 'not-allowed' : 'pointer',
          opacity: isRecording || !selectedDevice ? 0.5 : 1,
          marginBottom: '10px'
        }}
      >
        🔊 Test Microphone (3 seconds)
      </button>

      {/* Audio Level Indicator */}
      {audioLevel > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '5px',
            color: '#495057'
          }}>
            Audio Level: {Math.round(audioLevel)}
          </div>
          <div style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#e9ecef',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, audioLevel)}%`,
              height: '100%',
              backgroundColor: audioLevel > 50 ? '#28a745' : audioLevel > 20 ? '#ffc107' : '#dc3545',
              transition: 'width 0.1s ease'
            }} />
          </div>
        </div>
      )}

      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        💡 Tip: Speak normally and watch the audio level bar when testing
      </div>
    </div>
  );
}
