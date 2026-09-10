export type CrowdLevel = "green" | "yellow" | "red";
export type FacilityType = "medical" | "toilet" | "water" | "help_desk" | "parking";
export type VolunteerStatus = "pending" | "approved" | "rejected";
export type TaskStatus = "unassigned" | "assigned" | "acknowledged" | "review" | "complete";
export type TaskPriority = "low" | "medium" | "high";
export type VehicleType = "two_wheeler" | "three_wheeler" | "four_wheeler" | "six_wheeler";
export type UserRole = "admin" | "volunteer_manager" | "volunteer" | "field_team";

export interface ParkingZone {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  capacity_two_wheeler: number;
  capacity_three_wheeler: number;
  capacity_four_wheeler: number;
  capacity_six_wheeler: number;
  occupied_two_wheeler: number;
  occupied_three_wheeler: number;
  occupied_four_wheeler: number;
  occupied_six_wheeler: number;
  updated_at: string;
}

export interface Zone {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
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

export interface AvailabilitySlot {
  date: string;
  start_time: string;
  end_time: string;
}

export interface VolunteerOut {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  email: string | null;
  city_state: string | null;
  permanent_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  id_proof_type: string | null;
  id_number: string | null;
  id_proof_front_doc_id: string | null;
  id_proof_back_doc_id: string | null;
  photo_doc_id: string | null;
  skills: string;
  languages: string;
  availability_slots: AvailabilitySlot[];
  prior_experience: string | null;
  tshirt_size: string | null;
  organization_affiliation: string | null;
  medical_conditions: string | null;
  no_criminal_record: boolean;
  code_of_conduct_accepted: boolean;
  media_consent: boolean;
  status: VolunteerStatus;
  review_note: string | null;
  rating: number | null;
  on_duty: boolean;
  preferred_zone_id: number | null;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  created_at: string;
}

export interface Task {
  id: number;
  description: string;
  zone_id: number | null;
  lat: number | null;
  lng: number | null;
  points: number;
  priority: TaskPriority;
  status: TaskStatus;
  assignee_id: number | null;
  ack_deadline_minutes: number;
  completion_photo_doc_ids: string[];
  review_note: string | null;
  created_at: string;
  acknowledged_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
}

export interface TaskSuggestion {
  user_id: number;
  name: string;
  score: number;
  reasons: string[];
}

export type IssueReportStatus = "new" | "task_created" | "dismissed";

export interface IssueReport {
  id: number;
  device_id: string;
  description: string | null;
  photo_doc_ids: string[];
  lat: number | null;
  lng: number | null;
  status: IssueReportStatus;
  task_id: number | null;
  created_at: string;
}

export interface RouteResult {
  coordinates: { lat: number; lng: number }[];
  distance_km: number;
  duration_min: number;
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
