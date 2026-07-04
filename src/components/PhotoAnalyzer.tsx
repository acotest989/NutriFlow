import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Sparkles,
  Check,
  Loader2,
  X,
  AlertCircle,
  RotateCcw,
  Utensils,
  ImagePlus,
} from "lucide-react";
import { useStore } from "../store";
import { fileToAnalyzableImage, captureVideoFrame } from "../lib/image";

interface PhotoAnalyzerProps {
  isCompact?: boolean;
}

interface PhotoResult {
  name: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note?: string;
}

export default function PhotoAnalyzer({ isCompact = false }: PhotoAnalyzerProps) {
  const currentDate = useStore((s) => s.currentDate);
  const addEntry = useStore((s) => s.addEntry);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<string | null>(null); // object URL to revoke (uploads only)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PhotoResult | null>(null);
  const [logged, setLogged] = useState(false);

  // Clean up camera + object URL on unmount.
  useEffect(
    () => () => {
      stopCamera();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const reset = () => {
    stopCamera();
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
    setResult(null);
    setError("");
    setAnalyzing(false);
    setLogged(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Live camera via getUserMedia — the same mechanism the barcode scanner uses,
  // which works on both desktop and Android/TWA (unlike a file-input `capture`).
  const startCamera = async () => {
    setError("");
    setResult(null);
    setLogged(false);
    setPreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Camera permission was denied or is unavailable. Use Upload instead.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const { base64, dataUrl } = captureVideoFrame(video);
      stopCamera();
      void runAnalysis(base64, "image/jpeg", dataUrl, false);
    } catch (err: any) {
      setError(err?.message || "Couldn't capture the photo. Try again.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = await fileToAnalyzableImage(file);
      await runAnalysis(img.base64, img.mimeType, img.previewUrl, true);
    } catch (err: any) {
      setError(err?.message || "Couldn't read that image. Please try another.");
    }
  };

  // Shared: show the picked/captured image, POST it, and surface the estimate.
  const runAnalysis = async (
    base64: string,
    mimeType: string,
    previewUrl: string,
    isObjectUrl: boolean
  ) => {
    setError("");
    setResult(null);
    setLogged(false);

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = isObjectUrl ? previewUrl : null;
    setPreview(previewUrl);

    try {
      setAnalyzing(true);
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(body.error || "Analysis failed. Please try again.");
      }
      const data = (await res.json()) as PhotoResult;
      setResult({
        name: data.name?.trim() || "Meal",
        items: Array.isArray(data.items) ? data.items.filter(Boolean) : [],
        calories: Math.max(0, Math.round(Number(data.calories) || 0)),
        protein: Math.max(0, Number(data.protein) || 0),
        carbs: Math.max(0, Number(data.carbs) || 0),
        fat: Math.max(0, Number(data.fat) || 0),
        note: data.note?.trim() || "",
      });
    } catch (err: any) {
      setError(err?.message || "Couldn't analyze that photo. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const noFood = !!result && result.calories === 0 && result.items.length === 0;

  const setField = (field: "name" | "calories" | "protein" | "carbs" | "fat", value: string) => {
    setResult((r) => {
      if (!r) return r;
      if (field === "name") return { ...r, name: value };
      return { ...r, [field]: Math.max(0, Number(value) || 0) };
    });
  };

  const handleLog = () => {
    if (!result) return;
    addEntry({
      date: currentDate,
      type: "meal",
      name: `${result.name} (Photo)`,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      quantity: 1,
    });
    setLogged(true);
    setTimeout(reset, 1300);
  };

  return (
    <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
      <div>
        <h3 className="font-sans font-bold text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#818CF8]" /> Snap a Meal
        </h3>
        <p className="text-xs text-[#94A3B8] font-sans mt-1">
          Take or upload a food photo — AI estimates the calories and macros, then you review and log it.
        </p>
      </div>

      {/* Hidden gallery/file picker (camera uses getUserMedia, below). */}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      {/* Camera / preview / picker area — 16:9 for the live camera or a captured
          photo; sized to content for the idle buttons so they aren't crammed. */}
      <div className={`relative bg-[#0B0E14] rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center text-white ${cameraActive || preview ? "aspect-video" : "min-h-52"}`}>
        {cameraActive ? (
          <>
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current) el.srcObject = streamRef.current;
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors"
              title="Close camera"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={capturePhoto}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 font-sans"
            >
              <Camera className="w-4 h-4" /> Capture
            </button>
          </>
        ) : preview ? (
          <>
            <img src={preview} alt="Meal preview" className="w-full h-full object-cover" />
            {!logged && (
              <button
                onClick={reset}
                className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {analyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 font-sans">
                <Loader2 className="w-6 h-6 animate-spin text-[#818CF8]" />
                <p className="text-xs text-[#E2E8F0]">Analyzing your meal…</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 font-sans w-full h-full">
            <div className="w-14 h-14 rounded-full bg-[#141923] border border-white/5 flex items-center justify-center text-[#818CF8]">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0]">Snap or upload a meal</p>
              <p className="text-xs text-[#94A3B8] max-w-xs mt-1">
                Use your camera to photograph your plate, or pick an existing photo from your gallery.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Camera className="w-4 h-4" /> Take Photo
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 bg-[#0B0E14] hover:bg-white/5 border border-white/10 text-[#E2E8F0] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <ImagePlus className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-300 text-xs flex gap-2 font-sans items-start">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* No-food result */}
      <AnimatePresence>
        {noFood && !logged && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-[#0B0E14] rounded-2xl border border-white/10 text-[#94A3B8] text-xs font-sans flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />
              No food detected. Try a clearer, closer shot of your plate.
            </span>
            <button
              onClick={reset}
              className="shrink-0 flex items-center gap-1 text-[#818CF8] hover:text-white font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success state */}
      <AnimatePresence>
        {logged && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-300 text-sm font-sans font-semibold flex items-center justify-center gap-2"
          >
            <Check className="w-4.5 h-4.5" /> Logged to your diary!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editable review card */}
      <AnimatePresence>
        {result && !noFood && !logged && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#6366F1]/5 rounded-2xl p-4 border border-[#6366F1]/20 space-y-3 font-sans"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#818CF8] uppercase tracking-widest bg-[#6366F1]/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Estimate
              </span>
              <span className="text-[10px] text-[#64748B]">Review &amp; adjust before logging</span>
            </div>

            {/* Editable meal name */}
            <input
              value={result.name}
              onChange={(e) => setField("name", e.target.value)}
              className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
              placeholder="Meal name"
            />

            {/* Detected items */}
            {result.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.items.map((it, i) => (
                  <span
                    key={`${it}-${i}`}
                    className="text-[10px] text-[#CBD5E1] bg-[#0B0E14] border border-white/5 rounded-full px-2.5 py-1 flex items-center gap-1"
                  >
                    <Utensils className="w-2.5 h-2.5 text-[#818CF8]" /> {it}
                  </span>
                ))}
              </div>
            )}

            {/* Editable calories + macros */}
            <div className="grid grid-cols-4 gap-2">
              <Field label="Calories" color="text-[#818CF8]" value={result.calories} onChange={(v) => setField("calories", v)} />
              <Field label="Protein g" color="text-[#FB923C]" value={result.protein} onChange={(v) => setField("protein", v)} />
              <Field label="Carbs g" color="text-[#38BDF8]" value={result.carbs} onChange={(v) => setField("carbs", v)} />
              <Field label="Fat g" color="text-[#FACC15]" value={result.fat} onChange={(v) => setField("fat", v)} />
            </div>

            {result.note && (
              <p className="text-[10px] text-[#94A3B8] italic leading-snug">{result.note}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={reset}
                className="flex-1 bg-[#0B0E14] hover:bg-white/5 border border-white/10 text-[#94A3B8] rounded-xl py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Try another
              </button>
              <button
                onClick={handleLog}
                className="flex-1 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl py-2 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1"
              >
                <Check className="w-4.5 h-4.5" /> Log meal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Small labeled numeric input for the macro grid.
function Field({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="bg-[#0B0E14] border border-white/5 rounded-xl p-2 text-center block">
      <span className={`text-[9px] font-semibold block mb-1 ${color}`}>{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-white text-xs font-mono text-center focus:outline-none"
      />
    </label>
  );
}
