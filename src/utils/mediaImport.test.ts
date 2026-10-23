import { describe, expect, it } from 'vitest';
import { fileIdentity, isMediaFile } from './mediaImport';

describe('media import validation', () => {
  it('recognizes supported extensions without relying on MIME type', () => {
    expect(isMediaFile(new File(['data'], 'track.FLAC'))).toBe(true);
    expect(isMediaFile(new File(['data'], 'notes.txt', { type: 'audio/mp3' }))).toBe(false);
  });
  it('identifies duplicates by normalized name and exact size', () => {
    expect(fileIdentity(new File(['same'], 'Song.wav'))).toBe(fileIdentity(new File(['same'], 'song.wav')));
    expect(fileIdentity(new File(['longer'], 'song.wav'))).not.toBe(fileIdentity(new File(['same'], 'song.wav')));
  });
});
