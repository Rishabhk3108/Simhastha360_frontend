import type { TaskStatus } from "../api/types";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  acknowledged: "In progress",
  review: "In review",
  complete: "Completed",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  unassigned: "var(--muted)",
  assigned: "var(--saffron-deep)",
  acknowledged: "var(--teal)",
  review: "var(--brass)",
  complete: "var(--green)",
};
