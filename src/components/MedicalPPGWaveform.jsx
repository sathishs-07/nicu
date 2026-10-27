// =============================================================
// MedicalPPGWaveform.jsx — Clinical Photoplethysmogram (PPG) Waveform
// Renders the exact arterial pulse waveform shown in medical monitors:
// Steep systolic upstroke, rounded peak, dicrotic notch, and
// continuous solid/gradient filled contour against deep monitor canvas.
// =============================================================

import { useEffect, useRef, useState } from "react";

export default function MedicalPPGWaveform({
  heartRate = 140,
  spo2 = 98,
  isLive = true,
  height = 140,
  showControls = true,
  showTelemetryLabels = false,
  strokeColor = "#ffffff",
  fillColor = "rgba(255, 255, 255, 0.95)",
  backgroundColor = "#101632",
}) {
  const canvasRef = useRef(null);
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Handle high-DPI crisp retina rendering
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement ? canvas.parentElement.clientWidth : 400;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let offset = 0;

    // Physiological PPG cycle: combines systolic peak + dicrotic wave
    function getPPGValue(phase) {
      // phase ranges 0 to 1
      const p = phase % 1;
      if (p < 0.28) {
        // Systolic upstroke & rounded peak
        const t = p / 0.28;
        return Math.sin(t * Math.PI * 0.5) ** 1.8;
      } else if (p < 0.44) {
        // Systolic decay down to dicrotic notch
        const t = (p - 0.28) / 0.16;
        return 1.0 - t * 0.48;
      } else if (p < 0.6) {
        // Dicrotic notch bounce (aortic valve rebound)
        const t = (p - 0.44) / 0.16;
        return 0.52 + Math.sin(t * Math.PI) * 0.18;
      } else {
        // Diastolic runoff to baseline
        const t = (p - 0.6) / 0.4;
        return (0.52 * Math.cos(t * Math.PI * 0.5)) ** 1.4;
      }
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      // Deep monitor background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Subtle clinical gridlines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      const gridGap = 24;
      for (let x = 0; x < width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (!isLive || heartRate <= 0) {
        // Flatline / Standby baseline without text collision
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(0, height * 0.5);
        ctx.lineTo(width, height * 0.5);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      // Calculate wavelength based on neonatal heart rate (120 - 160 bpm)
      const waveLength = Math.max(70, Math.min(130, (140 / (heartRate || 140)) * 85));
      const baselineY = height * 0.88;
      const amplitude = height * 0.62;

      // Draw filled contour
      ctx.beginPath();
      ctx.moveTo(0, baselineY);

      const step = 2;
      for (let x = 0; x <= width; x += step) {
        const phase = (x + offset) / waveLength;
        const val = getPPGValue(phase);
        const y = baselineY - val * amplitude;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, baselineY);
      ctx.closePath();

      // Filled mountain contour exactly matching the photo
      const gradient = ctx.createLinearGradient(0, baselineY - amplitude, 0, baselineY);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.88)");
      gradient.addColorStop(1, "rgba(240, 249, 255, 0.75)");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Crisp top edge line
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) {
        const phase = (x + offset) / waveLength;
        const val = getPPGValue(phase);
        const y = baselineY - val * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!isFrozen) {
        // Animation speed proportional to heart rate
        offset += ((heartRate || 140) / 60) * 1.6;
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [heartRate, isLive, height, isFrozen, strokeColor, fillColor, backgroundColor]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 shadow-inner select-none">
      {/* Top telemetry tags (only when enabled, avoiding overlap in compact cards) */}
      {showTelemetryLabels && (
        <div className="absolute top-2.5 left-3.5 z-10 flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black/40 text-cyan-300 border border-cyan-500/30">
            PLETH (PPG)
          </span>
          <span className="font-mono text-[10px] font-semibold text-white/80">
            Gain: x1.0 · Speed: 25mm/s
          </span>
        </div>
      )}

      {showTelemetryLabels && isLive && heartRate > 0 && (
        <div className="absolute top-2.5 right-3.5 z-10 flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE PULSE: {heartRate} BPM
          </span>
        </div>
      )}

      {/* Main Canvas Waveform */}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px`, display: "block" }}
      />

      {/* Bottom Monitor Control Bar (matches photo: Freeze, Alm OFF, Key) */}
      {showControls && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0b0f22] border-t border-slate-700/60 text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFrozen(!isFrozen)}
              className={`px-3 py-0.5 rounded font-bold transition-colors border ${
                isFrozen
                  ? "bg-amber-500 text-black border-amber-400"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600"
              }`}
            >
              {isFrozen ? "FROZEN" : "Freeze"}
            </button>

            <span className="px-2.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
              Key Lock
            </span>
          </div>

          <div className="text-[10px] text-cyan-400/90 font-mono hidden sm:block">
            SpO₂: {spo2}% · Optical AC/DC Modulated
          </div>
        </div>
      )}
    </div>
  );
}
