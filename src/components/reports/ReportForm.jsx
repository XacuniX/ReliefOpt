import { useEffect, useState } from "react";
import { Button, Input, Select, Textarea, Toast, Badge } from "../ui";
import { calculateUrgency } from "../../lib/urgency";
import { useAuth } from "../../context/AuthContext";
import { getAll, put, remove } from "../../lib/db";
import { districtNames } from "../../lib/districts";
import { disasterTypes } from "../../lib/disasters";

function toNullableNumber(value) {
  return value === "" ? null : Number(value);
}

function numericValidationError(form) {
  const values = [
    ["Affected people count", form.affectedCount, true],
    ["Days without food", form.daysWithoutFood, true],
    ["Water level", form.waterLevelFt, false],
    ["Distance from aid", form.distanceFromAidKm, false],
  ];
  for (const [label, value, integer] of values) {
    if (value === "") continue;
    const number = Number(value);
    if (
      !Number.isFinite(number) ||
      number < 0 ||
      (integer && !Number.isInteger(number))
    ) {
      return `${label} must be a non-negative${integer ? " whole" : ""} number.`;
    }
  }
  return "";
}

export default function ReportForm({ onSubmit }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const [form, setForm] = useState({
    district: "",
    landmark: "",
    type: "",
    severity: 3,
    description: "",
    affectedCount: "",
    daysWithoutFood: "",
    waterLevelFt: "",
    distanceFromAidKm: "",
    childrenPresent: false,
    elderlyPresent: false,
  });

  useEffect(() => {
    let cancelled = false;
    getAll("drafts")
      .then((drafts) => {
        const draft = drafts.find((entry) => entry.id === "report-form");
        if (!cancelled && draft?.form) {
          setForm(draft.form);
          setStep(draft.step || 1);
        }
      })
      .finally(() => {
        if (!cancelled) setDraftReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    void put("drafts", {
      id: "report-form",
      form,
      step,
      updatedAt: new Date().toISOString(),
    });
  }, [draftReady, form, step]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setValidationError("");
  }

  function handleReview() {
    if (!form.landmark.trim()) {
      setValidationError("A location or landmark is required.");
      return;
    }
    const error = numericValidationError(form);
    if (error) {
      setValidationError(error);
      return;
    }
    setStep(3);
  }

  async function handleSubmit() {
    if (!form.landmark.trim()) {
      setValidationError("A location or landmark is required.");
      return;
    }
    const error = numericValidationError(form);
    if (error) {
      setValidationError(error);
      return;
    }

    const peopleCount = toNullableNumber(form.affectedCount);
    const daysWithoutFood = toNullableNumber(form.daysWithoutFood);
    const waterLevelFt = toNullableNumber(form.waterLevelFt);
    const distanceFromAidKm = toNullableNumber(form.distanceFromAidKm);
    const urgency = calculateUrgency({
      daysWithoutFood,
      waterLevelFt,
      peopleCount,
      childrenPresent: form.childrenPresent,
      elderlyPresent: form.elderlyPresent,
      distanceFromAidKm,
    });

    const report = {
      id: crypto.randomUUID(),
      type: form.type,
      district: form.district,
      location: null,
      locationName: form.landmark.trim(),
      severity: form.severity,
      status: "Pending",
      submittedById: currentUser?.id,
      submittedBy: currentUser?.name || "Unknown",
      time: new Date().toISOString(),
      description: form.description,
      affectedCount: peopleCount ?? 0,
      peopleCount,
      daysWithoutFood,
      waterLevelFt,
      distanceFromAidKm,
      urgencyScore: urgency.score,
      urgencyZone: urgency.zone,
      urgencyFactors: urgency.factors,
      childrenPresent: form.childrenPresent,
      elderlyPresent: form.elderlyPresent,
    };
    setSubmitting(true);
    try {
      const result = await onSubmit?.(report);
      setToast({
        type: result?.status === "Accepted" ? "success" : "info",
        message:
          result?.status === "Accepted"
            ? "Report committed to Central Command."
            : "Report saved and is pending Central Admin approval.",
      });
      await remove("drafts", "report-form");
      setForm({
        district: "",
        landmark: "",
        type: "",
        severity: 3,
        description: "",
        affectedCount: "",
        daysWithoutFood: "",
        waterLevelFt: "",
        distanceFromAidKm: "",
        childrenPresent: false,
        elderlyPresent: false,
      });
      setStep(1);
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast({
        type: "error",
        message: error.message || "Report submission failed.",
      });
    } finally {
      setSubmitting(false);
    }
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
          Step {step} of 3 -{" "}
          {step === 1
            ? "Location"
            : step === 2
              ? "Incident Details"
              : "Review & Submit"}
        </p>
      </div>

      {validationError && (
        <p role="alert" className="text-sm text-red-600">
          {validationError}
        </p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Select
            label="District"
            value={form.district}
            onChange={(e) => updateField("district", e.target.value)}
            options={[
              { value: "", label: "Select district..." },
              ...districtNames.map((d) => ({ value: d, label: d })),
            ]}
          />
          <Input
            label="Exact Location / Landmark"
            value={form.landmark}
            onChange={(e) => updateField("landmark", e.target.value)}
            placeholder="e.g., Companiganj Bazar, Islampur Road"
            required
          />
          <p className="-mt-2 text-xs text-muted-foreground">
            Coordinates are resolved from OpenStreetMap after submission. Include a road, village, or landmark for the most accurate pin.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => setStep(2)} disabled={!form.district || !form.landmark.trim()}>
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
              ...disasterTypes.map((t) => ({ value: t, label: t })),
            ]}
          />
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-foreground mb-1">
              <span>Severity</span>
              <Badge
                color={
                  form.severity <= 2
                    ? "green"
                    : form.severity <= 3
                      ? "amber"
                      : "red"
                }
                text={String(form.severity)}
              />
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
            min="0"
            value={form.affectedCount}
            onChange={(e) => updateField("affectedCount", e.target.value)}
            placeholder="0"
          />
          <Input
            label="Days without food"
            type="number"
            min="0"
            value={form.daysWithoutFood}
            onChange={(e) => updateField("daysWithoutFood", e.target.value)}
            placeholder="Unknown"
          />
          <Input
            label="Water level (ft)"
            type="number"
            min="0"
            step="any"
            value={form.waterLevelFt}
            onChange={(e) => updateField("waterLevelFt", e.target.value)}
            placeholder="Unknown"
          />
          <Input
            label="Distance from aid (km)"
            type="number"
            min="0"
            step="any"
            value={form.distanceFromAidKm}
            onChange={(e) => updateField("distanceFromAidKm", e.target.value)}
            placeholder="Unknown"
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.childrenPresent}
                onChange={(e) =>
                  updateField("childrenPresent", e.target.checked)
                }
                className="rounded accent-primary"
              />
              Children present
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.elderlyPresent}
                onChange={(e) =>
                  updateField("elderlyPresent", e.target.checked)
                }
                className="rounded accent-primary"
              />
              Elderly present
            </label>
          </div>
          <div className="flex justify-between gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={handleReview} disabled={!form.type}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">
            Review Your Report
          </h3>
          <div className="bg-muted rounded-lg p-4 space-y-2">
            {[
              ["District", form.district],
              ["Exact Location", form.landmark],
              ["Incident Type", form.type],
              ["Severity", `${form.severity}/5`],
              ["Description", form.description || "Not provided"],
              ["Affected People", form.affectedCount || "Not provided"],
              ["Children Present", form.childrenPresent ? "Yes" : "No"],
              ["Elderly Present", form.elderlyPresent ? "Yes" : "No"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between text-sm border-b border-border pb-1 last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={Boolean(numericValidationError(form))}
            >
              Submit Report
            </Button>
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
