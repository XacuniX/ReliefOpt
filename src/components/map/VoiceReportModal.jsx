import { useState, useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { Button, Textarea, Toast, Loader, Progress, Input, Select } from "../ui";
import Dialog from "../ui/Dialog";
import { cityCoords } from "../../mockData";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import {
  isAndroidModelBundled,
  listMicrophones,
  loadModel,
  SpeechInputError,
  startRecording,
  transcribe,
} from "../../lib/speech";
import { extractFields } from "../../lib/extract";
import { calculateUrgency } from "../../lib/urgency";
import { disasterTypes } from "../../lib/disasters";

function microphoneErrorMessage(error) {
  if (!window.isSecureContext) {
    return "Microphone access requires HTTPS or localhost. Open this page securely and try again.";
  }

  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone permission was denied. Allow microphone access for this site in your browser settings, then try again.";
    case "NotFoundError":
      return "No microphone was found. Connect a microphone or choose another input device, then try again.";
    case "NotReadableError":
    case "AbortError":
      return "The selected microphone could not be opened. Close other apps using it, or choose another microphone.";
    case "OverconstrainedError":
      return "The selected microphone is no longer available. Choose another microphone and try again.";
    default:
      return error instanceof SpeechInputError
        ? error.message
        : "Could not start the selected microphone. Check its browser and system permissions, then try again.";
  }
}

function modelErrorMessage(error) {
  const detail = String(error?.message || "");
  if (/failed to fetch|networkerror|load failed/i.test(detail)) {
    return "Whisper Base English could not be downloaded. Check the connection and make sure your browser or content blocker allows downloads from huggingface.co.";
  }
  if (/quota|storage|disk|cache/i.test(detail)) {
    return "There is not enough browser storage for Whisper Base English. Free at least 100 MB for this site, then try again.";
  }
  if (/memory|allocation|out of bounds|unreachable/i.test(detail)) {
    return "Whisper Base English ran out of browser memory. Close other heavy tabs, restart the browser, and try again.";
  }
  if (/wasm|webassembly|webgpu|execution provider|unsupported device/i.test(detail)) {
    return "This browser could not start Whisper Base English. Update Chrome or Edge, enable hardware acceleration, and try again.";
  }
  return detail
    ? `Whisper Base English could not start: ${detail.slice(0, 180)}`
    : "Whisper Base English could not start. Check your connection and available browser storage, then try again.";
}

