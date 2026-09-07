import type { CrowdLevel } from "../api/types";

export function CrowdBadge({ level }: { level: CrowdLevel }) {
  return <span className={`crowd-badge crowd-${level}`}>{level}</span>;
}
