"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { youtubeVideoId } from "@/lib/youtube";

type PlayerHandle = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getIframe: () => HTMLIFrameElement | null;
  destroy: () => void;
};

type YoutubeApi = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => PlayerHandle;
};

declare global {
  interface Window {
    YT?: YoutubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const BAR_COUNT = 18;
const SKIP_SECONDS = 10;
const PLAYING = 1;
const ENDED = 0;

type MusicPlayback = {
  ready: boolean;
  muted: boolean;
  playing: boolean;
  current: number;
  duration: number;
  loop: boolean;
  hasVideo: boolean;
  togglePlay: () => void;
  toggleMute: () => void;
  skip: (delta: number) => void;
  seekRatio: (ratio: number) => void;
  setLoop: (value: boolean) => void;
};

const MusicPlaybackContext = createContext<MusicPlayback | null>(null);

let youtubeApiPromise: Promise<YoutubeApi> | null = null;

function loadYoutubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector("script[data-linkli-youtube]")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.linkliYoutube = "true";
      document.head.appendChild(script);
    }
    if (window.YT?.Player) resolve(window.YT);
  });
  return youtubeApiPromise;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = String(whole % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function IconMute({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h3.2L12 19.5V4.5L7.2 9H4Z" />
      {muted
        ? <path d="M15.2 9.2 20 14m0-4.8-4.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        : <path d="M15.4 8.4a5 5 0 0 1 0 7.2M17.8 6a8.2 8.2 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

function IconSkip({ dir }: { dir: "back" | "fwd" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={dir === "back" ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M5 6.5v11L13.5 12 5 6.5Zm9.2 0v11L22.7 12 14.2 6.5Z" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 5.4v13.2L19.4 12 8.2 5.4Z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5h3.4v14H7V5Zm6.6 0H17v14h-3.4V5Z" />
    </svg>
  );
}

function IconRepeat({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 7h9.1l-1.7-1.7 1.1-1.1L19.8 7l-4.1 2.8-1.1-1.1L16.3 9H7.2A3.2 3.2 0 0 0 4 12.2v2.3H2.4v-2.3A4.8 4.8 0 0 1 7.2 7Zm9.6 10H7.7l1.7 1.7-1.1 1.1L4.2 17l4.1-2.8 1.1 1.1L7.7 15h9.1A3.2 3.2 0 0 0 20 11.8V9.5h1.6v2.3a4.8 4.8 0 0 1-4.8 4.8Z" />
      {on ? <circle cx="12" cy="12" r="2.1" /> : null}
    </svg>
  );
}

const idlePlayback: MusicPlayback = {
  ready: false,
  muted: false,
  playing: false,
  current: 0,
  duration: 0,
  loop: false,
  hasVideo: false,
  togglePlay() {},
  toggleMute() {},
  skip() {},
  seekRatio() {},
  setLoop() {},
};

export function MusicPlaybackProvider({ youtubeUrl, children }: { youtubeUrl: string; children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const loopRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loop, setLoopState] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoId = youtubeVideoId(youtubeUrl);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  useEffect(() => {
    if (!videoId || !wrapRef.current) {
      playerRef.current?.destroy();
      playerRef.current = null;
      setReady(false);
      setPlaying(false);
      setCurrent(0);
      setDuration(0);
      return;
    }
    let cancelled = false;
    const host = document.createElement("div");
    wrapRef.current.replaceChildren(host);
    loadYoutubeApi().then((api) => {
      if (cancelled || !host.isConnected) return;
      playerRef.current?.destroy();
      playerRef.current = new api.Player(host, {
        videoId,
        width: 1,
        height: 1,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: PlayerHandle }) => {
            if (cancelled) return;
            const iframe = event.target.getIframe();
            iframe?.setAttribute("title", "נגן YouTube");
            setReady(true);
            setDuration(playerRef.current?.getDuration() || 0);
          },
          onStateChange: (event: { data: number }) => {
            if (cancelled) return;
            setPlaying(event.data === PLAYING);
            if (event.data === ENDED) {
              if (loopRef.current) {
                playerRef.current?.seekTo(0, true);
                playerRef.current?.playVideo();
                return;
              }
              setPlaying(false);
              setCurrent(0);
            }
          },
        },
      });
    }).catch(() => {
      if (!cancelled) setReady(false);
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrent(player.getCurrentTime() || 0);
      setDuration(player.getDuration() || 0);
      setPlaying(player.getPlayerState() === PLAYING);
    }, 250);
    return () => window.clearInterval(timer);
  }, [ready]);

  const value = useMemo<MusicPlayback>(() => ({
    ready,
    muted,
    playing,
    current,
    duration,
    loop,
    hasVideo: Boolean(videoId),
    togglePlay() {
      const player = playerRef.current;
      if (!player) return;
      if (playing) player.pauseVideo();
      else player.playVideo();
    },
    toggleMute() {
      const player = playerRef.current;
      if (!player) return;
      if (muted) player.unMute();
      else player.mute();
      setMuted((currentMuted) => !currentMuted);
    },
    skip(delta: number) {
      const player = playerRef.current;
      if (!player) return;
      const next = Math.max(0, Math.min((player.getDuration() || 0) - 0.25, (player.getCurrentTime() || 0) + delta));
      player.seekTo(next, true);
      setCurrent(next);
    },
    seekRatio(ratio: number) {
      const player = playerRef.current;
      if (!player || !duration) return;
      const next = Math.min(1, Math.max(0, ratio)) * duration;
      player.seekTo(next, true);
      setCurrent(next);
    },
    setLoop(next: boolean) {
      setLoopState(next);
    },
  }), [ready, muted, playing, current, duration, loop, videoId]);

  return (
    <MusicPlaybackContext.Provider value={value}>
      <div ref={wrapRef} className="page-music-host" aria-hidden="true" />
      {children}
    </MusicPlaybackContext.Provider>
  );
}

function useMusicPlayback() {
  return useContext(MusicPlaybackContext) || idlePlayback;
}

export function MusicMuteFab() {
  const playback = useMusicPlayback();
  return (
    <button
      type="button"
      className={`page-music-mute-fab ${playback.muted ? "is-muted" : ""}`}
      onClick={playback.toggleMute}
      onPointerDown={(event) => event.stopPropagation()}
      disabled={!playback.hasVideo || !playback.ready}
      aria-label={playback.muted ? "ביטול השתקה" : "השתקת המוזיקה"}
      title={playback.muted ? "ביטול השתקה" : "השתקה"}
    >
      <IconMute muted={playback.muted} />
    </button>
  );
}

export default function PageMusicPlayer({
  emptyHint = "מדביקים קישור יוטיוב בסרגל העריכה",
}: {
  youtubeUrl?: string;
  emptyHint?: string;
}) {
  const playback = useMusicPlayback();
  const progress = playback.duration > 0 ? Math.min(1, playback.current / playback.duration) : 0;

  function seek(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    playback.seekRatio((event.clientX - rect.left) / Math.max(rect.width, 1));
  }

  return (
    <div className={`page-music-player ${playback.playing ? "is-playing" : ""} ${playback.hasVideo ? "" : "is-empty"}`} dir="ltr">
      <div className="page-music-bars" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <i key={index} style={{ animationDelay: `${(index % 7) * -0.12}s`, animationDuration: `${0.72 + (index % 5) * 0.11}s` }} />
        ))}
      </div>
      {playback.hasVideo ? (
        <>
          <div
            className="page-music-progress"
            role="slider"
            tabIndex={0}
            aria-label="התקדמות השיר"
            aria-valuemin={0}
            aria-valuemax={Math.round(playback.duration)}
            aria-valuenow={Math.round(playback.current)}
            onPointerDown={(event) => {
              event.stopPropagation();
              seek(event);
            }}
          >
            <span style={{ width: `${progress * 100}%` }} />
            <em style={{ insetInlineStart: `${progress * 100}%` }} />
          </div>
          <div className="page-music-times" aria-hidden="true">
            <small>{formatTime(playback.current)}</small>
            <small>{formatTime(playback.duration)}</small>
          </div>
          <div className="page-music-controls" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={playback.toggleMute} aria-label={playback.muted ? "ביטול השתקה" : "השתקה"} disabled={!playback.ready}>
              <IconMute muted={playback.muted} />
            </button>
            <button type="button" onClick={() => playback.skip(-SKIP_SECONDS)} aria-label="עשר שניות אחורה" disabled={!playback.ready}>
              <IconSkip dir="back" />
            </button>
            <button type="button" className="page-music-play" onClick={playback.togglePlay} aria-label={playback.playing ? "השהיה" : "ניגון"} disabled={!playback.ready}>
              {playback.playing ? <IconPause /> : <IconPlay />}
            </button>
            <button type="button" onClick={() => playback.skip(SKIP_SECONDS)} aria-label="עשר שניות קדימה" disabled={!playback.ready}>
              <IconSkip dir="fwd" />
            </button>
            <button type="button" className={playback.loop ? "is-on" : ""} onClick={() => playback.setLoop(!playback.loop)} aria-label="חזרה על השיר" aria-pressed={playback.loop} disabled={!playback.ready}>
              <IconRepeat on={playback.loop} />
            </button>
          </div>
        </>
      ) : (
        <p className="page-music-empty" dir="rtl">{emptyHint}</p>
      )}
    </div>
  );
}
