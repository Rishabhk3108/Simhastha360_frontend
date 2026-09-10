import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { mappls } from "mappls-web-maps";
import type { ParkingZone } from "../api/types";

export interface ParkingMapHandle {
  focusOn: (lat: number, lng: number) => void;
}

const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_KEY;
const MAP_CONTAINER_ID = "s360-parking-map";
const PARKING_RADIUS_M = 40;
const PARKING_COLOR = "#C76B8D";
const FULL_COLOR = "#A5352C";

const mapplsClassObject = new mappls();

// Shares the same "initialize() injects <script> tags unconditionally"
// caveat as ZonesMap.tsx, but this is a separate module-level singleton
// promise since Vite doesn't dedupe module instances across component
// files; calling mapplsClassObject.initialize() again here would otherwise
// re-inject the SDK a second time if both pages mount independently.
let sdkReady: Promise<void> | null = null;
function loadMapplsSdk(): Promise<void> {
  if (!sdkReady) {
    sdkReady = new Promise((resolve) => {
      mapplsClassObject.initialize(MAPPLS_KEY, { map: true }, () => resolve());
    });
  }
  return sdkReady;
}

function totalCapacity(z: ParkingZone): number {
  return z.capacity_two_wheeler + z.capacity_three_wheeler + z.capacity_four_wheeler + z.capacity_six_wheeler;
}
function totalOccupied(z: ParkingZone): number {
  return z.occupied_two_wheeler + z.occupied_three_wheeler + z.occupied_four_wheeler + z.occupied_six_wheeler;
}

interface Props {
  parkingZones: ParkingZone[];
  initialCenter: { lat: number; lng: number };
  pickMode: boolean;
  pendingCenter: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}

export const ParkingMap = forwardRef<ParkingMapHandle, Props>(function ParkingMap(
  { parkingZones, initialCenter, pickMode, pendingCenter, onMapClick },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);
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

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    circlesRef.current.forEach((circle) => mapplsClassObject.removeLayer({ map: mapRef.current, layer: circle }));
    circlesRef.current = parkingZones.map((z) => {
      const full = totalOccupied(z) >= totalCapacity(z) && totalCapacity(z) > 0;
      return mapplsClassObject.Circle({
        map: mapRef.current,
        center: { lat: z.center_lat, lng: z.center_lng },
        radius: PARKING_RADIUS_M,
        fillColor: full ? FULL_COLOR : PARKING_COLOR,
        fillOpacity: 0.55,
        strokeColor: full ? FULL_COLOR : PARKING_COLOR,
        strokeWeight: 2,
        text: "P",
        "text-color": "#FFFDF8",
        "text-size": "14px",
      });
    });
  }, [parkingZones, mapReady]);

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
        radius: PARKING_RADIUS_M,
        fillColor: "#D9762B",
        fillOpacity: 0.6,
        strokeColor: "#1B2140",
        strokeWeight: 2,
        text: "P",
        "text-color": "#FFFDF8",
        "text-size": "14px",
      });
    }
  }, [pendingCenter, mapReady]);

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
          Click the map to place the parking spot
        </div>
      )}
    </div>
  );
});
