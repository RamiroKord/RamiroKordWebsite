import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { LucideTarget, LucideGrid, LucideZap, LucideMove, LucideChevronRight, LucideChevronLeft, LucideRotateCcw } from 'lucide-react';

// --- 1. CONSTANTS & TYPES ---

const WORLD_SCALE = 80; // 80 pixels = 1 meter
const K_CONST = 9e9; // Coulomb's constant (simplified for visual scaling usually, but we use real math then scale visuals)
const MIN_DISTANCE = 0.5; // Meters
const CANVAS_SIZE = 800;
const VIEW_RANGE = 5; // -5 to +5 meters viewbox

interface Charge {
  id: string;
  x: number; // meters
  y: number; // meters
  q: number; // microCoulombs (µC)
  color: string;
}

interface Vector2 {
  x: number;
  y: number;
}

interface ForceVector extends Vector2 {
  mag: number;
  angle: number; // radians
  label: string;
  color: string;
  origin: Vector2; // where the vector starts
}

// --- 2. PHYSICS ENGINE (HOOK) ---

const usePhysics = (charges: Charge[], targetId: string) => {
  return useMemo(() => {
    const target = charges.find((c) => c.id === targetId);
    if (!target) return { netForce: null, forces: [], equilibrium: null };

    const forces: ForceVector[] = [];
    let sumFx = 0;
    let sumFy = 0;

    charges.forEach((source) => {
      if (source.id === targetId) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // Singularity Guard
      const effectiveDist = Math.max(dist, MIN_DISTANCE);
      
      // Coulomb's Law: F = k * |q1*q2| / r^2
      // We work in microCoulombs, so 1e-6 * 1e-6 = 1e-12
      const magnitude = (K_CONST * Math.abs(target.q * 1e-6 * source.q * 1e-6)) / (effectiveDist * effectiveDist);
      
      // Direction
      const angle = Math.atan2(dy, dx);
      const isRepulsive = (target.q * source.q) > 0;
      const forceAngle = isRepulsive ? angle : angle + Math.PI;

      const fx = magnitude * Math.cos(forceAngle);
      const fy = magnitude * Math.sin(forceAngle);

      sumFx += fx;
      sumFy += fy;

      forces.push({
        x: fx,
        y: fy,
        mag: magnitude,
        angle: forceAngle,
        label: `F_{${target.id}${source.id}}`,
        color: source.color,
        origin: { x: target.x, y: target.y }
      });
    });

    const netMag = Math.sqrt(sumFx * sumFx + sumFy * sumFy);
    const netAngle = Math.atan2(sumFy, sumFx);

    const netForce: ForceVector = {
      x: sumFx,
      y: sumFy,
      mag: netMag,
      angle: netAngle,
      label: 'F_{net}',
      color: '#ef4444', // Red-500
      origin: { x: target.x, y: target.y }
    };

    // Advanced: Zero Point Approximation (Simplified 1D-like logic for visual demo or heuristic search for 2D)
    // For this demo, we calculate the centroid of charges weighted by abs(q) as a heuristic start point, 
    // but a true analytical 3-body equilibrium solver is complex. 
    // Instead, we just show where the net field is minimal if we had a probe.
    // For simplicity in this scope, we skip the complex zero-point solver to focus on the vectors.
    
    return { netForce, forces };
  }, [charges, targetId]);
};

// --- 3. HELPER FUNCTIONS ---

const logClampScale = (forceMag: number) => {
  // Visual scaling: Logarithmic to handle huge dynamic range of Coulomb forces
  // Base size + log growth
  if (forceMag === 0) return 0;
  // Tweaked for visual comfort on screen
  return 0.5 + Math.log10(1 + forceMag * 1000) * 0.8;
};

const toScreen = (val: number) => (val + VIEW_RANGE) * WORLD_SCALE;
const toLogical = (screenVal: number) => (screenVal / WORLD_SCALE) - VIEW_RANGE;

