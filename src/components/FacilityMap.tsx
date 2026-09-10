import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { mappls } from "mappls-web-maps";
import type { Facility, FacilityType } from "../api/types";

export interface FacilityMapHandle {
  focusOn: (lat: number, lng: number) => void;
}

const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_KEY;
const MAP_CONTAINER_ID = "s360-facility-map";
const POINT_RADIUS_M = 30;

const FACILITY_STYLE: Record<FacilityType, { color: string; letter: string }> = {
  medical: { color: "#2E7A73", letter: "M" },
  toilet: { color: "#5C6178", letter: "T" },
  water: { color: "#3E7CB1", letter: "W" },
  help_desk: { color: "#A9722C", letter: "H" },
  parking: { color: "#C76B8D", letter: "P" },
};

const mapplsClassObject = new mappls();

// Same singleton-per-module SDK-load pattern as ZonesMap/ParkingMap/TasksMap.
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
  facilities: Facility[];
  initialCenter: { lat: number; lng: number };
  pickMode: boolean;
  pendingCenter: { lat: number; lng: number } | null;
  pendingType: FacilityType;
  onMapClick: (lat: number, lng: number) => void;
}

export const FacilityMap = forwardRef<FacilityMapHandle, Props>(function FacilityMap(
  { facilities, initialCenter, pickMode, pendingCenter, pendingType, onMapClick },
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
    circlesRef.current.forEach((c) => mapplsClassObject.removeLayer({ map: mapRef.current, layer: c }));
    circlesRef.current = facilities.map((f) => {
      const style = FACILITY_STYLE[f.type];
      return mapplsClassObject.Circle({
        map: mapRef.current,
        center: { lat: f.lat, lng: f.lng },
        radius: POINT_RADIUS_M,
        fillColor: style.color,
        fillOpacity: 0.65,
        strokeColor: style.color,
        strokeWeight: 2,
        text: style.letter,
        "text-color": "#FFFDF8",
        "text-size": "12px",
      });
    });
  }, [facilities, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (pendingCircleRef.current) {
      mapplsClassObject.removeLayer({ map: mapRef.current, layer: pendingCircleRef.current });
      pendingCircleRef.current = null;
    }
    if (pendingCenter) {
      const style = FACILITY_STYLE[pendingType];
      pendingCircleRef.current = mapplsClassObject.Circle({
        map: mapRef.current,
        center: pendingCenter,
        radius: POINT_RADIUS_M,
        fillColor: style.color,
        fillOpacity: 0.9,
        strokeColor: "#1B2140",
        strokeWeight: 2,
        text: style.letter,
        "text-color": "#FFFDF8",
        "text-size": "12px",
      });
    }
  }, [pendingCenter, pendingType, mapReady]);

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
          Click the map to place the facility
        </div>
      )}
    </div>
  );
});
