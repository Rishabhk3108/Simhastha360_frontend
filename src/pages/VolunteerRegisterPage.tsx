import { useState, type FormEvent } from "react";
import { api } from "../api/client";

const SKILL_OPTIONS = ["first aid", "crowd management", "translation", "sanitation", "general support"];

export function VolunteerRegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [cityState, setCityState] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(skill: string) {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/volunteers/apply", {
        name,
        phone,
        password,
        age: age ? parseInt(age, 10) : undefined,
        city_state: cityState || undefined,
        skills,
        availability_dates: availability || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Something went wrong. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="centered-page">
        <div className="card auth-card">
          <h1>Application received</h1>
          <p>Status: <strong>Pending Review</strong></p>
          <p className="muted">
            An admin will review your application. Once approved, sign in through the Simhastha 360 mobile app with your
            phone number to start receiving tasks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="centered-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Volunteer Registration</h1>
        <p className="muted">Simhastha 360 — help pilgrims, get matched to tasks that fit your skills.</p>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          Password (for app login once approved)
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label>
          Age
          <input value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        <label>
          City / State
          <input value={cityState} onChange={(e) => setCityState(e.target.value)} />
        </label>
        <fieldset>
          <legend>Skills</legend>
          {SKILL_OPTIONS.map((skill) => (
            <label key={skill} className="checkbox-label">
              <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} />
              {skill}
            </label>
          ))}
        </fieldset>
        <label>
          Availability (dates/shift)
          <input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Apr 10-15, morning shift" />
        </label>

        {error && <p className="error-text">{error}</p>}
        <button type="submit">Submit application</button>
      </form>
    </div>
  );
}
