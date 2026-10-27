// =============================================================
// MedicalPPGWaveform.jsx — Clinical Photoplethysmogram (PPG) Waveform
// Implements the 3 Clinical PPG Signal Quality States shown in medical guidelines:
// 1. "Good PPG"        -> [✓ Display]       "Clear periodic peaks, adequate amplitude"
// 2. "Motion / noisy"  -> [✕ Reject / flag] "Irregular peaks → missed or false detections"
// 3. "Poor contact"    -> [✕ Unavailable]   "Low amplitude, unstable baseline"
// =============================================================

import { useEffect, useRef, useState } from "react";
import { Check, X, Eye, Activity, ShieldAlert, Sparkles, Sliders } from "lucide-react";

export const PPG_STATES = {
  GOOD: {
    key: "good",
    title: "Good PPG",
    badgeLabel: "✓ Display",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-500/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/50",
    strokeColor: "#15803d", // Deep medical green
    strokeColorDark: "#22c55e",
    description: "Clear periodic peaks, adequate amplitude",
    isDisplayable: true,
  },
  NOISY: {
    key: "noisy",
    title: "Motion / noisy",
    badgeLabel: "✕ Reject / flag",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-500/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/50",
    strokeColor: "#c2410c", // Warm rust / amber
    strokeColorDark: "#f97316",
    description: "Irregular peaks → missed or false detections",
    isDisplayable: false,
  },
  POOR_CONTACT: {
    key: "poor_contact",
    title: "Poor contact",
    badgeLabel: "✕ Unavailable",
    badgeClass: "bg-rose-50 text-rose-900 border-rose-500/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/50",
    strokeColor: "#b91c1c", // Crimson red
    strokeColorDark: "#ef4444",
    description: "Low amplitude, unstable baseline",
    isDisplayable: false,
  },
};

/**
 * Individual PPG Waveform Canvas Card
 */
