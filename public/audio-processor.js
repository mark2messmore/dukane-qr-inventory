// AudioWorklet processor for real-time audio streaming
// Converts Float32 audio to Int16 PCM format for AssemblyAI

const MAX_16BIT_INT = 32767;

class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    try {
      const input = inputs[0];
      if (!input) return true;

      const channelData = input[0];
      if (!channelData) return true;

      // Convert Float32Array to Int16Array (PCM format)
      const float32Array = Float32Array.from(channelData);
      const int16Array = Int16Array.from(
        float32Array.map((n) => n * MAX_16BIT_INT)
      );

      // Send audio data to main thread
      this.port.postMessage({ audio_data: int16Array.buffer });

      return true;
    } catch (error) {
      console.error('AudioProcessor error:', error);
      return false;
    }
  }
}

registerProcessor('audio-processor', AudioProcessor);
