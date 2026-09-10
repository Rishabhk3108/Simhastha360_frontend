interface CctvFeed {
  name: string;
  area: string;
  occupancy: "High" | "Medium" | "Low";
}

// Demo data only - stand-ins for the real camera feeds that would sit at
// these ghats/landmarks during Simhastha. No live video or backend call
// here; this panel exists so an admin has a visual prompt for judging crowd
// severity before marking a zone on the map below.
const DEMO_FEEDS: CctvFeed[] = [
  { name: "Ram Ghat Cam 1", area: "Ram Ghat, main bathing steps", occupancy: "High" },
  { name: "Mahakaleshwar Cam 2", area: "Mahakaleshwar Temple, entry gate", occupancy: "High" },
  { name: "Dutt Akhada Cam 1", area: "Dutt Akhada, riverside path", occupancy: "Medium" },
  { name: "Kshipra Bridge Cam 1", area: "Kshipra Bridge, pedestrian crossing", occupancy: "Medium" },
  { name: "Triveni Ghat Cam 1", area: "Triveni Ghat, parking approach", occupancy: "Low" },
  { name: "Chintaman Ganesh Cam 1", area: "Chintaman Ganesh Mandir, courtyard", occupancy: "Low" },
];

const OCCUPANCY_COLOR: Record<CctvFeed["occupancy"], string> = {
  High: "var(--red-deep)",
  Medium: "var(--yellow-deep)",
  Low: "var(--teal-deep)",
};

export function CctvPanel() {
  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <h2>CCTV feeds</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 16 }}>
        Demo feeds for illustration. Use these to judge crowd severity, then mark the area on the map below.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        {DEMO_FEEDS.map((feed) => (
          <div
            key={feed.name}
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                height: 100,
                background: "linear-gradient(135deg, var(--ink) 0%, var(--ink-soft) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <i className="ph ph-video-camera" style={{ fontSize: 28, color: "rgba(246,241,231,0.5)" }} />
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#E9B45C",
                  background: "rgba(0,0,0,0.35)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                Demo feed
              </span>
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{feed.name}</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                {feed.area}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, color: OCCUPANCY_COLOR[feed.occupancy], fontWeight: 600 }}>
                Estimated occupancy: {feed.occupancy}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-card">
        <div className="ai-card-label">
          <i className="ph-fill ph-sparkle" /> Roadmap
        </div>
        <p style={{ margin: 0 }}>
          Coming next: live location pings from the pilgrim app will be aggregated into a real crowd-density heatmap, automatically
          surfacing red/yellow hotspots here and notifying admins - replacing manual CCTV review with continuous, data-driven detection.
        </p>
      </div>
    </div>
  );
}