// --- 4. COMPONENTS ---

// 4.1 Reusable Vector Arrow
const VectorArrow = ({ 
  origin, 
  vec, 
  scale, 
  isDashed = false, 
  showComponents = false, 
  label,
  animateOrigin = false
}: { 
  origin: Vector2, 
  vec: ForceVector, 
  scale: number, 
  isDashed?: boolean, 
  showComponents?: boolean,
  label?: string
  animateOrigin?: boolean
}) => {
  const length = scale; // Already scaled by caller or passed raw? Let's use magnitude passed in logClamp
  
  // Calculate tip in logical coordinates
  const tipX = origin.x + vec.mag * Math.cos(vec.angle) * (scale / vec.mag); 
  const tipY = origin.y + vec.mag * Math.sin(vec.angle) * (scale / vec.mag);

  // Convert to screen pixels for SVG
  const sx1 = toScreen(origin.x);
  const sy1 = toScreen(-origin.y); // Y-flip for canvas
  const sx2 = toScreen(tipX);
  const sy2 = toScreen(-tipY);

  const arrowId = `arrow-${label}-${Math.random()}`;

  return (
    <motion.g
      initial={false}
      animate={{ x: 0, y: 0 }} // Just used to trigger re-renders if needed
    >
      {/* Components (Phase 2) */}
      {showComponents && (
        <>
          <line x1={sx1} y1={sy1} x2={sx2} y2={sy1} stroke={vec.color} strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
          <line x1={sx2} y1={sy1} x2={sx2} y2={sy2} stroke={vec.color} strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
          <text x={sx1 + (sx2-sx1)/2} y={sy1 + 15} fill={vec.color} fontSize="12" textAnchor="middle">x</text>
          <text x={sx2 + 10} y={sy1 + (sy2-sy1)/2} fill={vec.color} fontSize="12" textAnchor="start">y</text>
        </>
      )}

      {/* Main Shaft */}
      <motion.line 
        x1={sx1} y1={sy1} x2={sx2} y2={sy2} 
        stroke={vec.color} 
        strokeWidth={isDashed ? 2 : 4}
        strokeDasharray={isDashed ? "8,4" : "0"}
        markerEnd={`url(#head-${arrowId})`}
        initial={animateOrigin ? { x1: sx1 - (sx2-sx1), y1: sy1 - (sy2-sy1) } : {}}
        animate={{ x1: sx1, y1: sy1, x2: sx2, y2: sy2 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
      
      {/* Marker Definition */}
      <defs>
        <marker id={`head-${arrowId}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={vec.color} />
        </marker>
      </defs>

      {/* Label */}
      {label && (
        <foreignObject x={sx2 + 10} y={sy2 - 20} width="100" height="80">
           <div 
				style={{ 
				color: vec.color, 
				fontSize: '30px', 
				fontWeight: 'bold',
				lineHeight: '1' 
			}}
		>
		
             <InlineMath math={label} />
           </div>
        </foreignObject>
      )}
    </motion.g>
  );
};

// 4.2 The Main Application
export default function PhysicsVectorApp() {
  // State
  const [charges, setCharges] = useState<Charge[]>([
    { id: 'q1', x: 0, y: 0, q: 2, color: '#3b82f6' }, // Target (Blue)
    { id: 'q2', x: 2, y: 1, q: -3, color: '#10b981' }, // Source 1 (Green)
    { id: 'q3', x: -1.5, y: 2, q: 4, color: '#f59e0b' }, // Source 2 (Amber)
  ]);
  const [targetId, setTargetId] = useState('q1');
  const [phase, setPhase] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [ghost, setGhost] = useState<{id: string, x: number, y: number} | null>(null);

  // Logic
  const { forces, netForce } = usePhysics(charges, targetId);
  
  // Drag Handling
  const handleDrag = (id: string, delta: {x: number, y: number}) => {
    setCharges(prev => prev.map(c => {
      if (c.id !== id) return c;
      // Convert pixel delta to logical meters
      const dx = delta.x / WORLD_SCALE;
      const dy = -delta.y / WORLD_SCALE; // Y-flip
      return { ...c, x: c.x + dx, y: c.y + dy };
    }));
  };

  // Phase Descriptions
  const phases = [
    { title: "Pairwise Interactions", desc: "Coulomb forces act individually between the target and each source." },
    { title: "Vector Decomposition", desc: "Forces are vectors. We can break them into x and y components." },
    { title: "Head-to-Tail Addition", desc: "To find the sum, slide the second vector to the tip of the first." },
    { title: "Resultant Net Force", desc: "The Net Force connects the start to the final tip." },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-800 overflow-hidden font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LucideZap className="text-yellow-500" fill="currentColor" />
            Vector Superposition Lab
          </h1>
          <p className="text-xs text-gray-500">Interactive Coulomb's Law Visualizer</p>
        </div>
        
        {/* Stepper Controls */}
        <div className="flex items-center gap-4 bg-gray-100 p-1 rounded-lg">
           <button 
             onClick={() => setPhase(p => Math.max(1, p - 1))}
             disabled={phase === 1}
             className="p-2 hover:bg-white rounded disabled:opacity-30 transition"
           >
             <LucideChevronLeft size={20} />
           </button>
           <div className="text-center w-48">
             <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Phase {phase}/4</span>
             <div className="text-sm font-semibold text-blue-600">{phases[phase-1].title}</div>
           </div>
           <button 
             onClick={() => setPhase(p => Math.min(4, p + 1))}
             disabled={phase === 4}
             className="p-2 hover:bg-white rounded disabled:opacity-30 transition"
           >
             <LucideChevronRight size={20} />
           </button>
        </div>

        <div className="flex gap-2">
           <button 
             onClick={() => setShowGrid(!showGrid)} 
             className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
             title="Toggle Grid"
           >
             <LucideGrid size={20} />
           </button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: INSPECTOR PANEL */}
        <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col gap-6 shadow-xl z-10">
          
          {/* Target Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400">Target Charge</label>
            <div className="flex gap-2">
              {charges.map(c => (
                <button
                  key={c.id}
                  onClick={() => setTargetId(c.id)}
                  className={`flex-1 py-2 rounded font-bold text-sm border-2 transition ${
                    targetId === c.id 
                      ? `border-blue-500 bg-blue-50 text-blue-700` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {c.id}
                </button>
              ))}
            </div>
          </div>

          {/* Value Sliders */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase text-gray-400">Charge Values (µC)</label>
            {charges.map(c => (
              <div key={c.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-mono font-bold" style={{color: c.color}}>{c.id}</span>
                  <span className="font-mono">{c.q > 0 ? '+' : ''}{c.q} µC</span>
                </div>
                <input 
                  type="range" min="-10" max="10" step="1"
                  value={c.q}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCharges(prev => prev.map(ch => ch.id === c.id ? {...ch, q: val} : ch));
                  }}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>

          <hr />

          {/* Math Feed */}
          <div className="space-y-3">
             <div className="flex items-center gap-2">
               <LucideRotateCcw size={14} className="text-gray-400" />
               <label className="text-xs font-bold uppercase text-gray-400">Calculation Feed</label>
             </div>
             
             <div className="text-sm bg-slate-50 p-3 rounded border border-slate-200 font-mono space-y-3">
               {/* Phase 1 & 2 Math */}
               {(phase === 1 || phase === 2) && (
                 <div>
                   <div className="text-xs text-gray-500 mb-1">Pairwise Forces (Coulomb):</div>
                   {forces.map((f, i) => (
                     <div key={i} className="mb-2" style={{color: f.color}}>
                       <InlineMath math={`${f.label} = \\frac{k|q_1 q_2|}{r^2} = ${f.mag.toExponential(1)} N`} />
                     </div>
                   ))}
                 </div>
               )}

               {/* Phase 2 Math */}
               {phase === 2 && (
                 <div>
                    <div className="text-xs text-gray-500 mb-1 mt-2">Vector Decomposition:</div>
                    {forces.map((f, i) => (
                      <div key={i} className="mb-1 text-xs" style={{color: f.color}}>
                        <InlineMath math={`${f.label}_x = ${f.mag.toFixed(2)}\\cos(${Math.round(f.angle*180/Math.PI)}^\\circ)`} />
                      </div>
                    ))}
                 </div>
               )}

               {/* Phase 3 & 4 Math */}
               {(phase >= 3) && (
                 <div>
                   <div className="text-xs text-gray-500 mb-1">Sum of Components:</div>
                   <div className="mb-1 text-xs"><InlineMath math={`\\sum F_x = ${netForce?.x.toExponential(2)} N`} /></div>
                   <div className="mb-1 text-xs"><InlineMath math={`\\sum F_y = ${netForce?.y.toExponential(2)} N`} /></div>
                 </div>
               )}

               {phase === 4 && (
                 <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="text-xs text-red-500 font-bold mb-1">Resultant Magnitude:</div>
                    <div className="text-red-600 font-bold">
                       <InlineMath math={`|F_{net}| = \\sqrt{F_x^2 + F_y^2}`} />
                       <div className="mt-1"><InlineMath math={`= ${netForce?.mag.toExponential(2)} N`} /></div>
                    </div>
                 </div>
               )}
             </div>
          </div>
          
          <div className="mt-auto bg-blue-50 p-3 rounded text-sm text-blue-800">
            <p className="font-bold">Instructions:</p>
            <p>{phases[phase-1].desc}</p>
          </div>

        </div>

        {/* RIGHT: INTERACTIVE CANVAS */}
        <div className="flex-1 relative bg-slate-50 cursor-crosshair overflow-hidden">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            className="select-none"
          >
             {/* 1. Grid Layer */}
             <defs>
                <pattern id="grid" width={WORLD_SCALE} height={WORLD_SCALE} patternUnits="userSpaceOnUse">
                  <path d={`M ${WORLD_SCALE} 0 L 0 0 0 ${WORLD_SCALE}`} fill="none" stroke="#e2e8f0" strokeWidth="1"/>
                </pattern>
             </defs>
             {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}

             {/* Coordinate Axes */}
             <line x1={CANVAS_SIZE/2} y1={0} x2={CANVAS_SIZE/2} y2={CANVAS_SIZE} stroke="#cbd5e1" strokeWidth="2" />
             <line x1={0} y1={CANVAS_SIZE/2} x2={CANVAS_SIZE} y2={CANVAS_SIZE/2} stroke="#cbd5e1" strokeWidth="2" />

             {/* 2. Ghost Layer (Interaction) */}
             {ghost && (
               <circle 
                 cx={toScreen(ghost.x)} cy={toScreen(-ghost.y)} r={20} 
                 fill="none" stroke="black" strokeDasharray="4,4" opacity="0.3" 
               />
             )}

             {/* 3. Physics Vector Layer */}
             <AnimatePresence>
               {forces.map((f, i) => {
                 // Logic for Phase 3 "Slide"
                 // If Phase 3, the SECOND force (i=1) moves to the tip of the FIRST force (i=0)
                 // This assumes 2 sources for simplicity of the "Head-to-Tail" demo
                 let visualOrigin = f.origin;
                 
                 if (phase >= 3 && i > 0) {
                    const prevF = forces[i-1];
                    const prevScale = logClampScale(prevF.mag);
                    // Tip of previous
                    visualOrigin = {
                        x: prevF.origin.x + prevF.mag * Math.cos(prevF.angle) * (prevScale / prevF.mag),
                        y: prevF.origin.y + prevF.mag * Math.sin(prevF.angle) * (prevScale / prevF.mag)
                    };
                 }

                 // Only show individual components in Phase 1, 2, 3
                 if (phase === 4 && i !== -1) { /* We usually hide components in final view or keep them faint? Let's fade them */ }
                 
                 const opacity = phase === 4 ? 0.2 : 1;
                 const scale = logClampScale(f.mag);

                 return (
                   <motion.g key={`force-${i}`} initial={{ opacity: 0 }} animate={{ opacity }}>
                      <VectorArrow 
                         origin={visualOrigin}
                         vec={f}
                         scale={scale}
                         label={f.label}
                         showComponents={phase === 2}
                         animateOrigin={phase === 3} // Trigger Framer Motion layout transition
                      />
                   </motion.g>
                 )
               })}
             </AnimatePresence>

             {/* 4. Resultant Force Layer */}
             {phase === 4 && netForce && (
                <VectorArrow 
                   origin={netForce.origin}
                   vec={netForce}
                   scale={logClampScale(netForce.mag)}
                   label="F_{net}"
                />
             )}

             {/* 5. Charges Layer (Draggable)*/}
			 {charges.map((c) => {
				const sx = toScreen(c.x);
				const sy = toScreen(-c.y);
				const isTarget = c.id === targetId;

				// Visual Styling Constants
				const visualRadius = isTarget ? 42 : 30;
				const hitAreaRadius = 50;
				const fontSize = 32; 
				const strokeWidth = isTarget ? 6 : 4;

				return (
					<motion.g 
						key={c.id}
						drag
						dragMomentum={false}
						onDragStart={() => setGhost({ id: c.id, x: c.x, y: c.y })}
						onDragEnd={() => setGhost(null)}
						onDrag={(e, info) => handleDrag(c.id, info.delta)}
						className="cursor-grab active:cursor-grabbing"
					>
						{/* A. Interaction Hit Area (Invisible but large) */}
						<circle 
							cx={sx} 
							cy={sy} 
							r={hitAreaRadius} 
							fill="transparent" 
						/>
       
						{/* B. Selection Ring (If Active) */}
						{isTarget && (
							<circle 
								cx={sx} 
								cy={sy} 
								r={visualRadius + 8} 
								fill="none" 
								stroke={c.color} 
								strokeWidth="3" 
								strokeDasharray="6,4" 
								opacity="0.6"
								className="animate-spin-slow" // Ensure you have a slow spin animation or remove class
							/>
						)}

						{/* C. The Visual Body */}
						<circle 
							cx={sx} 
							cy={sy} 
							r={visualRadius} 
							fill={c.color} 
							stroke="white" 
							strokeWidth={strokeWidth}
							// SVG filters can be expensive, so we use a simple Tailwind shadow class on the parent
							// or standard SVG shadow if strictly inside SVG. 
							// For pure SVG, simple stroke is often cleanest, but let's make it pop:
							style={{ filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.25))" }}
						/>
       
						{/* D. Charge Label (Text) */}
						<text 
							x={sx} 
							y={sy} 
							dy={6} // Vertical centering adjustment
							textAnchor="middle" 
							fill="white" 
							fontSize={fontSize} 
							fontWeight="800" // Extra bold
							pointerEvents="none"
							style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.5)" }} // Text legibility
						>
							{c.q > 0 ? '+' : ''}{c.q}
						</text>
       
						{/* E. ID Label (Floating above) - Optional, helps identify q1 vs q2 */}
						<text
							x={sx}
							y={sy - visualRadius - 8}
							textAnchor="middle"
							fill={c.color}
							fontWeight="bold"
							fontSize="24"
							className="bg-white" // SVG doesn't support bg class on text, but fill works
							stroke="white" strokeWidth="4" paintOrder="stroke" // Halo effect for readability over grid
						>
							{c.id}
						</text>
					</motion.g>
				)
			})}

          </svg>
          
          {/* Overlay Hints */}
          <div className="absolute bottom-4 left-4 text-xs text-gray-400 pointer-events-none">
            Scale: 1 grid square = 1 meter
          </div>
        </div>

      </div>
    </div>
  );
}