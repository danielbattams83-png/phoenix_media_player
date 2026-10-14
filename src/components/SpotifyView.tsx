import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, ListMusic, LogOut, Music2, Pause, Play, RefreshCw } from 'lucide-react';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? '';
const TOKEN_KEY = 'phoenix-spotify-session';
const PENDING_AUTH_KEY = 'phoenix-spotify-pkce';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const API_ENDPOINT = 'https://api.spotify.com/v1';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-modify-playback-state'
].join(' ');

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbum {
  name: string;
  images: Array<{ url: string }>;
}

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  external_urls: { spotify: string };
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

interface SavedTrack {
  added_at: string;
  track: SpotifyTrack;
}

interface SavedTrackResponse {
  added_at: string;
  track: SpotifyTrack | null;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  tracks: { total: number };
  images: Array<{ url: string }>;
  external_urls: { spotify: string };
}

interface SpotifyPage<T> {
  items: T[];
  next: string | null;
}

interface SpotifyProfile {
  display_name: string;
  email?: string;
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      name: string;
      artists: SpotifyArtist[];
      uri: string;
    };
  };
}

interface SpotifyPlayer {
  addListener(event: string, callback: (value: unknown) => void): boolean;
  connect(): Promise<boolean>;
  disconnect(): void;
  togglePlay(): Promise<void>;
}

interface SpotifySdk {
  Player: new (options: {
    name: string;
    volume: number;
    getOAuthToken: (callback: (token: string) => void) => void;
  }) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

function loadSessionTokens(): SpotifyTokens | null {
  try {
    const value = sessionStorage.getItem(TOKEN_KEY);
    return value ? JSON.parse(value) as SpotifyTokens : null;
  } catch (error) {
    console.error('Could not read the Spotify login session:', error);
    return null;
  }
}

function saveSessionTokens(tokens: SpotifyTokens): void {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearSessionTokens(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(PENDING_AUTH_KEY);
}

function redirectUri(): string {
  return new URL('/', window.location.origin).toString();
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

async function readResponseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as {
    error?: string | { message?: string };
    error_description?: string;
  } | null;
  if (typeof body?.error === 'object' && body.error.message) return body.error.message;
  return body?.error_description ?? (typeof body?.error === 'string' ? body.error : `Spotify returned HTTP ${response.status}.`);
}

function ensureSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Spotify Web Playback SDK did not load. Check your connection and try again.')), 20000);
    window.onSpotifyWebPlaybackSDKReady = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-spotify-playback-sdk]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.dataset.spotifyPlaybackSdk = 'true';
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Could not load Spotify Web Playback SDK.'));
      };
      document.head.appendChild(script);
    }
  });
}

