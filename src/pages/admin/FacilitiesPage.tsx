import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import type { Facility, FacilityType, Zone } from "../../api/types";

const FACILITY_TYPES: FacilityType[] = ["medical", "toilet", "water", "help_desk", "parking"];

export function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("medical");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [zoneId, setZoneId] = useState("");

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
    await api.post("/facilities", {
      name,
      type,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      zone_id: zoneId ? parseInt(zoneId, 10) : null,
    });
    setName("");
    setLat("");
    setLng("");
    setZoneId("");
    load();
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
        <form className="inline-form" onSubmit={handleCreate}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <select value={type} onChange={(e) => setType(e.target.value as FacilityType)}>
            {FACILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
          <input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} required />
          <input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} required />
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">No zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <button type="submit">Add</button>
        </form>
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