export default function VoiceReportModal() {
  const { addReport, addMapPin } = useData();
  const { currentUser } = useAuth();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [microphones, setMicrophones] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [transcript, setTranscript] = useState("");
  const [typedText, setTypedText] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [edits, setEdits] = useState({});

  const recorderRef = useRef(null);
  const tickRef = useRef(null);
  const meterRef = useRef(null);
  const attemptRef = useRef(0);

  const extracted = transcript ? extractFields(transcript) : null;
  const maxRecordingSeconds = 30;

  // User overrides sit on top of the auto-extraction. Empty number inputs mean
  // null (not confirmed zero), so merge with ?? only when a value is present.
  const fields = {
    ...(extracted || {}),
    ...(edits.disasterType !== undefined ? { disasterType: edits.disasterType } : {}),
    ...(edits.location !== undefined ? { location: edits.location } : {}),
    ...(edits.waterLevelFt !== undefined ? { waterLevelFt: edits.waterLevelFt } : {}),
    ...(edits.peopleCount !== undefined ? { peopleCount: edits.peopleCount } : {}),
    ...(edits.childrenPresent !== undefined ? { childrenPresent: edits.childrenPresent } : {}),
    ...(edits.elderlyPresent !== undefined ? { elderlyPresent: edits.elderlyPresent } : {}),
    ...(edits.daysWithoutFood !== undefined ? { daysWithoutFood: edits.daysWithoutFood } : {}),
  };

  useEffect(() => {
    return () => {
      clearInterval(tickRef.current);
      clearInterval(meterRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    listMicrophones()
      .then((devices) => active && setMicrophones(devices))
      .catch(() => {});
    return () => { active = false; };
  }, [open]);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function reset() {
    attemptRef.current += 1;
    clearInterval(tickRef.current);
    clearInterval(meterRef.current);
    recorderRef.current = null;
    setStage("idle");
    setProgress(0);
    setElapsed(0);
    setInputLevel(0);
    setTranscript("");
    setTypedText("");
    setError("");
    setEdits({});
  }

  async function beginRecording() {
    const attempt = ++attemptRef.current;
    setStage("loading");
    setError("");

    let recorder;
    try {
      recorder = await startRecording(selectedMicrophone);
      if (attempt !== attemptRef.current) {
        await recorder.stop().catch(() => {});
        return;
      }
      recorderRef.current = recorder;
      listMicrophones().then(setMicrophones).catch(() => {});
    } catch (caught) {
      if (attempt !== attemptRef.current) return;
      setError(microphoneErrorMessage(caught));
      setStage("error");
      return;
    }

    try {
      await loadModel(({ progress: p }) => {
        if (attempt === attemptRef.current && Number.isFinite(p)) {
          setProgress((current) => Math.min(100, Math.max(current, p)));
        }
      });

      if (attempt !== attemptRef.current) return;
      recorder.start();
      setElapsed(0);
      setInputLevel(0);
      setStage("recording");
      meterRef.current = setInterval(() => setInputLevel(recorder.getLevel()), 150);
      tickRef.current = setInterval(() => setElapsed((current) => {
        const next = current + 1;
        if (next >= maxRecordingSeconds) {
          clearInterval(tickRef.current);
          setTimeout(() => stopRecording(), 0);
        }
        return next;
      }), 1000);
    } catch (caught) {
      if (attempt !== attemptRef.current) return;
      const activeRecorder = recorderRef.current;
      recorderRef.current = null;
      activeRecorder?.stop().catch(() => {});
      setError(caught instanceof SpeechInputError ? caught.message : modelErrorMessage(caught));
      setStage("error");
    }
  }

  async function stopRecording() {
    clearInterval(tickRef.current);
    clearInterval(meterRef.current);
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setStage("transcribing");
    try {
      const recording = await recorder.stop();
      if (!recording) {
        throw new SpeechInputError("Recording did not start. Please try again.");
      }
      const text = await transcribe(recording);
      finish(text);
    } catch (caught) {
      setError(caught instanceof SpeechInputError
        ? caught.message
        : "Speech recognition failed. Please try again, or type the report below instead.");
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
      id: crypto.randomUUID(),
      type: fields.disasterType ?? "Other",
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
      locationName: fields.location ?? "Unknown",
      lat: (coords ?? [23.8103, 90.4125])[0],
      lng: (coords ?? [23.8103, 90.4125])[1],
      waterLevelFt: fields.waterLevelFt,
      waterLevel:
        fields.waterLevelFt != null ? `${fields.waterLevelFt}ft` : "—",
      peopleCount: fields.peopleCount,
      childrenPresent: Boolean(fields.childrenPresent),
    };
    addMapPin(pin);

    setOpen(false);
    reset();
    showToast("success", "Voice report submitted and pinned on the map!");
  }

  function handleClose() {
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
        allowCloseButtonWhenPersistent
      >
        <div className="space-y-4">
          {stage === "idle" && (
            <div className="text-center py-6 space-y-4">
              <p className="text-muted-foreground text-sm">
                Say the disaster type, district, affected people, water level, and urgent needs.
                Transcription runs locally in English.
              </p>
              <Select
                label="Microphone"
                value={selectedMicrophone}
                onChange={(event) => setSelectedMicrophone(event.target.value)}
                options={[
                  { value: "", label: "System default microphone" },
                  ...microphones,
                ]}
                className="text-left"
              />
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
                {isAndroidModelBundled
                  ? "The speech model is included in this Android app and works offline."
                  : "First use downloads ~80 MB, then it works offline from the browser cache."}
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
              <div className="w-full max-w-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Microphone level</span>
                  <span>{inputLevel > 2 ? "Input detected" : "Speak to test"}</span>
                </div>
                <Progress
                  value={inputLevel}
                  aria-label={`Microphone input level ${inputLevel}%`}
                />
                {inputLevel <= 2 && elapsed >= 3 && (
                  <p className="text-center text-xs text-amber-600">
                    No input detected. Stop and choose another microphone.
                  </p>
                )}
              </div>
              <div className="w-full max-w-xs space-y-1">
                <Progress
                  value={(elapsed / maxRecordingSeconds) * 100}
                  aria-label={`${Math.max(0, maxRecordingSeconds - elapsed)} seconds remaining`}
                />
                <p className="text-center text-xs text-muted-foreground">
                  {Math.max(0, maxRecordingSeconds - elapsed)} seconds remaining (30-second limit)
                </p>
              </div>
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setError("");
                  setStage("idle");
                }}
              >
                Try another microphone
              </Button>
              <Textarea
                label="Type it instead"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="e.g. Flash flooding in Cumilla, 4 feet of water, 12 people stranded"
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
                      label="Disaster Type"
                      value={fields.disasterType ?? ""}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          disasterType: e.target.value || null,
                        }))
                      }
                      options={[
                        { value: "", label: "Select disaster type..." },
                        ...disasterTypes.map((type) => ({ value: type, label: type })),
                      ]}
                      className="mb-2"
                    />
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

              {(!fields.location || !fields.disasterType) && (
                <p className="text-xs text-amber-600">
                  Confirm both the disaster type and district before submitting.
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!fields.location || !fields.disasterType}
              >
                Submit {fields.disasterType || "Disaster"} Report
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
