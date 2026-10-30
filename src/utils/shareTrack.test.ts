import { describe, expect, it, vi } from 'vitest';
import type { Track } from '../types';
import { getTrackShareText, shareTrack, type ShareEnvironment } from './shareTrack';

const track = (overrides: Partial<Track> = {}): Track => ({
  id: 'track-1',
  title: 'Sunrise',
  artist: 'Phoenix',
  album: 'Morning',
  duration: 180,
  genre: 'Electronic',
  year: 2026,
  format: 'MP3',
  bitrate: '320 kbps',
  sampleRate: '44.1 kHz',
  fileSize: '4 MB',
  path: '/music/sunrise.mp3',
  coverArt: '',
  accentColor: '#6366f1',
  glowRgba: 'rgba(99, 102, 241, 0.45)',
  isFavorite: false,
  mediaType: 'audio',
  ...overrides,
});

function environment(overrides: Partial<ShareEnvironment> = {}): ShareEnvironment {
  const link = {
    click: vi.fn(),
    remove: vi.fn(),
    hidden: false,
    href: '',
    download: '',
  } as unknown as HTMLAnchorElement;

  return {
    navigator: {
      canShare: vi.fn(() => false),
      share: vi.fn(),
      clipboard: { writeText: vi.fn() } as unknown as Clipboard,
    },
    document: {
      body: { appendChild: vi.fn() } as unknown as HTMLElement,
      createElement: vi.fn(() => link) as unknown as Document['createElement'],
    },
    createObjectURL: vi.fn(() => 'blob:share'),
    revokeObjectURL: vi.fn(),
    schedule: (callback) => callback(),
    ...overrides,
  };
}

describe('shareTrack', () => {
  it('shares the original song file when the Web Share API supports files', async () => {
    const file = new File(['audio'], 'sunrise.mp3', { type: 'audio/mpeg' });
    const share = vi.fn(async () => undefined);
    const env = environment({
      navigator: {
        canShare: vi.fn(() => true),
        share,
        clipboard: { writeText: vi.fn() } as unknown as Clipboard,
      },
    });

    await expect(shareTrack(track({ fileRef: file, isLocal: true }), env)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      files: [file],
      title: 'Sunrise by Phoenix',
    }));
  });

  it('downloads a local song when native file sharing is unavailable', async () => {
    const file = new File(['audio'], 'sunrise.mp3', { type: 'audio/mpeg' });
    const env = environment();

    await expect(shareTrack(track({ fileRef: file, isLocal: true }), env)).resolves.toBe('downloaded');

    const link = vi.mocked(env.document.createElement).mock.results[0].value;
    expect(link.download).toBe('sunrise.mp3');
    expect(link.click).toHaveBeenCalled();
    expect(env.revokeObjectURL).toHaveBeenCalledWith('blob:share');
  });

  it('does not fall back when the person closes the share sheet', async () => {
    const file = new File(['audio'], 'sunrise.mp3', { type: 'audio/mpeg' });
    const env = environment({
      navigator: {
        canShare: vi.fn(() => true),
        share: vi.fn(async () => {
          throw new DOMException('Cancelled', 'AbortError');
        }),
        clipboard: { writeText: vi.fn() } as unknown as Clipboard,
      },
    });

    await expect(shareTrack(track({ fileRef: file }), env)).resolves.toBe('cancelled');
    expect(env.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('getTrackShareText', () => {
  it('includes the artist when one is available', () => {
    expect(getTrackShareText(track())).toBe('Sunrise by Phoenix');
    expect(getTrackShareText(track({ artist: '  ' }))).toBe('Sunrise');
  });
});
