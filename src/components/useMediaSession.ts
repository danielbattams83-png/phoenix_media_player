import { useEffect } from 'react';
import type { Track } from '../types';

export function useMediaSession(track: Track, playing: boolean, position: number, duration: number, rate: number, controls: { play: () => void; pause: () => void; next: () => void; previous: () => void; seek: (position: number) => void; stop: () => void }) {
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track.id) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: track.album, artwork: track.coverArt ? [{ src: track.coverArt }] : [] });
    return () => { navigator.mediaSession.metadata = null; };
  }, [track.id, track.title, track.artist, track.album, track.coverArt]);
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: controls.play, pause: controls.pause, nexttrack: controls.next, previoustrack: controls.previous, stop: controls.stop,
      seekto: event => { if (event.seekTime !== undefined) controls.seek(event.seekTime); },
      seekbackward: event => controls.seek(Math.max(0, position - (event.seekOffset ?? 10))),
      seekforward: event => controls.seek(Math.min(duration, position + (event.seekOffset ?? 10))),
    };
    for (const [action, handler] of Object.entries(handlers)) { try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler!); } catch { /* Some browsers support only a subset of media actions. */ } }
    if (Number.isFinite(duration) && duration > 0) { try { navigator.mediaSession.setPositionState({ duration, playbackRate: rate, position: Math.min(duration, Math.max(0, position)) }); } catch { /* Position reporting is optional on older browsers. */ } }
    return () => { for (const action of Object.keys(handlers)) { try { navigator.mediaSession.setActionHandler(action as MediaSessionAction, null); } catch { /* Unsupported action. */ } } };
  }, [playing, position, duration, rate, controls]);
}
