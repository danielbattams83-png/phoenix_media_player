import type { Track } from '../types';

export type ShareTrackResult = 'shared' | 'downloaded' | 'copied' | 'cancelled';

export interface ShareEnvironment {
  navigator: Partial<Pick<Navigator, 'canShare' | 'share' | 'clipboard'>>;
  document: Pick<Document, 'body' | 'createElement'>;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  schedule: (callback: () => void) => void;
}

const defaultEnvironment = (): ShareEnvironment => ({
  navigator,
  document,
  createObjectURL: URL.createObjectURL,
  revokeObjectURL: URL.revokeObjectURL,
  schedule: (callback) => window.setTimeout(callback, 0),
});

export function getTrackShareText(track: Track): string {
  return track.artist.trim() ? `${track.title} by ${track.artist}` : track.title;
}

function isPublicMediaUrl(url?: string): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

function canShare(environment: ShareEnvironment, data: ShareData): boolean {
  try {
    return Boolean(environment.navigator.share && environment.navigator.canShare?.(data));
  } catch {
    return false;
  }
}

function downloadTrack(track: Track, environment: ShareEnvironment): boolean {
  const file = track.fileRef;
  if (!file) return false;

  const url = environment.createObjectURL(file);
  const link = environment.document.createElement('a');
  link.href = url;
  link.download = file.name || `${track.title}.${track.format.toLowerCase()}`;
  link.hidden = true;
  environment.document.body.appendChild(link);
  link.click();
  link.remove();
  environment.schedule(() => environment.revokeObjectURL(url));
  return true;
}

export async function shareTrack(
  track: Track,
  environment: ShareEnvironment = defaultEnvironment(),
): Promise<ShareTrackResult> {
  const title = getTrackShareText(track);
  const fileShareData: ShareData = {
    title,
    text: `Listen to ${title}`,
    files: track.fileRef ? [track.fileRef] : undefined,
  };

  if (
    track.fileRef
    && environment.navigator.share
    && canShare(environment, fileShareData)
  ) {
    try {
      await environment.navigator.share(fileShareData);
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
    }
  }

  const publicUrl = isPublicMediaUrl(track.mediaUrl) ? track.mediaUrl : undefined;
  if (publicUrl && environment.navigator.share) {
    try {
      await environment.navigator.share({
        title,
        text: `Listen to ${title}`,
        url: publicUrl,
      });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
    }
  }

  if (downloadTrack(track, environment)) return 'downloaded';

  const shareableText = publicUrl ? `${title}\n${publicUrl}` : title;
  if (environment.navigator.clipboard?.writeText) {
    await environment.navigator.clipboard.writeText(shareableText);
    return 'copied';
  }

  throw new Error('Sharing is not supported by this browser.');
}
