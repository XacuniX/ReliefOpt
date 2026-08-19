import { useState, useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { Button, Textarea, Toast, Loader, Progress, Input, Select } from "../ui";
import Dialog from "../ui/Dialog";
import { cityCoords } from "../../mockData";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { loadModel, startRecording, transcribe } from "../../lib/speech";
import { extractFields } from "../../lib/extract";
import { calculateUrgency } from "../../lib/urgency";

export default function VoiceReportModal() {
  const { addReport, addMapPin } = useData();
  const { currentUser } = useAuth();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [language, setLanguage] = useState("bn");
  const [transcript, setTranscript] = useState("");
  const [typedText, setTypedText] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [edits, setEdits] = useState({});

  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const tickRef = useRef(null);

  const extracted = transcript ? extractFields(transcript) : null;

  // User overrides sit on top of the auto-extraction. Empty number inputs mean
  // null (not confirmed zero), so merge with ?? only when a value is present.
  const fields = {
    ...(extracted || {}),
    ...(edits.location !== undefined ? { location: edits.location } : {}),
    ...(edits.waterLevelFt !== undefined ? { waterLevelFt: edits.waterLevelFt } : {}),
    ...(edits.peopleCount !== undefined ? { peopleCount: edits.peopleCount } : {}),
    ...(edits.childrenPresent !== undefined ? { childrenPresent: edits.childrenPresent } : {}),
    ...(edits.elderlyPresent !== undefined ? { elderlyPresent: edits.elderlyPresent } : {}),
    ...(edits.daysWithoutFood !== undefined ? { daysWithoutFood: edits.daysWithoutFood } : {}),
  };

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(tickRef.current);
    };
  }, []);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function reset() {
    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);
    recorderRef.current = null;
    setStage("idle");
    setProgress(0);
    setElapsed(0);
    setTranscript("");
    setTypedText("");
    setError("");
    setEdits({});
  }

  async function beginRecording() {
    setStage("loading");
    setError("");
    try {
      await loadModel(({ progress: p }) => setProgress(p ?? 0));
      const recorder = await startRecording();
      recorderRef.current = recorder;
      setElapsed(0);
      setStage("recording");
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err) {
      setError(
        "Could not access the microphone. Make sure you're on localhost or https and grant mic permission — or type the report below instead."
      );
      setStage("error");
    }
  }

  async function stopRecording() {
    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);
    const recorder = recorderRef.current;
    if (!recorder) return;
    setStage("transcribing");
    try {
      const blob = await recorder.stop();
      const text = await transcribe(blob, language);
      finish(text);
    } catch (err) {
      setError("Speech recognition failed. Please try again, or type the report below instead.");
      setStage("error");
    }
  }

  function finish(text) {
    setTranscript(text);
    setTypedText("");
    setStage("done");
  }

  function handleSubmit() {
    if (!transcript.trim()) return;
    const coords = cityCoords[fields.location] || null;

    const urgency = calculateUrgency({
      daysWithoutFood: fields.daysWithoutFood,
      waterLevelFt: fields.waterLevelFt,
      peopleCount: fields.peopleCount,
      childrenPresent: fields.childrenPresent,
      elderlyPresent: fields.elderlyPresent,
    });

    const report = {
      id: `voice-${Date.now()}`,
      type: "Other",
      district: fields.location ?? "Unknown",
      location: coords ? { lat: coords[0], lng: coords[1] } : undefined,
      severity: 3,
      status: "Pending",
      submittedById: currentUser?.id,
      submittedBy: currentUser?.name || "Unknown",
      time: new Date().toISOString(),
      description: transcript,
      affectedCount: fields.peopleCount ?? 0,
      peopleCount: fields.peopleCount,
      daysWithoutFood: fields.daysWithoutFood,
      waterLevelFt: fields.waterLevelFt,
      urgencyScore: urgency.score,
      urgencyZone: urgency.zone,
      urgencyFactors: urgency.factors,
      childrenPresent: fields.childrenPresent,
      elderlyPresent: fields.elderlyPresent,
    };
    addReport(report);

    const pin = {
      id: crypto.randomUUID(),
      position: coords ?? [23.8103, 90.4125],
      location: fields.location ?? "Unknown",
      waterLevel:
        fields.waterLevelFt != null ? `${fields.waterLevelFt}ft` : "—",
      peopleCount:
        fields.peopleCount != null ? String(fields.peopleCount) : "—",
      childrenPresent: fields.childrenPresent ? "Yes" : "No",
    };
    addMapPin(pin);

    setOpen(false);
    reset();
    showToast("success", "Voice report submitted and pinned on the map!");
  }

  function handleClose() {
    clearTimeout(timerRef.current);
    clearInterval(tickRef.current);
    if (recorderRef.current) {
      recorderRef.current.stop().catch(() => {});
    }
    setOpen(false);
    reset();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-[1000] h-14 w-14 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-amber-600 transition-colors cursor-pointer"
        aria-label="Voice Report"
      >
        <Mic className="h-6 w-6" />
      </button>

      <Dialog
        isOpen={open}
        onClose={handleClose}
        title="Voice Report"
        persistent={["loading", "recording", "transcribing", "done"].includes(stage)}
      >
        <div className="space-y-4">
          {stage === "idle" && (
            <div className="text-center py-6 space-y-4">
              <p className="text-muted-foreground text-sm">
                Tap the mic button to start recording your voice report in
                Bangla or Banglish.
              </p>
              <div className="flex justify-center gap-2">
                {[
                  { value: "bn", label: "বাংলা" },
                  { value: "en", label: "English" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLanguage(option.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      language === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button onClick={beginRecording}>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {stage === "loading" && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <p className="text-sm font-medium text-foreground">
                Loading speech model… {Math.floor(progress)}%
              </p>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                First use downloads ~40 MB, then it works offline forever.
              </p>
            </div>
          )}

          {stage === "recording" && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="h-16 w-16 rounded-full bg-red-100 animate-pulse flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-red-500" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Recording… 00:{String(elapsed).padStart(2, "0")}
              </p>
              <Button variant="destructive" onClick={stopRecording}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          )}

          {stage === "transcribing" && (
            <div className="flex flex-col items-center py-4 space-y-4">
              <Loader size="lg" />
              <p className="text-sm font-medium text-foreground">
                Transcribing your report…
              </p>
            </div>
          )}

          {stage === "error" && (
            <div className="py-4 space-y-4">
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg p-3">
                {error}
              </p>
              <Textarea
                label="Type it instead"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="e.g. Mirpur e pani 4 foot, 12 jon manush, baccha ache"
                rows={3}
              />
              <Button
                className="w-full"
                onClick={() => typedText.trim() && finish(typedText)}
                disabled={!typedText.trim()}
              >
                Use typed text
              </Button>
            </div>
          )}

          {stage === "done" && (
            <>
              <Textarea
                label="Transcribed Text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
              />

              {extracted && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                    Extracted Fields — click to edit
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Select
                      label="Location"
                      value={fields.location ?? ""}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, location: e.target.value || null }))
                      }
                      options={[
                        { value: "", label: "Select location..." },
                        ...Object.keys(cityCoords).map((name) => ({
                          value: name,
                          label: name,
                        })),
                      ]}
                      className="mb-2"
                    />
                    <Input
                      label="Water Level (ft)"
                      type="number"
                      min="0"
                      step="any"
                      value={fields.waterLevelFt ?? ""}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          waterLevelFt:
                            e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="mb-2"
                    />
                    <Input
                      label="People Count"
                      type="number"
                      min="0"
                      step="1"
                      value={fields.peopleCount ?? ""}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          peopleCount:
                            e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="mb-2"
                    />
                    <Input
                      label="Days Without Food"
                      type="number"
                      min="0"
                      step="1"
                      value={fields.daysWithoutFood ?? ""}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          daysWithoutFood:
                            e.target.value === "" ? null : Number(e.target.value),
                        }))
                      }
                      className="mb-2"
                    />
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        checked={!!fields.childrenPresent}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            childrenPresent: e.target.checked,
                          }))
                        }
                        className="rounded accent-primary"
                      />
                      Children present
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        checked={!!fields.elderlyPresent}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            elderlyPresent: e.target.checked,
                          }))
                        }
                        className="rounded accent-primary"
                      />
                      Elderly present
                    </label>
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={handleSubmit}>
                Submit Report
              </Button>
            </>
          )}
        </div>
      </Dialog>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
