import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { FacilityMap, type FacilityMapHandle } from "../../components/FacilityMap";
import type { Facility, FacilityType, Zone } from "../../api/types";

const FACILITY_TYPES: FacilityType[] = ["medical", "toilet", "water", "help_desk", "parking"];
const UJJAIN_CENTER = { lat: 23.1765, lng: 75.7885 };

export function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("medical");
  const [zoneId, setZoneId] = useState("");
  const [pendingCenter, setPendingCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [creating, setCreating] = useState(false);
  const mapRef = useRef<FacilityMapHandle>(null);

  async function load() {
    const [facRes, zoneRes] = await Promise.all([api.get<Facility[]>("/facilities"), api.get<Zone[]>("/zones")]);
    setFacilities(facRes.data);
    setZones(zoneRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!pendingCenter) return;
    setCreating(true);
    try {
      await api.post("/facilities", {
        name,
        type,
        lat: pendingCenter.lat,
        lng: pendingCenter.lng,
        zone_id: zoneId ? parseInt(zoneId, 10) : null,
      });
      setName("");
      setZoneId("");
      setPendingCenter(null);
      setPickingLocation(false);
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(id: number) {
    await api.delete(`/facilities/${id}`);
    load();
  }

  return (
    <div>
      <h1>Facilities</h1>

      <section className="card">
        <h2>Add facility</h2>
        <form className="inline-form" onSubmit={handleCreate} style={{ flexWrap: "wrap" }}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <select value={type} onChange={(e) => setType(e.target.value as FacilityType)}>
            {FACILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">No zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <button type="button" className="secondary" onClick={() => setPickingLocation((p) => !p)}>
            {pickingLocation ? "Stop picking" : pendingCenter ? "Change location" : "Pick location on map"}
          </button>
          <button type="submit" disabled={!pendingCenter || creating}>
            {creating && <span className="button-spinner" />}
            Add
          </button>
          {pendingCenter && (
            <span className="muted small" style={{ width: "100%" }}>
              Location: {pendingCenter.lat.toFixed(4)}, {pendingCenter.lng.toFixed(4)}
            </span>
          )}
        </form>
      </section>

      <section className="card">
        <h2>Facility map</h2>
        <FacilityMap
          ref={mapRef}
          facilities={facilities}
          initialCenter={UJJAIN_CENTER}
          pickMode={pickingLocation}
          pendingCenter={pendingCenter}
          pendingType={type}
          onMapClick={(lat, lng) => setPendingCenter({ lat, lng })}
        />
      </section>

      <section className="card">
        <h2>All facilities</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Location</th>
              <th>Zone</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.type.replace("_", " ")}</td>
                <td>
                  {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
                </td>
                <td>{zones.find((z) => z.id === f.zone_id)?.name ?? "—"}</td>
                <td>{f.status}</td>
                <td>
                  <button className="secondary" onClick={() => handleRemove(f.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {facilities.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No facilities yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
