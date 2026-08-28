"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, LoaderCircle, Play, Radio, TriangleAlert } from "lucide-react";

type PlaybackState = "loading" | "switching" | "ready" | "buffering" | "error";

const videoSources = [
  {
    id: "mp4",
    label: "MP4",
    src: "/demo/jelajah-level3-demo.mp4?v=20260828-2",
    download: "/demo/jelajah-level3-demo.mp4",
  },
  {
    id: "webm",
    label: "WebM",
    src: "/demo/jelajah-level3-demo.webm?v=20260828-2",
    download: "/demo/jelajah-level3-demo.webm",
  },
] as const;

const playbackCopy: Record<PlaybackState, string> = {
  loading: "Menyiapkan video…",
  switching: "Format pertama belum siap, mencoba format cadangan…",
  ready: "Siap diputar",
  buffering: "Menyesuaikan koneksi…",
  error: "Browser belum dapat memutar kedua format.",
};

export default function DemoPage() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("loading");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeSource = videoSources[sourceIndex];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let settled = false;
    let fallbackRequested = false;

    const markReady = () => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      settled = true;
      setPlaybackState("ready");
    };

    const tryFallback = () => {
      if (fallbackRequested || settled || video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        markReady();
        return;
      }

      fallbackRequested = true;
      if (sourceIndex < videoSources.length - 1) {
        setPlaybackState("switching");
        setSourceIndex((current) => current + 1);
      } else {
        setPlaybackState("error");
      }
    };

    const fallbackTimer = window.setTimeout(tryFallback, 5000);

    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    video.addEventListener("error", tryFallback);
    video.load();
    markReady();

    return () => {
      window.clearTimeout(fallbackTimer);
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      video.removeEventListener("error", tryFallback);
    };
  }, [reloadToken, sourceIndex]);

  const selectSource = (nextSourceIndex: number) => {
    if (nextSourceIndex === sourceIndex) {
      setReloadToken((current) => current + 1);
    } else {
      setSourceIndex(nextSourceIndex);
    }
    setPlaybackState(nextSourceIndex > sourceIndex ? "switching" : "loading");
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#090d18] px-4 py-10 text-white sm:px-8 lg:py-16">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -left-32 top-1/3 size-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
        <section>
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            <span className="flex items-center gap-2 text-cyan-300">
              <Radio className="size-4" /> Stellar Testnet
            </span>
            <span className="h-px w-10 bg-slate-700" />
            <span>Level 3 evidence reel · 01:29</span>
          </div>

          <h1 className="max-w-4xl text-balance font-serif text-4xl leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Hidden. Hunted.
            <span className="block text-cyan-300">Proven on-chain.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">
            Demo inter-contract JELAJAH: live Soroban events, deployed factory, atomic XLM payout,
            reputation XP, CI, dan test output dalam satu rekaman.
          </p>
        </section>

        <aside className="border-l border-slate-700 pl-5 text-sm leading-6 text-slate-400">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">Playback strategy</p>
          <p className="mt-2">VP8/WebM untuk Chromium dan H.264/MP4 untuk Safari, Chrome, serta perangkat mobile.</p>
        </aside>
      </div>

      <section className="relative mx-auto mt-10 max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_30px_100px_rgba(0,0,0,.55)]">
        <video
          ref={videoRef}
          key={activeSource.id}
          src={activeSource.src}
          className="aspect-video w-full bg-black object-contain"
          controls
          playsInline
          preload="metadata"
          poster="/screenshots/level-3/live-events-desktop.png"
          onLoadedData={() => setPlaybackState("ready")}
          onCanPlay={() => setPlaybackState("ready")}
          onWaiting={() => setPlaybackState("buffering")}
          onPlaying={() => setPlaybackState("ready")}
        />

        <div className="flex flex-col gap-4 border-t border-white/10 bg-[#0d1322] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-300" aria-live="polite">
            {playbackState === "ready" && <CheckCircle2 className="size-4 text-emerald-400" />}
            {(playbackState === "loading" || playbackState === "switching" || playbackState === "buffering") && (
              <LoaderCircle className="size-4 animate-spin text-cyan-300" />
            )}
            {playbackState === "error" && <TriangleAlert className="size-4 text-amber-400" />}
            <span>
              {playbackCopy[playbackState]}
              {playbackState === "ready" && <span className="text-slate-500"> · {activeSource.label}</span>}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {videoSources.map((source, index) => (
              <button
                key={source.id}
                type="button"
                onClick={() => selectSource(index)}
                aria-pressed={sourceIndex === index}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition ${
                  sourceIndex === index
                    ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-200"
                    : "border-white/15 text-slate-200 hover:border-cyan-300/70 hover:text-cyan-200"
                }`}
              >
                <Play className="size-3.5" /> {source.label}
              </button>
            ))}
            <a
              href={activeSource.download}
              download
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-slate-200 transition hover:border-cyan-300/70 hover:text-cyan-200"
            >
              <Download className="size-4" /> Unduh {activeSource.label}
            </a>
          </div>
        </div>
      </section>

      <div className="relative mx-auto mt-7 flex max-w-6xl flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500">
        <Link href="/wallet" className="transition hover:text-cyan-300">Live contract events</Link>
        <a href="https://github.com/Faiz-abdurrachman/jelajah/actions/runs/33130989682" target="_blank" rel="noreferrer" className="transition hover:text-cyan-300">CI evidence</a>
        <a href="https://stellar.expert/explorer/testnet/tx/619042c261559c4b0337657c3c8e7dc36df3b0cf9707eeba677b2b4836304c41" target="_blank" rel="noreferrer" className="transition hover:text-cyan-300">Payout + XP transaction</a>
      </div>
    </main>
  );
}
