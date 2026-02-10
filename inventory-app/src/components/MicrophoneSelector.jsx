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
      padding: '0'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          fontSize: '15px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#e0e0e0'
        }}>
          Select Microphone
        </label>
        <select
          value={selectedDevice}
          onChange={(e) => handleDeviceChange(e.target.value)}
          disabled={isRecording}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '15px',
            borderRadius: '8px',
            border: '1px solid #404040',
            backgroundColor: isRecording ? '#3d3d3d' : '#1a1a1a',
            color: '#e0e0e0',
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
          padding: '12px 20px',
          fontSize: '15px',
          backgroundColor: isRecording || !selectedDevice ? '#3d3d3d' : '#2d2d2d',
          color: isRecording || !selectedDevice ? '#808080' : '#e0e0e0',
          border: '1px solid #404040',
          borderRadius: '8px',
          cursor: isRecording || !selectedDevice ? 'not-allowed' : 'pointer',
          opacity: isRecording || !selectedDevice ? 0.5 : 1,
          marginBottom: '15px'
        }}
      >
        Test Microphone (3 seconds)
      </button>

      {/* Audio Level Indicator */}
      {audioLevel > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '5px',
            color: '#e0e0e0'
          }}>
            Audio Level: {Math.round(audioLevel)}
          </div>
          <div style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#1a1a1a',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #404040'
          }}>
            <div style={{
              width: `${Math.min(100, audioLevel)}%`,
              height: '100%',
              backgroundColor: audioLevel > 50 ? '#4caf50' : audioLevel > 20 ? '#ffd700' : '#ff5252',
              transition: 'width 0.1s ease'
            }} />
          </div>
        </div>
      )}

      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#b0b0b0'
      }}>
        Tip: Speak normally and watch the audio level bar when testing
      </div>
    </div>
  );
}