export const SpotifyView: React.FC = () => {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(loadSessionTokens);
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackUri, setCurrentTrackUri] = useState('');
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const tokensRef = useRef<SpotifyTokens | null>(tokens);
  const refreshPromiseRef = useRef<Promise<SpotifyTokens> | null>(null);

  const updateTokens = useCallback((nextTokens: SpotifyTokens | null) => {
    tokensRef.current = nextTokens;
    setTokens(nextTokens);
    if (nextTokens) saveSessionTokens(nextTokens);
    else clearSessionTokens();
  }, []);

  const refreshAccessToken = useCallback(async (force = false): Promise<string> => {
    const current = tokensRef.current;
    if (!current) throw new Error('Log in to Spotify to continue.');
    if (!force && current.expiresAt > Date.now() + 60_000) return current.accessToken;
    if (refreshPromiseRef.current) return (await refreshPromiseRef.current).accessToken;

    const refreshPromise = (async () => {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: current.refreshToken,
        client_id: CLIENT_ID
      });
      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      if (!response.ok) throw new Error(`Spotify token refresh failed: ${await readResponseError(response)}`);
      const result = await response.json() as { access_token: string; expires_in: number; refresh_token?: string };
      const nextTokens: SpotifyTokens = {
        accessToken: result.access_token,
        refreshToken: result.refresh_token ?? current.refreshToken,
        expiresAt: Date.now() + result.expires_in * 1000
      };
      updateTokens(nextTokens);
      return nextTokens;
    })();
    refreshPromiseRef.current = refreshPromise;
    try {
      return (await refreshPromise).accessToken;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [updateTokens]);

  const apiFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const target = url.startsWith('http') ? url : `${API_ENDPOINT}${url}`;
    let accessToken = await refreshAccessToken();
    let response = await fetch(target, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` }
    });
    if (response.status === 401) {
      accessToken = await refreshAccessToken(true);
      response = await fetch(target, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` }
      });
    }
    if (!response.ok) throw new Error(`Spotify request failed: ${await readResponseError(response)}`);
    return response;
  }, [refreshAccessToken]);

  const getAllPages = useCallback(async <T,>(url: string): Promise<T[]> => {
    const items: T[] = [];
    let next: string | null = url;
    while (next) {
      const response = await apiFetch(next);
      const page = await response.json() as SpotifyPage<T>;
      items.push(...page.items);
      next = page.next;
    }
    return items;
  }, [apiFetch]);

  const loadLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    setError(null);
    try {
      const [tracks, userPlaylists, user] = await Promise.all([
        getAllPages<SavedTrackResponse>('/me/tracks?limit=50'),
        getAllPages<SpotifyPlaylist>('/me/playlists?limit=50'),
        apiFetch('/me').then((response) => response.json() as Promise<SpotifyProfile>)
      ]);
      setSavedTracks(tracks.flatMap((item) => item.track ? [{ added_at: item.added_at, track: item.track }] : []));
      setPlaylists(userPlaylists);
      setProfile(user);
    } catch (caught) {
      console.error('Could not load Spotify library:', caught);
      setError(caught instanceof Error ? caught.message : 'Could not load your Spotify library.');
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [apiFetch, getAllPages]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const code = currentUrl.searchParams.get('code');
    const returnedState = currentUrl.searchParams.get('state');
    const authError = currentUrl.searchParams.get('error');
    if (!code && !authError) return;

    currentUrl.searchParams.delete('code');
    currentUrl.searchParams.delete('state');
    currentUrl.searchParams.delete('error');
    currentUrl.searchParams.delete('error_description');
    window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);

    if (authError) {
      setError(`Spotify login was not completed: ${authError.replaceAll('_', ' ')}.`);
      return;
    }
    if (!code) return;
    if (!CLIENT_ID) {
      setError('Set VITE_SPOTIFY_CLIENT_ID before logging in to Spotify.');
      return;
    }

    const finishLogin = async () => {
      try {
        const pending = sessionStorage.getItem(PENDING_AUTH_KEY);
        sessionStorage.removeItem(PENDING_AUTH_KEY);
        const auth = pending ? JSON.parse(pending) as { state: string; verifier: string } : null;
        if (!auth || auth.state !== returnedState) throw new Error('Spotify sign-in could not be verified. Please try logging in again.');
        setIsLoggingIn(true);
        const response = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri(),
            code_verifier: auth.verifier
          })
        });
        if (!response.ok) throw new Error(`Spotify login failed: ${await readResponseError(response)}`);
        const result = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
        updateTokens({
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          expiresAt: Date.now() + result.expires_in * 1000
        });
      } catch (caught) {
        console.error('Spotify authorization failed:', caught);
        setError(caught instanceof Error ? caught.message : 'Spotify login failed.');
      } finally {
        setIsLoggingIn(false);
      }
    };
    void finishLogin();
  }, [updateTokens]);

  useEffect(() => {
    if (tokens) void loadLibrary();
    else {
      setSavedTracks([]);
      setPlaylists([]);
      setProfile(null);
    }
  }, [Boolean(tokens), loadLibrary]);

  useEffect(() => {
    if (!tokens || !CLIENT_ID) return;
    let cancelled = false;
    let player: SpotifyPlayer | null = null;
    const connectPlayer = async () => {
      try {
        await ensureSpotifySdk();
        if (cancelled || !window.Spotify) return;
        player = new window.Spotify.Player({
          name: 'Phoenix Media Player',
          volume: 0.75,
          getOAuthToken: (callback) => {
            void refreshAccessToken().then(callback).catch((caught: unknown) => {
              setError(caught instanceof Error ? caught.message : 'Could not refresh Spotify login.');
            });
          }
        });
        playerRef.current = player;
        player.addListener('ready', (value) => {
          const { device_id } = value as { device_id: string };
          setDeviceId(device_id);
          setSdkReady(true);
        });
        player.addListener('not_ready', () => {
          setDeviceId(null);
          setSdkReady(false);
        });
        player.addListener('player_state_changed', (value) => {
          const state = value as SpotifyPlaybackState | null;
          if (!state) return;
          setIsPlaying(!state.paused);
          setCurrentTrackUri(state.track_window.current_track.uri);
        });
        player.addListener('initialization_error', (value) => setError(`Spotify player initialization failed: ${(value as { message: string }).message}`));
        player.addListener('authentication_error', (value) => setError(`Spotify player authentication failed: ${(value as { message: string }).message}`));
        player.addListener('account_error', (value) => setError(`Spotify playback requires an eligible Premium account: ${(value as { message: string }).message}`));
        player.addListener('playback_error', (value) => setError(`Spotify playback failed: ${(value as { message: string }).message}`));
        const connected = await player.connect();
        if (!connected) throw new Error('Could not connect Spotify playback device. Check that your account supports Web Playback SDK.');
      } catch (caught) {
        if (!cancelled) {
          console.error('Could not initialize Spotify Web Playback SDK:', caught);
          setError(caught instanceof Error ? caught.message : 'Could not initialize the Spotify player.');
        }
      }
    };
    void connectPlayer();
    return () => {
      cancelled = true;
      player?.disconnect();
      if (playerRef.current === player) playerRef.current = null;
      setDeviceId(null);
      setSdkReady(false);
    };
  }, [Boolean(tokens), refreshAccessToken]);

  const login = async () => {
    if (!CLIENT_ID) {
      setError('Spotify login needs a Client ID. Configure VITE_SPOTIFY_CLIENT_ID and add this app origin as a Redirect URI in Spotify Developer Dashboard.');
      return;
    }
    try {
      setError(null);
      setIsLoggingIn(true);
      const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)));
      const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = await createCodeChallenge(verifier);
      sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify({ state, verifier }));
      const authorizationUrl = new URL('https://accounts.spotify.com/authorize');
      authorizationUrl.search = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri(),
        scope: SCOPES,
        state,
        code_challenge_method: 'S256',
        code_challenge: challenge
      }).toString();
      window.location.assign(authorizationUrl.toString());
    } catch (caught) {
      console.error('Could not start Spotify authorization:', caught);
      setError(caught instanceof Error ? caught.message : 'Could not start Spotify login.');
      setIsLoggingIn(false);
    }
  };

  const playSpotifyUri = async (uri: string, playlistContext = false) => {
    if (!deviceId) {
      setError('Spotify playback device is not ready yet. Wait for the player to connect and try again.');
      return;
    }
    setError(null);
    try {
      const response = await apiFetch(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlistContext ? { context_uri: uri } : { uris: [uri] })
      });
      if (response.status !== 204) throw new Error(`Unexpected Spotify playback status: ${response.status}`);
      setCurrentTrackUri(uri);
      setIsPlaying(true);
    } catch (caught) {
      console.error('Could not start Spotify playback:', caught);
      setError(caught instanceof Error ? caught.message : 'Could not start Spotify playback.');
    }
  };

  const logout = () => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    updateTokens(null);
    setDeviceId(null);
    setSdkReady(false);
    setIsPlaying(false);
    setCurrentTrackUri('');
    setError(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 animate-fadeIn sm:p-6 lg:p-8">
      <section className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Music2 className="h-6 w-6" /></span>
            <div>
              <h2 className="text-xl font-bold text-white">Spotify in Phoenix</h2>
              <p className="text-xs text-zinc-400">{profile ? `Signed in as ${profile.display_name}` : 'Sign in to browse your Spotify library and play on this device.'}</p>
            </div>
          </div>
          {tokens ? (
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5"><LogOut className="h-4 w-4" /> Sign out</button>
          ) : (
            <button onClick={() => void login()} disabled={isLoggingIn} className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50">{isLoggingIn ? 'Connecting…' : 'Connect Spotify'}</button>
          )}
        </div>

        {!CLIENT_ID && (
          <aside className="space-y-2 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-xs text-amber-100">
            <p className="font-semibold">Spotify app setup required</p>
            <p>Set <code className="rounded bg-black/20 px-1.5 py-0.5">VITE_SPOTIFY_CLIENT_ID</code> to your Spotify Developer app Client ID, then add this exact Redirect URI to that app:</p>
            <code className="block break-all rounded-lg bg-black/20 p-2">{redirectUri()}</code>
            <p>The Web Playback SDK requires a Spotify Premium account. The Client ID is public; never put a client secret in this frontend.</p>
          </aside>
        )}

        {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-xs text-rose-200"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error" className="shrink-0 text-rose-300 hover:text-white">Dismiss</button></div>}

        {tokens && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Playback device: Phoenix Media Player</p>
                <p className="mt-1 text-xs text-zinc-400">{sdkReady && deviceId ? `Connected · ${deviceId}` : 'Connecting Spotify Web Playback SDK…'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => void loadLibrary()} disabled={isLoadingLibrary} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isLoadingLibrary ? 'animate-spin' : ''}`} /> Refresh library</button>
                <button onClick={() => void playerRef.current?.togglePlay().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not toggle Spotify playback.'))} disabled={!sdkReady} aria-label={isPlaying ? 'Pause Spotify playback' : 'Resume Spotify playback'} className="rounded-full bg-emerald-400 p-2 text-zinc-950 disabled:opacity-40">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
              </div>
            </div>

            {isLoadingLibrary && <p className="text-xs text-zinc-400">Loading your Spotify library…</p>}

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="min-w-0 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Music2 className="h-4 w-4 text-emerald-300" /> Saved tracks <span className="text-xs font-normal text-zinc-500">{savedTracks.length}</span></h3>
                <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                  {savedTracks.map(({ track }) => (
                    <div key={track.id} className={`flex items-center gap-3 border-b border-white/[0.05] p-3 last:border-0 ${currentTrackUri === track.uri ? 'bg-emerald-400/[0.08]' : ''}`}>
                      {track.album?.images?.[0]?.url ? <img src={track.album.images[0].url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5"><Music2 className="h-4 w-4 text-zinc-500" /></span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{track.name}</p>
                        <p className="truncate text-[11px] text-zinc-400">{track.artists.map((artist) => artist.name).join(', ')} · {track.album?.name}</p>
                      </div>
                      <button onClick={() => void playSpotifyUri(track.uri)} disabled={!deviceId} aria-label={`Play ${track.name}`} title="Play on Phoenix Media Player" className="rounded-full p-2 text-zinc-300 hover:bg-white/10 hover:text-emerald-300 disabled:opacity-35"><Play className="h-4 w-4 fill-current" /></button>
                      <a href={track.external_urls.spotify} target="_blank" rel="noreferrer" aria-label={`Open ${track.name} in Spotify`} className="rounded-full p-2 text-zinc-500 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </div>
                  ))}
                  {!savedTracks.length && !isLoadingLibrary && <p className="p-5 text-center text-xs text-zinc-500">No saved tracks found.</p>}
                </div>
              </section>

              <section className="min-w-0 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><ListMusic className="h-4 w-4 text-emerald-300" /> Your playlists <span className="text-xs font-normal text-zinc-500">{playlists.length}</span></h3>
                <div className="max-h-[55vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                  {playlists.map((playlist) => (
                    <div key={playlist.id} className="flex items-center gap-3 border-b border-white/[0.05] p-3 last:border-0">
                      {playlist.images[0]?.url ? <img src={playlist.images[0].url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5"><ListMusic className="h-4 w-4 text-zinc-500" /></span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{playlist.name}</p>
                        <p className="text-[11px] text-zinc-400">{playlist.tracks.total} tracks</p>
                      </div>
                      <button onClick={() => void playSpotifyUri(playlist.uri, true)} disabled={!deviceId} aria-label={`Play playlist ${playlist.name}`} title="Play playlist on Phoenix Media Player" className="rounded-full p-2 text-zinc-300 hover:bg-white/10 hover:text-emerald-300 disabled:opacity-35"><Play className="h-4 w-4 fill-current" /></button>
                      <a href={playlist.external_urls.spotify} target="_blank" rel="noreferrer" aria-label={`Open ${playlist.name} in Spotify`} className="rounded-full p-2 text-zinc-500 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </div>
                  ))}
                  {!playlists.length && !isLoadingLibrary && <p className="p-5 text-center text-xs text-zinc-500">No playlists found.</p>}
                </div>
              </section>
            </div>
          </>
        )}

        {!tokens && !isLoggingIn && CLIENT_ID && !error && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <Music2 className="mx-auto mb-3 h-9 w-9 text-emerald-400/70" />
            <p className="text-sm font-medium text-zinc-300">Connect your Spotify account</p>
            <p className="mt-1 text-xs text-zinc-500">Authorize Phoenix to read your library and play music on this device.</p>
          </div>
        )}
      </section>
    </div>
  );
};