export function PPGWaveformCard({
  stateKey = "good",
  heartRate = 140,
  spo2 = 98,
  isLive = true,
  height = 130,
  showBadge = true,
  showTitle = true,
  showCaption = true,
  isFrozen = false,
  backgroundColor = "transparent",
  customStrokeColor,
}) {
  const canvasRef = useRef(null);
  const stateMeta = PPG_STATES[stateKey.toUpperCase()] || PPG_STATES.GOOD;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement ? canvas.parentElement.clientWidth : 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let offset = 0;

    // Physiological clean pulse (Good PPG)
    function getGoodPPG(phase) {
      const p = ((phase % 1) + 1) % 1;
      if (p < 0.22) {
        // Sharp systolic upstroke
        const t = p / 0.22;
        return Math.sin(t * Math.PI * 0.5) ** 1.6;
      } else if (p < 0.38) {
        // Systolic decay
        const t = (p - 0.22) / 0.16;
        return 1.0 - t * 0.52;
      } else if (p < 0.52) {
        // Dicrotic notch bounce (aortic valve rebound)
        const t = (p - 0.38) / 0.14;
        return 0.48 + Math.sin(t * Math.PI) * 0.16;
      } else {
        // Diastolic runoff
        const t = (p - 0.52) / 0.48;
        return (0.48 * Math.cos(t * Math.PI * 0.5)) ** 1.3;
      }
    }

    // Motion artifact & noise (Motion / noisy PPG)
    function getNoisyPPG(phase, x) {
      // Primary irregular pulse
      const basePhase = phase * 1.15;
      const primary = getGoodPPG(basePhase);

      // High-frequency motion jitter + erratic harmonic spikes
      const jitter1 = Math.sin(x * 0.14 + offset * 0.08) * 0.22;
      const jitter2 = Math.cos(x * 0.35 - offset * 0.12) * 0.18;
      const randomSpike = Math.sin(phase * 3.7) * 0.25;
      const baselineDrift = Math.sin(x * 0.03 + offset * 0.02) * 0.15;

      const raw = primary * 0.75 + jitter1 + jitter2 + randomSpike + baselineDrift;
      return Math.max(0.05, Math.min(1.2, raw));
    }

    // Low amplitude & drifting baseline (Poor contact PPG)
    function getPoorContactPPG(phase, x) {
      // Very shallow amplitude (10-18% of normal height)
      const shallowRipple = Math.sin(x * 0.25 + offset * 0.05) * 0.08;
      const wanderingBaseline = Math.sin(x * 0.025 + offset * 0.015) * 0.12;
      const microNoise = (Math.sin(x * 0.8) + Math.cos(x * 1.3)) * 0.04;
      return 0.15 + shallowRipple + wanderingBaseline + microNoise;
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      // Canvas background
      if (backgroundColor && backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // Base metrics
      const baselineY = height * 0.86;
      const maxAmplitude = height * 0.72;
      const effectiveHR = heartRate > 0 ? heartRate : 140;
      const waveLength = Math.max(60, Math.min(130, (140 / effectiveHR) * 80));

      const stroke = customStrokeColor || stateMeta.strokeColor;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = stateKey === "good" ? 2.2 : 1.8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();
      const step = 2;

      for (let x = 0; x <= width; x += step) {
        const phase = (x + offset) / waveLength;
        let val = 0;

        if (stateKey === "good") {
          val = getGoodPPG(phase);
        } else if (stateKey === "noisy") {
          val = getNoisyPPG(phase, x);
        } else {
          val = getPoorContactPPG(phase, x);
        }

        const y = Math.max(8, Math.min(height - 6, baselineY - val * maxAmplitude));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!isFrozen && isLive) {
        const speedMultiplier = stateKey === "noisy" ? 1.4 : (stateKey === "poor_contact" ? 0.7 : 1.0);
        offset += (effectiveHR / 60) * 1.8 * speedMultiplier;
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stateKey, heartRate, isLive, height, isFrozen, backgroundColor, customStrokeColor, stateMeta]);

  return (
    <div className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md transition-all duration-300">
      {/* Top Header: Title & Pill Badge (Exact match to medical guideline image) */}
      {(showTitle || showBadge) && (
        <div className="flex items-center justify-between pb-2 mb-1">
          {showTitle && (
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{stateMeta.title}</span>
            </h4>
          )}
          {showBadge && (
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-semibold border font-mono tracking-tight ${stateMeta.badgeClass}`}
            >
              {stateMeta.badgeLabel}
            </span>
          )}
        </div>
      )}

      {/* Main Waveform Canvas */}
      <div className="relative my-1">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: `${height}px`, display: "block" }}
        />
      </div>

      {/* Bottom Subtitle Caption (Exact text from image) */}
      {showCaption && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11.5px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
          {stateMeta.description}
        </div>
      )}
    </div>
  );
}

/**
 * 3-Card Diagnostic Comparison Grid (Exact layout from the user's image)
 */
export function PPGSignalQualityTriplet({ heartRate = 140, isLive = true, height = 110 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <PPGWaveformCard
        stateKey="good"
        heartRate={heartRate}
        isLive={isLive}
        height={height}
        showBadge={true}
        showTitle={true}
        showCaption={true}
      />
      <PPGWaveformCard
        stateKey="noisy"
        heartRate={heartRate}
        isLive={isLive}
        height={height}
        showBadge={true}
        showTitle={true}
        showCaption={true}
      />
      <PPGWaveformCard
        stateKey="poor_contact"
        heartRate={heartRate}
        isLive={isLive}
        height={height}
        showBadge={true}
        showTitle={true}
        showCaption={true}
      />
    </div>
  );
}

/**
 * Main Interactive Clinical PPG Waveform Component
 * Supports:
 * - Single monitor mode with auto-telemetry SQI classification
 * - Tabbed manual SQI simulation & inspection
 * - Full 3-card comparison view matching the user's image
 */
export default function MedicalPPGWaveform({
  heartRate = 140,
  spo2 = 98,
  isLive = true,
  height = 140,
  showControls = true,
  showTelemetryLabels = false,
  showTriplet = false,
  irValue = null,
  ppgStatus = null,
  heartRateStatus = null,
  forcedState = null,
  strokeColor,
  fillColor,
  backgroundColor = "transparent",
}) {
  const [selectedMode, setSelectedMode] = useState("auto"); // "auto" | "good" | "noisy" | "poor_contact" | "triplet"
  const [isFrozen, setIsFrozen] = useState(false);

  // Automatically determine Signal Quality Index from real incoming ESP32 telemetry
  let resolvedState = "good";
  if (!isLive) {
    resolvedState = "poor_contact";
  } else if (irValue !== null && irValue < 7000) {
    resolvedState = "poor_contact";
  } else if (heartRateStatus === "NO_CONTACT" || ppgStatus === "NOT_DETECTED") {
    resolvedState = "poor_contact";
  } else if (heartRateStatus === "NO_VALID_READING" || !heartRate || heartRate < 45 || heartRate > 220) {
    resolvedState = "noisy";
  } else {
    resolvedState = "good";
  }

  // Active state to render
  const activeState = forcedState || (selectedMode === "auto" ? resolvedState : selectedMode);
  const currentMeta = PPG_STATES[activeState.toUpperCase()] || PPG_STATES.GOOD;

  if (showTriplet || selectedMode === "triplet") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              PPG Signal Quality Diagnostic Standard
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
              Clinical ISO Reference
            </span>
          </div>
          {showControls && (
            <button
              onClick={() => setSelectedMode("auto")}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              ← Back to Live Stream
            </button>
          )}
        </div>
        <PPGSignalQualityTriplet heartRate={heartRate} isLive={isLive} height={height} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs">
      {/* Top Header Card Matching the Image */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {currentMeta.title}
          </h3>
          {selectedMode === "auto" && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              Live Auto SQI
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Exact Pill Badge from image */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border font-mono tracking-tight ${currentMeta.badgeClass}`}
          >
            {currentMeta.badgeLabel}
          </span>
        </div>
      </div>

      {/* Main Single Waveform Canvas */}
      <div className="p-4 bg-white dark:bg-slate-900">
        <PPGWaveformCard
          stateKey={activeState}
          heartRate={heartRate}
          spo2={spo2}
          isLive={isLive}
          height={height}
          showBadge={false}
          showTitle={false}
          showCaption={false}
          isFrozen={isFrozen}
          backgroundColor={backgroundColor}
          customStrokeColor={strokeColor}
        />
      </div>

      {/* Subtitle Caption Footer (Exact wording from image) */}
      <div className="px-3.5 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px] leading-tight">
          {currentMeta.description}
        </span>
      </div>

      {/* Interactive Controls Bar for Clinicians */}
      {showControls && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Sliders size={12} />
              SQI State:
            </span>
            <button
              onClick={() => setSelectedMode("auto")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                selectedMode === "auto"
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              }`}
            >
              Auto Telemetry
            </button>
            <button
              onClick={() => setSelectedMode("good")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                selectedMode === "good"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              Good PPG
            </button>
            <button
              onClick={() => setSelectedMode("noisy")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                selectedMode === "noisy"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              Motion / noisy
            </button>
            <button
              onClick={() => setSelectedMode("poor_contact")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                selectedMode === "poor_contact"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border-slate-200 dark:border-slate-700"
              }`}
            >
              Poor contact
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMode(selectedMode === "triplet" ? "auto" : "triplet")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Eye size={12} />
              <span>3-State Comparison Guide</span>
            </button>
            <button
              onClick={() => setIsFrozen(!isFrozen)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                isFrozen
                  ? "bg-amber-500 text-black border-amber-400"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              {isFrozen ? "FROZEN" : "Freeze"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
