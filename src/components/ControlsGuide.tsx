import React, { useState } from 'react';
import { HelpCircle, ChevronUp, ChevronDown, Sparkles, Navigation, X } from 'lucide-react';
import { Exhibit } from '../types';

interface ControlsGuideProps {
  cameraMode: string;
  exhibits: Exhibit[];
  selectedExhibit: Exhibit | null;
  onSelectExhibit: (exhibit: Exhibit) => void;
  onTouchJoystickMove: (x: number, y: number) => void;
  onTouchLookDelta: (dx: number, dy: number) => void;
}

export const ControlsGuide: React.FC<ControlsGuideProps> = ({
  cameraMode,
  exhibits,
  selectedExhibit,
  onSelectExhibit,
}) => {
  const [showHelper, setShowHelper] = useState(true);
  const [isCarouselOpen, setIsCarouselOpen] = useState(true);

  return (
    <>
      {/* 1. Desktop Minimalist Navigation Helper Overlay (Top Right below header) */}
      {showHelper && (
        <div
          id="controls-guide-hud"
          className="fixed top-16 right-6 z-20 hidden md:flex flex-col gap-1.5 p-3 rounded-xl bg-stone-950/75 backdrop-blur-md border border-stone-800 text-stone-300 text-[11px] shadow-xl animate-in fade-in"
        >
          <div className="flex items-center justify-between gap-4 text-amber-300 font-serif pb-1 border-b border-stone-800">
            <span className="flex items-center gap-1 font-semibold text-[10px] tracking-widest uppercase">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Navigation Controls</span>
            </span>
            <button
              onClick={() => setShowHelper(false)}
              className="text-stone-500 hover:text-stone-300"
              title="Dismiss helper"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {cameraMode === 'first_person' ? (
            <div className="space-y-1 font-sans text-stone-300">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-amber-400 font-bold">W A S D / Arrows</span>
                <span>Walk Site</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-amber-400 font-bold">Mouse Drag</span>
                <span>Look Around</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-amber-400 font-bold">Shift</span>
                <span>Sprint</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-amber-400 font-bold">Click Plinth</span>
                <span>Inspect Artifact</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 font-sans text-stone-300">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-amber-400 font-bold">Left Drag</span>
                <span>Orbit Site</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-amber-400 font-bold">Scroll Wheel</span>
                <span>Zoom Altitude</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-amber-400 font-bold">Click Stand</span>
                <span>Focus Plinth</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* If Helper dismissed, show floating icon button to reopen */}
      {!showHelper && (
        <button
          onClick={() => setShowHelper(true)}
          className="fixed top-16 right-6 z-20 p-2 rounded-xl bg-stone-950/80 backdrop-blur-md border border-stone-800 text-stone-400 hover:text-amber-300 shadow-lg hidden md:block"
          title="Show Navigation Controls"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      )}

      {/* 2. Bottom Quick-Jump Plinths Carousel Dock */}
      <div
        id="exhibit-quick-jump-dock"
        className="fixed bottom-6 inset-x-0 mx-auto max-w-xl z-20 px-4 flex flex-col items-center pointer-events-none"
      >
        <div className="pointer-events-auto flex flex-col items-center">
          {/* Toggle Tab */}
          <button
            id="toggle-carousel-btn"
            onClick={() => setIsCarouselOpen(!isCarouselOpen)}
            className="px-3 py-1 rounded-t-lg bg-stone-950/80 text-[10px] font-serif uppercase tracking-widest text-amber-300 border-t border-x border-stone-800 backdrop-blur-md flex items-center gap-1 hover:bg-stone-900 transition-colors shadow-lg"
          >
            <span>Exhibition Plinths</span>
            {isCarouselOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Carousel Body */}
          {isCarouselOpen && (
            <div className="p-2 rounded-2xl bg-stone-950/85 backdrop-blur-md border border-stone-800 shadow-2xl flex items-center gap-2 overflow-x-auto max-w-full scrollbar-none animate-in slide-in-from-bottom-2">
              {exhibits.map((ex) => {
                const isSelected = selectedExhibit?.id === ex.id;
                return (
                  <button
                    key={ex.id}
                    id={`carousel-item-${ex.id}`}
                    onClick={() => onSelectExhibit(ex)}
                    className={`shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100 ring-2 ring-amber-400/30'
                        : 'bg-stone-900/70 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-stone-950 border border-stone-800 shrink-0">
                      <img src={ex.imageUrl} alt={ex.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left max-w-[110px]">
                      <p className="text-[11px] font-serif font-semibold truncate leading-tight">
                        {ex.title}
                      </p>
                      <p className="text-[9px] text-stone-400 truncate leading-none mt-0.5">
                        {ex.era}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
