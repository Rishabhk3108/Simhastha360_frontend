export type CrowdLevel = "green" | "yellow" | "red";
export type FacilityType = "medical" | "toilet" | "water" | "help_desk" | "parking";
export type VolunteerStatus = "pending" | "approved" | "rejected";
export type TaskStatus = "unassigned" | "acknowledged" | "in_progress" | "complete";
export type TaskPriority = "low" | "medium" | "high";

export interface Zone {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  crowd_level: CrowdLevel;
  updated_at: string;
}

export interface Facility {
  id: number;
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
  zone_id: number | null;
  status: string;
  created_at: string;
}

export interface VolunteerOut {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  skills: string;
  status: VolunteerStatus;
  on_duty: boolean;
  preferred_zone_id: number | null;
  created_at: string;
}

export interface Task {
  id: number;
  description: string;
  zone_id: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignee_id: number | null;
  ack_deadline_minutes: number;
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
}

export interface TaskSuggestion {
  user_id: number;
  name: string;
  score: number;
  reasons: string[];
}

export interface FieldTeamMember {
  id: number;
  name: string;
  phone: string;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
}

export interface SOSAlert {
  id: number;
  device_id: string;
  lat: number;
  lng: number;
  status: string;
  assigned_responder_id: number | null;
  created_at: string;
}

export interface LostPersonReport {
  id: number;
  subject_name: string;
  subject_age: number | null;
  status: string;
  created_at: string;
}

export interface CrowdReport {
  id: number;
  zone_id: number;
  type: string;
  facility_id: number | null;
  created_at: string;
}

export interface PredictiveAlert {
  zone_id: number;
  zone_name: string;
  current_level: CrowdLevel;
  forecast_minutes: number;
  forecast_level: CrowdLevel;
  note: string;
}

export interface FacilitySuggestion {
  cluster_center_lat: number;
  cluster_center_lng: number;
  report_count: number;
  suggestion: string;
}

export interface PublicFamilyStatus {
  last_known_lat: number | null;
  last_known_lng: number | null;
  last_seen_at: string | null;
  zone_name: string | null;
  crowd_level: CrowdLevel | null;
}
