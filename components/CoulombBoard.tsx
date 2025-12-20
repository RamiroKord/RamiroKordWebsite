import React, { useState, useEffect } from 'react';
import { Undo2, Redo2, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Configuration & Constants ---
const LIMITS = {
  CHARGE: { MIN: -20, MAX: 20 },
  DISTANCE: { MIN: 0.25, MAX: 15 },
};

const MAX_FORCE = 1.44e13; 

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const clamp = (val: number, min: number, max: number) => 
  Math.max(min, Math.min(max, val));

type SimulationState = {
  q1: string | number; 
  q2: string | number; 
  distance: string | number; 
};

export default function CoulombBoard() {
  const [history, setHistory] = useState<SimulationState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentState, setCurrentState] = useState<SimulationState>({
    q1: "5.0",
    q2: "-5.0",
    distance: "7.5",
  });

  const [kConstant, setKConstant] = useState(8.99e9);

  useEffect(() => {
    if (history.length === 0) {
      setHistory([currentState]);
      setHistoryIndex(0);
    }
  }, []);

  const updateState = (newState: Partial<SimulationState>) => {
    const nextState = { ...currentState, ...newState };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentState(nextState);
  };

  const handleManualInput = (key: keyof SimulationState, value: string) => {
    // 1. Allow intermediate states like signs and empty fields
    if (value === '' || value === '-' || value === '.') {
      setCurrentState(prev => ({ ...prev, [key]: value }));
      return;
    }

    // 2. Limit decimals to exactly 4 digits post-dot
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1] && parts[1].length > 4) return;
    }

    // 3. Clean leading zeros while preserving decimals like "0.5"
    const cleanValue = value.replace(/^0+(?=\d)/, '');

    // 4. Validate and clamp numeric range
    const num = parseFloat(cleanValue);
    if (!isNaN(num)) {
      const isDistance = key === 'distance';
      const limit = isDistance ? LIMITS.DISTANCE : LIMITS.CHARGE;
      
      if (num > limit.MAX) {
        updateState({ [key]: limit.MAX.toString() });
      } else if (num < limit.MIN && value !== '-') {
        updateState({ [key]: limit.MIN.toString() });
      } else {
        setCurrentState(prev => ({ ...prev, [key]: cleanValue }));
      }
    }
  };

  const handleSliderChange = (key: keyof SimulationState, val: number) => {
    updateState({ [key]: val.toString() });
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentState(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentState(history[historyIndex + 1]);
    }
  };

  const getNum = (val: string | number) => parseFloat(val.toString()) || 0;

  const q1Num = getNum(currentState.q1);
  const q2Num = getNum(currentState.q2);
  const distNum = getNum(currentState.distance);

  const forceMagnitude = (kConstant * Math.abs(q1Num * q2Num)) / (distNum ** 2 || 1);
  const isRepelling = (q1Num * q2Num) > 0; 
  const isNeutral = q1Num === 0 || q2Num === 0;

  const forceRatio = isNeutral ? 0 : Math.sqrt(forceMagnitude / MAX_FORCE);
  const dynamicIconSize = 32 + (forceRatio * 48);

  const toggleK = () => setKConstant(prev => prev === 8.99e9 ? 9e9 : 8.99e9);
  const togglePolarity = (charge: 'q1' | 'q2') => {
    const currentVal = getNum(currentState[charge]);
    updateState({ [charge]: (currentVal * -1).toString() });
  };

  const getChargeColorClass = (val: number) => {
    if (val > 0) return "text-blue-600";
    if (val < 0) return "text-orange-500";
    return "text-slate-400";
  };

  const getSliderAccentClass = (val: number) => {
    if (val > 0) return "accent-blue-600";
    if (val < 0) return "accent-orange-500";
    return "accent-slate-400";
  };

  const formatScientific = (num: number) => {
    if (num === 0) return "0";
    const parts = num.toExponential(2).split('e');
    return (
      <span className="font-mono">
        {parts[0]} × 10<sup>{parts[1].replace('+', '')}</sup>
      </span>
    );
  };

  const ChargeSphere = ({ val, id }: { val: number, id: 'q1' | 'q2' }) => {
    const isQ1 = id === 'q1';
    const arrowPosition = isQ1 ? (isRepelling ? "-left-20" : "left-24") : (isRepelling ? "-right-20" : "right-24");
    const arrowRotation = isQ1 ? (isRepelling ? "rotate-180" : "rotate-0") : (isRepelling ? "rotate-0" : "rotate-180");

    return (
      <div className="relative group">
        <button
          onClick={() => togglePolarity(id)}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl transition-all duration-300 border-4 relative z-30",
            val > 0 ? "bg-blue-600 border-blue-800" : "bg-orange-500 border-orange-700",
            val === 0 && "bg-gray-400 border-gray-600"
          )}
        >
          {val > 0 ? `+${val.toFixed(1)}` : val < 0 ? val.toFixed(1) : "0"}
        </button>

        {!isNeutral && forceMagnitude > 0.1 && (
          <div className={cn("absolute top-1/2 -translate-y-1/2 transition-all duration-500 z-20", arrowPosition, arrowRotation)}>
               <ArrowRight size={35} strokeWidth={5} color="black" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-sm font-sans my-8">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-700">Coulomb's Law Simulator</h3>
        <div className="flex gap-2">
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors">
            <Undo2 className="w-5 h-5 text-slate-600" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors">
            <Redo2 className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="relative h-64 bg-white border border-slate-200 rounded-lg mb-8 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="flex items-center justify-center transition-all duration-500" style={{ gap: `${distNum * 35}px` }}>
          <ChargeSphere val={q1Num} id="q1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center pointer-events-none z-10">
              <div className="h-0.5 bg-slate-300 relative flex items-center justify-center transition-all duration-500" style={{ width: `${distNum * 35}px` }}>
                 <span className="absolute -top-7 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-mono border text-slate-500">
                    r = {distNum.toFixed(2)}m
                 </span>
              </div>
          </div>
          <ChargeSphere val={q2Num} id="q2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Charge 1 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-600">Charge 1 (q₁)</label>
          <input 
            type="range" 
            min={LIMITS.CHARGE.MIN} 
            max={LIMITS.CHARGE.MAX} 
            step="0.1" 
            value={q1Num} 
            onChange={(e) => handleSliderChange('q1', parseFloat(e.target.value))} 
            className={cn("w-full cursor-pointer", getSliderAccentClass(q1Num))} 
          />
          <div className="flex items-center justify-center p-2 border rounded bg-white focus-within:ring-1 focus-within:ring-slate-400 transition-shadow">
            <input 
              type="text" 
              value={currentState.q1} 
              onChange={(e) => handleManualInput('q1', e.target.value)} 
              className="w-20 bg-transparent text-right font-mono focus:outline-none" 
            />
            <span className="ml-1 text-slate-700 font-mono font-bold">C</span>
          </div>
        </div>

        {/* Distance */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-600">Distance (r)</label>
          <input 
            type="range" 
            min={LIMITS.DISTANCE.MIN} 
            max={LIMITS.DISTANCE.MAX} 
            step="0.1" 
            value={distNum} 
            onChange={(e) => handleSliderChange('distance', parseFloat(e.target.value))} 
            className="w-full accent-slate-800 cursor-pointer" 
          />
          <div className="flex items-center justify-center p-2 border rounded bg-white focus-within:ring-1 focus-within:ring-slate-400 transition-shadow">
            <input 
              type="text" 
              value={currentState.distance} 
              onChange={(e) => handleManualInput('distance', e.target.value)} 
              className="w-20 bg-transparent text-right font-mono focus:outline-none" 
            />
            <span className="ml-1 text-slate-700 font-mono font-bold">m</span>
          </div>
        </div>

        {/* Charge 2 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-600">Charge 2 (q₂)</label>
          <input 
            type="range" 
            min={LIMITS.CHARGE.MIN} 
            max={LIMITS.CHARGE.MAX} 
            step="0.1" 
            value={q2Num} 
            onChange={(e) => handleSliderChange('q2', parseFloat(e.target.value))} 
            className={cn("w-full cursor-pointer", getSliderAccentClass(q2Num))} 
          />
          <div className="flex items-center justify-center p-2 border rounded bg-white focus-within:ring-1 focus-within:ring-slate-400 transition-shadow">
            <input 
              type="text" 
              value={currentState.q2} 
              onChange={(e) => handleManualInput('q2', e.target.value)} 
              className="w-20 bg-transparent text-right font-mono focus:outline-none" 
            />
            <span className="ml-1 text-slate-700 font-mono font-bold">C</span>
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-slate-100 p-6 rounded-lg border border-slate-200">
        <div className="font-mono text-lg text-slate-700 space-y-4">
            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex items-center gap-2">
              <span className="text-slate-400">F = </span>
              <button onClick={toggleK} className="text-blue-600 font-bold">{kConstant === 8.99e9 ? "8.99" : "9"} × 10⁹</button>
              <span className="text-slate-400 mx-1">·</span>
              <span className="inline-flex flex-col items-center align-middle">
                 <div className="px-1 flex items-center gap-1 leading-none pb-1">
                   <span className={cn("font-bold", getChargeColorClass(q1Num))}>|{q1Num.toFixed(1)}|</span> 
                   <span className="text-slate-400">·</span> 
                   <span className={cn("font-bold", getChargeColorClass(q2Num))}>|{q2Num.toFixed(1)}|</span>
                 </div>
                 <div className="w-full h-[2px] bg-slate-800"></div>
                 <div className="pt-1 leading-none">
                   <span className="text-slate-800 font-bold">{distNum.toFixed(1)}²</span>
                 </div>
              </span>
            </div>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[220px] border-l border-slate-200 pl-6">
            <div className="h-20 flex items-center justify-center">
              <Zap 
                className={cn(
                  "text-yellow-500 transition-all duration-300 drop-shadow-md",
                  isNeutral && "opacity-30"
                )} 
                size={dynamicIconSize} 
                fill="currentColor" 
              />
            </div>
            <div className="text-xl font-bold text-slate-800 mt-2 text-center">
              {isNeutral ? "0.00" : formatScientific(forceMagnitude)} 
              <span className="text-sm font-normal text-slate-500 ml-1">N</span>
            </div>
            <div className={cn("text-xs uppercase tracking-wider font-bold mt-1", isNeutral ? "text-slate-400" : isRepelling ? "text-red-500" : "text-blue-500")}>
              {isNeutral ? "Equilibrium" : isRepelling ? "Repelling" : "Attracting"}
            </div>
        </div>
      </div>
    </div>
  );
}