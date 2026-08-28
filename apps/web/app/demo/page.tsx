"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, LoaderCircle, Radio, TriangleAlert } from "lucide-react";

type PlaybackState = "loading" | "ready" | "buffering" | "error";

const playbackCopy: Record<PlaybackState, string> = {
  loading: "Memuat metadata video…",
  ready: "Siap diputar",
  buffering: "Menyesuaikan koneksi…",
  error: "Browser tidak dapat memutar source otomatis.",
};

export default function DemoPage() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("loading");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncPlaybackState = () => {
      if (video.error) setPlaybackState("error");
      else if (video.readyState >= HTMLMediaElement.HAVE_METADATA) setPlaybackState("ready");
    };

    syncPlaybackState();
    video.addEventListener("loadedmetadata", syncPlaybackState);
    video.addEventListener("canplay", syncPlaybackState);
    return () => {
      video.removeEventListener("loadedmetadata", syncPlaybackState);
      video.removeEventListener("canplay", syncPlaybackState);
    };
  }, []);

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
          className="aspect-video w-full bg-black object-contain"
          controls
          playsInline
          preload="metadata"
          poster="/screenshots/level-3/live-events-desktop.png"
          onLoadedMetadata={() => setPlaybackState("ready")}
          onCanPlay={() => setPlaybackState("ready")}
          onWaiting={() => setPlaybackState("buffering")}
          onPlaying={() => setPlaybackState("ready")}
          onError={() => setPlaybackState("error")}
        >
          <source src="/demo/jelajah-level3-demo.webm" type={'video/webm; codecs="vp8"'} />
          <source src="/demo/jelajah-level3-demo.mp4" type="video/mp4" />
          Browser kamu tidak mendukung video HTML5.
        </video>

        <div className="flex flex-col gap-4 border-t border-white/10 bg-[#0d1322] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-300" aria-live="polite">
            {playbackState === "ready" && <CheckCircle2 className="size-4 text-emerald-400" />}
            {(playbackState === "loading" || playbackState === "buffering") && (
              <LoaderCircle className="size-4 animate-spin text-cyan-300" />
            )}
            {playbackState === "error" && <TriangleAlert className="size-4 text-amber-400" />}
            {playbackCopy[playbackState]}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/demo/jelajah-level3-demo.mp4"
              download
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-slate-200 transition hover:border-cyan-300/70 hover:text-cyan-200"
            >
              <Download className="size-4" /> Unduh MP4
            </a>
            <a
              href="/demo/jelajah-level3-demo.webm"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-slate-200 transition hover:border-cyan-300/70 hover:text-cyan-200"
            >
              WebM <ExternalLink className="size-4" />
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
