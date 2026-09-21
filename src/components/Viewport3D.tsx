import React, { useEffect, useRef } from 'react';
import { ExhibitionScene } from '../scene/ExhibitionScene';
import { Exhibit, TimeOfDay, CameraMode, PlayerState } from '../types';

interface Viewport3DProps {
  exhibits: Exhibit[];
  timeOfDay: TimeOfDay;
  cameraMode: CameraMode;
  onExhibitClick: (exhibit: Exhibit) => void;
  onExhibitHover: (exhibit: Exhibit | null) => void;
  onPlayerMove: (state: PlayerState) => void;
  sceneRef: React.MutableRefObject<ExhibitionScene | null>;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  exhibits,
  timeOfDay,
  cameraMode,
  onExhibitClick,
  onExhibitHover,
  onPlayerMove,
  sceneRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new ExhibitionScene(containerRef.current, exhibits, {
      onExhibitClick,
      onExhibitHover,
      onPlayerMove,
      timeOfDay,
      cameraMode,
    });
    sceneRef.current = scene;

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Update exhibits dynamically when admin adds/edits/deletes exhibits
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateExhibits(exhibits);
    }
  }, [exhibits]);

  // Update Time of Day
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTimeOfDay(timeOfDay);
    }
  }, [timeOfDay]);

  // Update Camera Mode
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setCameraMode(cameraMode);
    }
  }, [cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-stone-950">
      <div
        ref={containerRef}
        id="three-exhibition-canvas-container"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Minimalist Center Reticle Crosshair for First-Person Walk Mode */}
      {cameraMode === 'first_person' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30">
          <div className="w-2 h-2 rounded-full border border-amber-200/80 bg-stone-950/20" />
        </div>
      )}
    </div>
  );
};
