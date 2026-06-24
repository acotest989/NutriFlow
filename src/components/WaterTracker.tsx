import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Droplet, Plus, Trash2, Award, Volume2 } from "lucide-react";
import { useStore } from "../store";

interface WaterTrackerProps {
  isCompact?: boolean;
}

export default function WaterTracker({ isCompact = false }: WaterTrackerProps) {
  const currentDate = useStore((s) => s.currentDate);
  const [consumed, setConsumed] = useState<number>(0);
  const target = 2500; // default 2500ml or 2.5L target

  // Load water data from localStorage on mount & when date changes
  useEffect(() => {
    const saved = localStorage.getItem("hydration_logs");
    if (saved) {
      const logs = JSON.parse(saved);
      if (logs[currentDate]) {
        setConsumed(logs[currentDate]);
      } else {
        setConsumed(0);
      }
    } else {
      setConsumed(0);
    }
  }, [currentDate]);

  // Save water to localStorage
  const updateWater = (amount: number) => {
    const newAmount = Math.max(0, consumed + amount);
    setConsumed(newAmount);

    const saved = localStorage.getItem("hydration_logs");
    const logs = saved ? JSON.parse(saved) : {};
    logs[currentDate] = newAmount;
    localStorage.setItem("hydration_logs", JSON.stringify(logs));
  };

  const percent = Math.min(100, Math.round((consumed / target) * 100));

  return (
    <div className="bg-[#141923] rounded-3xl p-5 shadow-lg border border-white/5 font-sans h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <h3 className="font-sans font-bold text-sm text-[#38BDF8] flex items-center gap-2">
            <Droplet className="w-4.5 h-4.5 text-[#38BDF8] animate-bounce" /> Hydration Tracker
          </h3>
          <span className="text-[10px] font-mono text-[#64748B] uppercase bg-[#38BDF8]/10 px-2 py-0.5 rounded-full text-[#38BDF8] font-bold">
            Target: 2.5L
          </span>
        </div>

        {/* Dynamic Water Cup Graphic & progress */}
        <div className="flex items-center gap-6 py-2">
          {/* Visual Cup container */}
          <div className="w-16 h-28 border-[3px] border-white/10 rounded-b-2xl rounded-t-sm relative overflow-hidden shrink-0 flex items-end bg-[#0B0E14] shadow-inner">
            {/* Wave effect overlay using framer-motion */}
            <motion.div
              initial={{ height: "0%" }}
              animate={{ height: `${percent}%` }}
              transition={{ type: "spring", stiffness: 45, damping: 15 }}
              className="w-full bg-linear-to-t from-[#0284C7] to-[#38BDF8] relative"
            >
              {/* Overlay animated ripple effect */}
              <div className="absolute inset-x-0 -top-1 h-2 bg-white/20 animate-pulse blur-[1px]" />
            </motion.div>

            {/* Inner label inside cup */}
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-white/50 select-none z-10">
              {percent}%
            </div>
          </div>

          <div className="flex-1 space-y-1">
            <div className="text-2xl font-black text-white font-mono">
              {consumed} <span className="text-xs font-semibold text-[#94A3B8]">ml</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-tight">
              {percent >= 100 
                ? "Perfect hydration! Goal exceeded today." 
                : `${target - consumed} ml remaining to meet daily baseline.`}
            </p>

            {percent >= 100 && (
              <span className="inline-flex items-center gap-1 mt-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Award className="w-3.5 h-3.5" /> Hydrated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
        <button
          onClick={() => updateWater(250)}
          className="bg-white/2 hover:bg-[#38BDF8]/10 border border-white/5 hover:border-[#38BDF8]/30 text-white rounded-xl py-2 px-1 text-center transition-all flex flex-col items-center gap-1 group active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-[#38BDF8] group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold font-mono">+250ml</span>
          <span className="text-[9px] text-[#64748B] font-sans">Cup</span>
        </button>

        <button
          onClick={() => updateWater(500)}
          className="bg-white/2 hover:bg-[#38BDF8]/10 border border-white/5 hover:border-[#38BDF8]/30 text-white rounded-xl py-2 px-1 text-center transition-all flex flex-col items-center gap-1 group active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-[#38BDF8] group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold font-mono">+500ml</span>
          <span className="text-[9px] text-[#64748B] font-sans">Glass</span>
        </button>

        <button
          onClick={() => updateWater(-250)}
          className="bg-white/1 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 text-[#94A3B8] hover:text-rose-400 rounded-xl py-2 px-1 text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
          title="Reduce water log"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold font-mono">-250ml</span>
          <span className="text-[9px] text-[#64748B] font-sans">Reduce</span>
        </button>
      </div>
    </div>
  );
}
