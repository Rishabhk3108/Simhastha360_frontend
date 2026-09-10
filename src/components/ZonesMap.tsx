import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { mappls } from "mappls-web-maps";
import type { Zone } from "../api/types";

export interface ZonesMapHandle {
  focusOn: (lat: number, lng: number) => void;
}

const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_KEY;
const MAP_CONTAINER_ID = "s360-zones-map";

// Confirmed against the SDK's own bundled source (not just its docs): the
// bundle carries real earth-radius constants and a metersToPixel converter
// for this Circle component, so `radius` here is true ground meters and
// stays geographically accurate at any zoom - unlike the low-level
// CircleLayer style primitive (pixel-based) used on the native mobile map.
const ZONE_COLORS: Record<string, string> = { red: "#C25046", yellow: "#D9A339", green: "#4C8B5B" };

const mapplsClassObject = new mappls();

// initialize() injects <script> tags into <head> unconditionally on every
// call - caching the load as a singleton promise keeps remounts of this
// component (e.g. navigating admin pages and back) from re-injecting the
// SDK script and re-registering it multiple times.
let sdkReady: Promise<void> | null = null;
function loadMapplsSdk(): Promise<void> {
  if (!sdkReady) {
    sdkReady = new Promise((resolve) => {
      mapplsClassObject.initialize(MAPPLS_KEY, { map: true }, () => resolve());
    });
  }
  return sdkReady;
}

interface Props {
  zones: Zone[];
  initialCenter: { lat: number; lng: number };
  pickMode: boolean;
  pendingCenter: { lat: number; lng: number } | null;
  pendingRadiusM: number;
  pendingCrowdLevel: string;
  onMapClick: (lat: number, lng: number) => void;
}

export const ZonesMap = forwardRef<ZonesMapHandle, Props>(function ZonesMap(
  { zones, initialCenter, pickMode, pendingCenter, pendingRadiusM, pendingCrowdLevel, onMapClick },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const zoneCirclesRef = useRef<any[]>([]);
  const pendingCircleRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useImperativeHandle(ref, () => ({
    focusOn: (lat, lng) => {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 17 });
    },
  }));

  useEffect(() => {
    let cancelled = false;
    loadMapplsSdk().then(() => {
      if (cancelled || !containerRef.current) return;
      const map = mapplsClassObject.Map({
        id: MAP_CONTAINER_ID,
        properties: { center: [initialCenter.lat, initialCenter.lng], zoom: 13 },
      });
      map.on("load", () => {
        if (cancelled) return;
        mapRef.current = map;
        setMapReady(true);
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Existing zones, redrawn whenever the zone list changes.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    zoneCirclesRef.current.forEach((circle) => mapplsClassObject.removeLayer({ map: mapRef.current, layer: circle }));
    zoneCirclesRef.current = zones.map((z) =>
      mapplsClassObject.Circle({
        map: mapRef.current,
        center: { lat: z.center_lat, lng: z.center_lng },
        radius: z.radius_m,
        fillColor: ZONE_COLORS[z.crowd_level] ?? ZONE_COLORS.green,
        fillOpacity: 0.28,
        strokeColor: ZONE_COLORS[z.crowd_level] ?? ZONE_COLORS.green,
        strokeWeight: 2,
      }),
    );
  }, [zones, mapReady]);

  // Live preview circle while adding/editing a zone.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (pendingCircleRef.current) {
      mapplsClassObject.removeLayer({ map: mapRef.current, layer: pendingCircleRef.current });
      pendingCircleRef.current = null;
    }
    if (pendingCenter) {
      pendingCircleRef.current = mapplsClassObject.Circle({
        map: mapRef.current,
        center: pendingCenter,
        radius: pendingRadiusM,
        fillColor: ZONE_COLORS[pendingCrowdLevel] ?? ZONE_COLORS.green,
        fillOpacity: 0.4,
        strokeColor: "#1B2140",
        strokeWeight: 2,
      });
    }
  }, [pendingCenter, pendingRadiusM, pendingCrowdLevel, mapReady]);

  // Click-to-place a zone center while in pick mode.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const handleClick = (e: any) => {
      if (!pickMode || !e?.lngLat) return;
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    };
    map.on("click", handleClick);
    return () => {
      if (typeof map.off === "function") map.off("click", handleClick);
    };
  }, [pickMode, mapReady, onMapClick]);

  return (
    <div style={{ position: "relative" }}>
      <div id={MAP_CONTAINER_ID} ref={containerRef} style={{ width: "100%", height: 420, borderRadius: 20, overflow: "hidden" }} />
      {!mapReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-tint)",
            borderRadius: 20,
          }}
        >
          <span className="muted">Loading map…</span>
        </div>
      )}
      {pickMode && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            background: "var(--ink)",
            color: "var(--surface)",
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 12.5,
          }}
        >
          Click the map to place the zone center
        </div>
      )}
    </div>
  );
});
