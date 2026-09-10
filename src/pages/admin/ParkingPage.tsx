import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { ParkingMap, type ParkingMapHandle } from "../../components/ParkingMap";
import type { ParkingZone } from "../../api/types";

const UJJAIN_CENTER = { lat: 23.1765, lng: 75.7885 };

interface ParkingDraft {
  editingId: number | null;
  name: string;
  center: { lat: number; lng: number } | null;
  capacityTwo: number;
  capacityThree: number;
  capacityFour: number;
  capacitySix: number;
}

const EMPTY_DRAFT: ParkingDraft = {
  editingId: null,
  name: "",
  center: null,
  capacityTwo: 20,
  capacityThree: 5,
  capacityFour: 10,
  capacitySix: 2,
};

function totalCapacity(z: ParkingZone): number {
  return z.capacity_two_wheeler + z.capacity_three_wheeler + z.capacity_four_wheeler + z.capacity_six_wheeler;
}
function totalOccupied(z: ParkingZone): number {
  return z.occupied_two_wheeler + z.occupied_three_wheeler + z.occupied_four_wheeler + z.occupied_six_wheeler;
}

export function ParkingPage() {
  const [parkingZones, setParkingZones] = useState<ParkingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ParkingDraft | null>(null);
  const mapRef = useRef<ParkingMapHandle>(null);
  const mapCardRef = useRef<HTMLDivElement>(null);

  function viewSpot(zone: ParkingZone) {
    mapRef.current?.focusOn(zone.center_lat, zone.center_lng);
    mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadAll() {
    const { data } = await api.get<ParkingZone[]>("/parking");
    setParkingZones(data);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  function startAdd() {
    setDraft({ ...EMPTY_DRAFT });
  }

  function startEdit(z: ParkingZone) {
    setDraft({
      editingId: z.id,
      name: z.name,
      center: { lat: z.center_lat, lng: z.center_lng },
      capacityTwo: z.capacity_two_wheeler,
      capacityThree: z.capacity_three_wheeler,
      capacityFour: z.capacity_four_wheeler,
      capacitySix: z.capacity_six_wheeler,
    });
  }

  async function deleteZone(id: number) {
    if (!window.confirm("Remove this parking spot? Pilgrims will stop seeing it, and Sinhastha Saarthi will stop routing here.")) return;
    await api.delete(`/parking/${id}`);
    loadAll();
  }

  async function saveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft || !draft.center) return;
    const payload = {
      name: draft.name,
      center_lat: draft.center.lat,
      center_lng: draft.center.lng,
      capacity_two_wheeler: draft.capacityTwo,
      capacity_three_wheeler: draft.capacityThree,
      capacity_four_wheeler: draft.capacityFour,
      capacity_six_wheeler: draft.capacitySix,
    };
    if (draft.editingId) {
      await api.patch(`/parking/${draft.editingId}`, payload);
    } else {
      await api.post("/parking", payload);
    }
    setDraft(null);
    loadAll();
  }

  if (loading) return <p>Loading parking zones...</p>;

  const totalSlots = parkingZones.reduce((sum, z) => sum + totalCapacity(z), 0);
  const totalUsed = parkingZones.reduce((sum, z) => sum + totalOccupied(z), 0);

  return (
    <div>
      <h1>Sinhastha Saarthi · Parking</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        Mark parking spots so pilgrims can see them on the map, and so the app can route vehicles to the nearest one with room.
      </p>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Parking spots</div>
          <div className="stat-value">{parkingZones.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total capacity</div>
          <div className="stat-value">{totalSlots}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Occupied</div>
          <div className="stat-value" style={{ color: totalUsed >= totalSlots && totalSlots > 0 ? "var(--red-deep)" : "var(--ink)" }}>
            {totalUsed} / {totalSlots}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }} ref={mapCardRef}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Parking map</h2>
          {!draft && (
            <button type="button" onClick={startAdd}>
              + Mark a parking spot
            </button>
          )}
        </div>

        <ParkingMap
          ref={mapRef}
          parkingZones={parkingZones}
          initialCenter={UJJAIN_CENTER}
          pickMode={draft !== null}
          pendingCenter={draft?.center ?? null}
          onMapClick={(lat, lng) => setDraft((d) => (d ? { ...d, center: { lat, lng } } : d))}
        />

        {draft && (
          <form className="inline-form" onSubmit={saveDraft} style={{ marginTop: 16, flexWrap: "wrap" }}>
            <input
              placeholder="Parking name (e.g. Ram Ghat Parking)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
              style={{ flex: 1, minWidth: 200 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              2-wheeler
              <input
                type="number"
                min={0}
                value={draft.capacityTwo}
                onChange={(e) => setDraft({ ...draft, capacityTwo: parseInt(e.target.value, 10) || 0 })}
                style={{ width: 70 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              3-wheeler
              <input
                type="number"
                min={0}
                value={draft.capacityThree}
                onChange={(e) => setDraft({ ...draft, capacityThree: parseInt(e.target.value, 10) || 0 })}
                style={{ width: 70 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              4-wheeler
              <input
                type="number"
                min={0}
                value={draft.capacityFour}
                onChange={(e) => setDraft({ ...draft, capacityFour: parseInt(e.target.value, 10) || 0 })}
                style={{ width: 70 }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              6-wheeler
              <input
                type="number"
                min={0}
                value={draft.capacitySix}
                onChange={(e) => setDraft({ ...draft, capacitySix: parseInt(e.target.value, 10) || 0 })}
                style={{ width: 70 }}
              />
            </label>
            <button type="submit" disabled={!draft.center}>
              {draft.editingId ? "Save changes" : "Save parking spot"}
            </button>
            <button type="button" className="secondary" onClick={() => setDraft(null)}>
              Cancel
            </button>
            {!draft.center && <span className="muted" style={{ width: "100%" }}>Click the map above to place the parking spot.</span>}
          </form>
        )}
      </div>

      <div className="card">
        <h2>Parking spots</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>2-wheeler</th>
              <th>3-wheeler</th>
              <th>4-wheeler</th>
              <th>6-wheeler</th>
              <th>View</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {parkingZones.map((z) => (
              <tr key={z.id}>
                <td>{z.name}</td>
                <td>{z.occupied_two_wheeler} / {z.capacity_two_wheeler}</td>
                <td>{z.occupied_three_wheeler} / {z.capacity_three_wheeler}</td>
                <td>{z.occupied_four_wheeler} / {z.capacity_four_wheeler}</td>
                <td>{z.occupied_six_wheeler} / {z.capacity_six_wheeler}</td>
                <td>
                  <button type="button" className="secondary" onClick={() => viewSpot(z)}>
                    View
                  </button>
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="secondary" onClick={() => startEdit(z)}>
                    Edit
                  </button>
                  <button type="button" className="secondary" onClick={() => deleteZone(z.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {parkingZones.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No parking spots yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
