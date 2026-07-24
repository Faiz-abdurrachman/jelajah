"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { MAP_CONFIG } from "@/config/constants";
import type { Hunt, HuntMarker } from "@/types";

interface LeafletFallbackProps {
  hunts: HuntMarker[];
  onHuntClick?: (hunt: Hunt) => void;
  isConnected: boolean;
  onBuatHunt: () => void;
}

export function LeafletFallback({
  hunts,
  onHuntClick,
  isConnected,
  onBuatHunt,
}: LeafletFallbackProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      [MAP_CONFIG.defaultCenter.lat, MAP_CONFIG.defaultCenter.lng],
      MAP_CONFIG.defaultZoom
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    hunts.forEach(({ hunt, coordinates }) => {
      const marker = L.marker([coordinates.lat, coordinates.lng])
        .addTo(map)
        .bindPopup(`<b>${hunt.clue.slice(0, 50)}...</b><br>${hunt.huntType}`);

      marker.on("click", () => onHuntClick?.(hunt));
    });
  }, [hunts, onHuntClick]);

  return (
    <>
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
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
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t bg-background/80 p-3 px-6 text-sm text-muted-foreground backdrop-blur-sm flex items-center justify-between">
        <span>OpenStreetMap &mdash; gratis, tanpa token</span>
        <span className="font-mono text-xs">L1 &bull; White Belt</span>
      </div>
    </>
  );
}
