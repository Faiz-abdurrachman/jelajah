"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { MAP_CONFIG } from "@/config/constants";
import type { Hunt, HuntMarker, MapCoordinates } from "@/types";

interface HuntMapProps {
  hunts?: HuntMarker[];
  onHuntClick?: (hunt: Hunt) => void;
  centerOn?: MapCoordinates;
  className?: string;
}

interface MBMap {
  on(event: string, callback: () => void): void;
  addControl(control: object, position: string): void;
  remove(): void;
}

interface MBMarker {
  setLngLat(lnglat: [number, number]): MBMarker;
  addTo(map: MBMap): MBMarker;
  remove(): void;
}

interface MBGL {
  accessToken: string;
  Map: new (opts: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
  }) => MBMap;
  Marker: new (opts?: { element?: HTMLElement }) => MBMarker;
  NavigationControl: new () => object;
}

export function HuntMap({
  hunts = [],
  onHuntClick,
  centerOn,
  className = "",
}: HuntMapProps) {
  const router = useRouter();
  const { isConnected } = useWallet();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapboxToken] = useState(() =>
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null
      : null
  );
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return;

    let cleanup: (() => void) | undefined;
    let isMounted = true;

    const initMap = async () => {
      try {
        const mbgl = await loadMBGL();

        if (!isMounted || !mapContainerRef.current) return;

        mbgl.accessToken = mapboxToken;

        const center = centerOn
          ? [centerOn.lng, centerOn.lat]
          : [MAP_CONFIG.defaultCenter.lng, MAP_CONFIG.defaultCenter.lat];

        const map = new mbgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center as [number, number],
          zoom: MAP_CONFIG.defaultZoom,
          minZoom: MAP_CONFIG.minZoom,
          maxZoom: MAP_CONFIG.maxZoom,
        });

        map.addControl(new mbgl.NavigationControl(), "top-right");

        map.on("load", () => {
          if (isMounted) setMapLoaded(true);
        });

        map.on("error", () => {
          if (isMounted) setMapError("Gagal memuat peta");
        });

        const markers: MBMarker[] = [];
        hunts.forEach((marker) => {
          const el = document.createElement("div");
          el.className =
            "flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background transition-transform hover:scale-110";
          el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

          if (onHuntClick) {
            el.addEventListener("click", () => onHuntClick(marker.hunt));
          }

          const m = new mbgl.Marker({ element: el })
            .setLngLat([marker.coordinates.lng, marker.coordinates.lat])
            .addTo(map);

          markers.push(m);
        });

        cleanup = () => {
          markers.forEach((m) => m.remove());
          map.remove();
        };
      } catch {
        if (isMounted) {
          setMapError("Gagal memuat Mapbox. Coba refresh atau periksa koneksi.");
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [mapboxToken, centerOn, hunts, onHuntClick]);

  if (mapboxToken) {
    return (
      <div className={`relative flex-1 ${className}`}>
        <div ref={mapContainerRef} className="absolute inset-0" />
        {mapError && (
          <div className="absolute left-4 right-4 top-4 z-10 rounded-lg bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground">
            {mapError}
          </div>
        )}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Navigation className="size-6 animate-pulse text-muted-foreground" />
          </div>
        )}
        <FloatingActions
          isConnected={isConnected}
          onBuatHunt={() => router.push("/hunt/create")}
        />
        <InfoBar />
      </div>
    );
  }

  return (
    <div className={`relative flex-1 ${className}`}>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="size-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <MapPin className="relative z-10 size-12 text-muted-foreground mb-4" />
        <h2 className="relative z-10 text-xl font-semibold mb-2">Peta Hunt</h2>
        <p className="relative z-10 text-muted-foreground text-sm mb-6 max-w-md text-center">
          Mapbox akan tampil di sini. Setup MAPBOX_TOKEN di .env.local untuk
          mengaktifkan.
        </p>
        <div className="relative z-10 flex gap-3">
          <Button variant="outline" size="sm" disabled>
            Filter
          </Button>
          <Button variant="outline" size="sm" disabled>
            List View
          </Button>
          {isConnected && (
            <Button size="sm" onClick={() => router.push("/hunt/create")}>
              Buat Hunt
            </Button>
          )}
        </div>
      </div>
      <InfoBar />
    </div>
  );
}

function FloatingActions({
  isConnected,
  onBuatHunt,
}: {
  isConnected: boolean;
  onBuatHunt: () => void;
}) {
  return (
    <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 shadow-lg backdrop-blur-sm">
        <Button variant="outline" size="sm" disabled>
          Filter
        </Button>
        <Button variant="outline" size="sm" disabled>
          List View
        </Button>
        {isConnected && (
          <Button size="sm" onClick={onBuatHunt}>
            Buat Hunt
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoBar() {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-background/80 p-3 px-6 text-sm text-muted-foreground backdrop-blur-sm flex items-center justify-between">
      <span>Mapbox integration &mdash; setup token untuk aktifkan</span>
      <span className="font-mono text-xs">L1 &bull; White Belt</span>
    </div>
  );
}

async function loadMBGL(): Promise<MBGL> {
  const w = window as unknown as Record<string, unknown>;
  if (w.mapboxgl) return w.mapboxgl as MBGL;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js";
    script.async = true;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";

    script.onload = () => {
      document.head.appendChild(link);
      resolve((window as unknown as Record<string, unknown>).mapboxgl as MBGL);
    };

    script.onerror = () => reject(new Error("Gagal memuat Mapbox dari CDN"));
    document.head.appendChild(script);
  });
}
