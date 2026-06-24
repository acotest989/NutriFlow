import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Sparkles, 
  Check, 
  HelpCircle, 
  Loader2, 
  X, 
  AlertCircle,
  Maximize,
  Search,
  Scan
} from "lucide-react";
import { LogEntry, FoodItem } from "../types";
import { SAMPLE_BARCODES } from "../data";

interface ScannerProps {
  currentDate: string;
  onAddEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  isCompact?: boolean;
}

export default function Scanner({ currentDate, onAddEntry, isCompact = false }: ScannerProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FoodItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [scanError, setScanError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setScanError("");
    try {
      setIsCameraActive(true);
      setStatusMessage("Starting camera view...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatusMessage("Camera live! Line up a barcode in the viewfinder frame.");
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setIsCameraActive(false);
      setScanError("Camera permission denied or not supported in this frame. Please use Simulated Scanner instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setStatusMessage("");
  };

  const handleBarcodeSubmit = async (barcodeToScan: string) => {
    if (!barcodeToScan.trim()) return;
    setIsSearching(true);
    setScanError("");
    setScanResult(null);

    // Simulate scanning flash visual effect
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 800);

    try {
      const response = await fetch("/api/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: barcodeToScan }),
      });

      if (!response.ok) {
        throw new Error("API failed. Please check your network and Gemini API key.");
      }

      const foodData = await response.json();
      setScanResult(foodData);
    } catch (err: any) {
      console.error(err);
      setScanError("Barcode analysis failed. Try a pre-registered code or check environment.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogScannedFood = () => {
    if (!scanResult) return;
    onAddEntry({
      date: currentDate,
      type: "meal",
      name: `${scanResult.name} (Scanned)`,
      calories: scanResult.calories,
      protein: scanResult.protein,
      carbs: scanResult.carbs,
      fat: scanResult.fat,
      quantity: scanResult.servingSize,
    });
    setScanResult(null);
    setBarcodeInput("");
    stopCamera();
  };

  return (
    <div id="barcode_scanner_panel" className="space-y-6">
      {/* Viewport Frame Box / Visual Camera Feedback */}
      <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
        <h3 className="font-sans font-bold text-white flex items-center gap-2">
          <Scan className="w-5 h-5 text-[#818CF8]" /> Multi-Platform Barcode Scanner
        </h3>

        {/* Viewfinder box */}
        <div className="relative bg-[#0B0E14] rounded-2xl aspect-video overflow-hidden border border-white/5 flex flex-col items-center justify-center text-white">
          {isCameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Animated scanline and viewport borders */}
              <div className="absolute inset-0 border-2 border-dashed border-[#6366F1]/40 pointer-events-none m-6 rounded-lg"></div>
              
              {/* Red scanning laser line */}
              <motion.div
                className="absolute left-6 right-6 h-0.5 bg-[#818CF8] shadow-[0_0_10px_rgba(99,102,241,0.8)] pointer-events-none"
                animate={{ top: ["15%", "85%", "15%"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              />

              <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1 rounded-lg text-[10px] font-mono text-[#818CF8] border border-white/5">
                ● Live Viewport
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full text-white hover:bg-rose-500 transition-colors"
                title="Stop Camera Feed"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 font-sans">
              <div className="w-14 h-14 rounded-full bg-[#141923] border border-white/5 flex items-center justify-center text-[#818CF8]">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E2E8F0]">Camera Scanner Ready</p>
                <p className="text-xs text-[#94A3B8] max-w-xs mt-1">
                  Access your mobile or desktop camera to scan grocery barcodes in real-time.
                </p>
              </div>
              <button
                id="btn_start_camera"
                onClick={startCamera}
                className="px-5 py-2 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Camera className="w-4 h-4" /> Use Device Camera
              </button>
            </div>
          )}

          {/* Flash Effect on Scan */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white pointer-events-none"
              />
            )}
          </AnimatePresence>
        </div>

        {statusMessage && (
          <p className="text-xs text-center text-[#94A3B8] font-sans italic bg-[#0B0E14] py-1.5 px-3 rounded-lg border border-white/5">
            {statusMessage}
          </p>
        )}

        {scanError && (
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-300 text-xs flex gap-2 font-sans items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      {/* Database Quick Code / Simulation Helper */}
      <div className="bg-[#141923] rounded-3xl p-6 shadow-md border border-white/5 space-y-4">
        <h4 className="font-sans font-bold text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#818CF8]" /> Simulated Barcode Console
        </h4>
        <p className="text-xs text-[#94A3B8] font-sans">
          Select any of these realistic preset items to simulate a laser swipe, or type any custom UPC code to trigger the AI Decoder!
        </p>

        {/* Preset scan chips */}
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_BARCODES.map((item) => (
            <button
              key={item.barcode}
              onClick={() => {
                setBarcodeInput(item.barcode);
                handleBarcodeSubmit(item.barcode);
              }}
              className="p-2 border border-white/5 hover:border-[#6366F1]/30 hover:bg-[#6366F1]/10 bg-[#0B0E14] rounded-xl text-left font-sans transition-all"
            >
              <span className="text-[10px] uppercase font-bold text-[#818CF8] block">{item.brand}</span>
              <span className="text-xs font-bold text-[#E2E8F0] truncate block">{item.name}</span>
              <span className="text-[9px] font-mono text-[#64748B] block">{item.barcode}</span>
            </button>
          ))}
        </div>

        {/* Custom Input Search Barcode */}
        <div className="border-t border-dashed border-white/5 pt-4">
          <label className="text-xs font-semibold text-[#94A3B8] font-sans block mb-1">
            Manual Barcode ID Entry
          </label>
          <div className="flex gap-2 font-sans">
            <input
              id="input_barcode_number"
              type="text"
              placeholder="Enter numeric UPC/EAN code..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="flex-1 bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
            <button
              id="btn_submit_barcode"
              onClick={() => handleBarcodeSubmit(barcodeInput)}
              disabled={isSearching || !barcodeInput.trim()}
              className="px-4 py-2 bg-[#6366F1] hover:bg-[#818CF8] disabled:bg-white/5 disabled:text-[#64748B] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
              Scan Code
            </button>
          </div>
        </div>

        {/* Scan Result Overlay Box */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-[#6366F1]/5 rounded-2xl p-4 border border-[#6366F1]/20 space-y-3 font-sans"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-bold text-[#818CF8] uppercase tracking-widest bg-[#6366F1]/20 px-2.5 py-0.5 rounded-full inline-block">
                    Match Scanned!
                  </span>
                  <h4 id="text_scanned_food_name" className="text-sm font-bold text-white mt-2 font-sans">{scanResult.name}</h4>
                  <p className="text-[10px] text-[#94A3B8]">
                    Serving Quantity: {scanResult.servingSize} {scanResult.servingUnit}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-bold text-[#818CF8] bg-[#0B0E14] border border-[#6366F1]/10 px-3 py-1 rounded-xl">
                    {scanResult.calories} kcal
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-[#0B0E14] border border-white/5 p-2 rounded-xl">
                <div>
                  <span className="text-[#FB923C] block font-semibold">Protein</span>
                  <b id="text_scanned_food_protein" className="text-white text-xs font-mono">{scanResult.protein}g</b>
                </div>
                <div>
                  <span className="text-[#38BDF8] block font-semibold">Carbohydrates</span>
                  <b id="text_scanned_food_carbs" className="text-white text-xs font-mono">{scanResult.carbs}g</b>
                </div>
                <div>
                  <span className="text-[#FACC15] block font-semibold">Fats</span>
                  <b id="text_scanned_food_fat" className="text-white text-xs font-mono">{scanResult.fat}g</b>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  id="btn_discard_scan"
                  onClick={() => setScanResult(null)}
                  className="flex-1 bg-[#0B0E14] hover:bg-white/5 border border-white/10 text-[#94A3B8] rounded-xl py-2 text-xs font-semibold transition-all"
                >
                  Clear
                </button>
                <button
                  id="btn_confirm_scan"
                  onClick={handleLogScannedFood}
                  className="flex-1 bg-[#6366F1] hover:bg-[#818CF8] text-white rounded-xl py-2 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1"
                >
                  <Check className="w-4.5 h-4.5" /> Log to Meal Log
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
