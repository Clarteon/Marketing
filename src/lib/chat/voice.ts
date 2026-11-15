export const VOICE_MAX_SECONDS = 20;
export const VOICE_SAMPLE_RATE = 16_000;
export const VOICE_WAV_HEADER_BYTES = 44;
export const VOICE_MAX_AUDIO_BYTES =
  VOICE_WAV_HEADER_BYTES + VOICE_MAX_SECONDS * VOICE_SAMPLE_RATE * 2;
export const DICTATION_LANGUAGES = ["en", "tl", "auto"] as const;

export function createVoiceWav(samples: number): DataView<ArrayBuffer> {
  const bytes = samples * 2;
  const header = new DataView(new ArrayBuffer(VOICE_WAV_HEADER_BYTES + bytes));
  header.setUint32(0, 0x52494646);
  header.setUint32(4, bytes + 36, true);
  header.setUint32(8, 0x57415645);
  header.setUint32(12, 0x666d7420);
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, VOICE_SAMPLE_RATE, true);
  header.setUint32(28, VOICE_SAMPLE_RATE * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  header.setUint32(36, 0x64617461);
  header.setUint32(40, bytes, true);
  return header;
}

export function isVoiceWav(bytes: Uint8Array): boolean {
  const dataLength = bytes.byteLength - VOICE_WAV_HEADER_BYTES;
  if (dataLength < VOICE_SAMPLE_RATE / 2 || dataLength % 2 !== 0) return false;
  if (bytes.byteLength > VOICE_MAX_AUDIO_BYTES) return false;

  const header = new DataView(bytes.buffer, bytes.byteOffset, VOICE_WAV_HEADER_BYTES);
  return (
    header.getUint32(0) === 0x52494646 &&
    header.getUint32(4, true) === dataLength + 36 &&
    header.getUint32(8) === 0x57415645 &&
    header.getUint32(12) === 0x666d7420 &&
    header.getUint32(16, true) === 16 &&
    header.getUint16(20, true) === 1 &&
    header.getUint16(22, true) === 1 &&
    header.getUint32(24, true) === VOICE_SAMPLE_RATE &&
    header.getUint32(28, true) === VOICE_SAMPLE_RATE * 2 &&
    header.getUint16(32, true) === 2 &&
    header.getUint16(34, true) === 16 &&
    header.getUint32(36) === 0x64617461 &&
    header.getUint32(40, true) === dataLength
  );
}
