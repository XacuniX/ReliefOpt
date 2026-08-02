import { useState } from "react";
import { Button, Input, Select, Textarea, Progress, Toast, Badge } from "../ui";

const districts = [
  "Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet", "Barishal",
  "Rangpur", "Mymensingh", "Cumilla", "Noakhali", "Feni", "Bogra",
  "Jessore", "Dinajpur", "Tangail", "Faridpur", "Pabna", "Kushtia",
];

const incidentTypes = ["Flood", "Cyclone", "Earthquake", "Fire", "Other"];

export default function ReportForm({ onSubmit }) {
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    district: "",
    coordinates: "23.8103, 90.4125",
    landmark: "",
    type: "",
    severity: 3,
    description: "",
    affectedCount: "",
    childrenPresent: false,
    elderlyPresent: false,
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    const report = {
      id: `voice-${Date.now()}`,
      type: form.type,
      location: form.district,
      severity: form.severity,
      status: "Pending",
      submittedBy: "Voice Report",
      time: new Date().toISOString(),
      description: form.description,
      affectedCount: Number(form.affectedCount) || 0,
      urgencyScore: Math.min(100, form.severity * 20 + (form.childrenPresent ? 10 : 0) + (form.elderlyPresent ? 10 : 0)),
      childrenPresent: form.childrenPresent,
      elderlyPresent: form.elderlyPresent,
    };
    onSubmit?.(report);
    setToast({ type: "success", message: "Report submitted successfully!" });
    setForm({
      district: "",
      coordinates: "23.8103, 90.4125",
      landmark: "",
      type: "",
      severity: 3,
      description: "",
      affectedCount: "",
      childrenPresent: false,
      elderlyPresent: false,
    });
    setStep(1);
    setTimeout(() => setToast(null), 3000);
  }

  function getSeverityColor() {
    if (form.severity <= 2) return "#16a34a";
    if (form.severity <= 3) return "#d97706";
    return "#dc2626";
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Step {step} of 3 — {step === 1 ? "Location" : step === 2 ? "Incident Details" : "Review & Submit"}
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Select
            label="District"
            value={form.district}
            onChange={(e) => updateField("district", e.target.value)}
            options={[
              { value: "", label: "Select district..." },
              ...districts.map((d) => ({ value: d, label: d })),
            ]}
          />
          <Input
            label="GPS Coordinates"
            value={form.coordinates}
            onChange={(e) => updateField("coordinates", e.target.value)}
            placeholder="lat, lng"
          />
          <Input
            label="Landmark"
            value={form.landmark}
            onChange={(e) => updateField("landmark", e.target.value)}
            placeholder="e.g., Near Companiganj Bazar"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => setStep(2)} disabled={!form.district}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Select
            label="Incident Type"
            value={form.type}
            onChange={(e) => updateField("type", e.target.value)}
            options={[
              { value: "", label: "Select type..." },
              ...incidentTypes.map((t) => ({ value: t, label: t })),
            ]}
          />
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-foreground mb-1">
              <span>Severity</span>
              <Badge color={form.severity <= 2 ? "green" : form.severity <= 3 ? "amber" : "red"} text={String(form.severity)} />
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={form.severity}
              onChange={(e) => updateField("severity", Number(e.target.value))}
              className="w-full"
              style={{ accentColor: getSeverityColor() }}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Low</span>
              <span>Medium</span>
              <span>Critical</span>
            </div>
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the incident..."
            rows={4}
          />
          <Input
            label="Affected People Count"
            type="number"
            value={form.affectedCount}
            onChange={(e) => updateField("affectedCount", e.target.value)}
            placeholder="0"
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.childrenPresent}
                onChange={(e) => updateField("childrenPresent", e.target.checked)}
                className="rounded accent-primary"
              />
              Children present
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.elderlyPresent}
                onChange={(e) => updateField("elderlyPresent", e.target.checked)}
                className="rounded accent-primary"
              />
              Elderly present
            </label>
          </div>
          <div className="flex justify-between gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!form.type}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Review Your Report</h3>
          <div className="bg-muted rounded-lg p-4 space-y-2">
            {[
              ["District", form.district],
              ["GPS Coordinates", form.coordinates],
              ["Landmark", form.landmark || "—"],
              ["Incident Type", form.type],
              ["Severity", `${form.severity}/5`],
              ["Description", form.description || "—"],
              ["Affected People", form.affectedCount || "—"],
              ["Children Present", form.childrenPresent ? "Yes" : "No"],
              ["Elderly Present", form.elderlyPresent ? "Yes" : "No"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm border-b border-border pb-1 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleSubmit}>Submit Report</Button>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
