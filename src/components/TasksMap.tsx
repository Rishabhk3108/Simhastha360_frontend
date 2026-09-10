import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { mappls } from "mappls-web-maps";

export interface TasksMapHandle {
  focusOn: (lat: number, lng: number) => void;
}

const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_KEY;
const MAP_CONTAINER_ID = "s360-tasks-map";
const POINT_RADIUS_M = 35;
const TASK_COLOR = "#D9762B";
const VOLUNTEER_COLOR = "#3E7CB1";
const ROUTE_COLOR = "#1B2140";

const mapplsClassObject = new mappls();

// Same singleton-per-module pattern as ZonesMap/ParkingMap - initialize()
// injects <script> tags unconditionally, so each map component needs its
// own cached load promise to avoid re-injecting the SDK.
let sdkReady: Promise<void> | null = null;
function loadMapplsSdk(): Promise<void> {
  if (!sdkReady) {
    sdkReady = new Promise((resolve) => {
      mapplsClassObject.initialize(MAPPLS_KEY, { map: true }, () => resolve());
    });
  }
  return sdkReady;
}

export interface TaskPoint {
  id: number | string;
  lat: number;
  lng: number;
  label: string;
}

interface Props {
  taskPoints: TaskPoint[];
  volunteerPoints: TaskPoint[];
  routeCoordinates?: { lat: number; lng: number }[];
  initialCenter: { lat: number; lng: number };
  pickMode: boolean;
  pendingCenter: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}

export const TasksMap = forwardRef<TasksMapHandle, Props>(function TasksMap(
  { taskPoints, volunteerPoints, routeCoordinates, initialCenter, pickMode, pendingCenter, onMapClick },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const taskCirclesRef = useRef<any[]>([]);
  const volunteerCirclesRef = useRef<any[]>([]);
  const pendingCircleRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
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
    taskCirclesRef.current.forEach((c) => mapplsClassObject.removeLayer({ map: mapRef.current, layer: c }));
    taskCirclesRef.current = taskPoints.map((p) =>
      mapplsClassObject.Circle({
        map: mapRef.current,
        center: { lat: p.lat, lng: p.lng },
        radius: POINT_RADIUS_M,
        fillColor: TASK_COLOR,
        fillOpacity: 0.65,
        strokeColor: TASK_COLOR,
        strokeWeight: 2,
        text: "T",
        "text-color": "#FFFDF8",
        "text-size": "13px",
      }),
    );
  }, [taskPoints, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    volunteerCirclesRef.current.forEach((c) => mapplsClassObject.removeLayer({ map: mapRef.current, layer: c }));
    volunteerCirclesRef.current = volunteerPoints.map((p) =>
      mapplsClassObject.Circle({
        map: mapRef.current,
        center: { lat: p.lat, lng: p.lng },
        radius: POINT_RADIUS_M,
        fillColor: VOLUNTEER_COLOR,
        fillOpacity: 0.65,
        strokeColor: VOLUNTEER_COLOR,
        strokeWeight: 2,
        text: "V",
        "text-color": "#FFFDF8",
        "text-size": "13px",
      }),
    );
  }, [volunteerPoints, mapReady]);

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
        radius: POINT_RADIUS_M,
        fillColor: "#C25046",
        fillOpacity: 0.7,
        strokeColor: "#1B2140",
        strokeWeight: 2,
        text: "T",
        "text-color": "#FFFDF8",
        "text-size": "13px",
      });
    }
  }, [pendingCenter, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (routeLineRef.current) {
      mapplsClassObject.removeLayer({ map: mapRef.current, layer: routeLineRef.current });
      routeLineRef.current = null;
    }
    if (routeCoordinates && routeCoordinates.length > 1) {
      routeLineRef.current = mapplsClassObject.Polyline({
        map: mapRef.current,
        path: routeCoordinates.map((c) => ({ lat: c.lat, lng: c.lng })),
        strokeColor: ROUTE_COLOR,
        strokeWeight: 4,
        strokeOpacity: 0.85,
      });
    }
  }, [routeCoordinates, mapReady]);

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
          Click the map to place the task location
        </div>
      )}
    </div>
  );
});
