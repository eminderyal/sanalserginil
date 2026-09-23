import { useState, useRef, useEffect } from 'react';
import { Viewport3D } from './components/Viewport3D';
import { HeaderBar } from './components/HeaderBar';
import { Minimap } from './components/Minimap';
import { ExhibitModal } from './components/ExhibitModal';
import { AdminModal } from './components/AdminModal';
import { ControlsGuide } from './components/ControlsGuide';
import { ExhibitionScene } from './scene/ExhibitionScene';
import { DEFAULT_EXHIBITS } from './data/defaultExhibits';
import { Exhibit, TimeOfDay, CameraMode, PlayerState } from './types';
import { soundManager } from './audio/soundManager';
import { subscribeToExhibits, syncAllExhibitsToCloud, testConnection } from './firebase';

export default function App() {
  // Exhibits State with persistent localStorage + Firestore real-time sync
  const [exhibits, setExhibits] = useState<Exhibit[]>(() => {
    try {
      const saved = localStorage.getItem('archaeo_exhibits_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const MOCK_IDS = new Set(['exhibit-1','exhibit-2','exhibit-3','exhibit-4','exhibit-5','exhibit-6','exhibit-7','exhibit-8']);
          const userOnly = parsed.filter((e) => e && e.id && !MOCK_IDS.has(e.id));
          return userOnly;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const [selectedExhibit, setSelectedExhibit] = useState<Exhibit | null>(null);
  const [hoveredExhibit, setHoveredExhibit] = useState<Exhibit | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night');
  const [cameraMode, setCameraMode] = useState<CameraMode>('first_person');
  const [playerState, setPlayerState] = useState<PlayerState>({ x: 0, z: 12, rotationY: 0 });
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const sceneRef = useRef<ExhibitionScene | null>(null);
  const tourTimerRef = useRef<number | null>(null);

  // Subscribe to real-time Cloud Firestore updates for all visitors
  useEffect(() => {
    testConnection().catch(console.warn);

    const MOCK_IDS = new Set(['exhibit-1','exhibit-2','exhibit-3','exhibit-4','exhibit-5','exhibit-6','exhibit-7','exhibit-8']);
    const unsubscribe = subscribeToExhibits(
      (cloudExhibits) => {
        const list = Array.isArray(cloudExhibits) ? cloudExhibits : [];
        const filtered = list.filter((e) => e && e.id && !MOCK_IDS.has(e.id));
        if (filtered.length > 0) {
          setExhibits(filtered);
          setIsCloudSynced(true);
          try {
            localStorage.setItem('archaeo_exhibits_data', JSON.stringify(filtered));
          } catch (e) {
            console.warn('Failed to cache exhibits locally', e);
          }
        } else {
          setIsCloudSynced(true);
        }
      },
      (error) => {
        console.warn('Firestore cloud connection / quota limit reached, operating in local mode:', error);
        setIsCloudSynced(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Persistence handler for saving and syncing across all users
  const handleSaveExhibits = async (newExhibits: Exhibit[]) => {
    setExhibits(newExhibits);
    try {
      localStorage.setItem('archaeo_exhibits_data', JSON.stringify(newExhibits));
    } catch (e) {
      console.warn('Failed to persist exhibits to localStorage', e);
    }

    try {
      await syncAllExhibitsToCloud(newExhibits);
      setIsCloudSynced(true);
    } catch (err) {
      console.warn('Operating in offline/local storage mode (cloud quota limit reached):', err);
      setIsCloudSynced(false);
    }
  };

  // Audio Toggle
  const handleToggleAudio = () => {
    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    soundManager.setMuted(nextState);
    if (!nextState) {
      soundManager.startAmbient();
    }
  };

  // Click on Exhibit Plinth in 3D canvas
  const handleExhibitClick = (exhibit: Exhibit) => {
    setSelectedExhibit(exhibit);
    if (sceneRef.current) {
      sceneRef.current.focusOnExhibit(exhibit);
    }
  };

  // Focus Camera onto Exhibit
  const handleFocusExhibit = (exhibit: Exhibit) => {
    setSelectedExhibit(exhibit);
    if (sceneRef.current) {
      sceneRef.current.focusOnExhibit(exhibit);
    }
  };

  // Teleport from Minimap click
  const handleTeleport = (x: number, z: number) => {
    if (sceneRef.current) {
      sceneRef.current.teleportToPosition(x, z);
    }
  };

  // Guided Tour Mode Cycle
  useEffect(() => {
    if (isTouring && exhibits.length > 0) {
      let tourIdx = selectedExhibit
        ? exhibits.findIndex((e) => e.id === selectedExhibit.id)
        : 0;
      if (tourIdx < 0) tourIdx = 0;

      // Immediately focus first tour target
      const current = exhibits[tourIdx];
      setSelectedExhibit(current);
      if (sceneRef.current) {
        sceneRef.current.focusOnExhibit(current);
      }

      tourTimerRef.current = window.setInterval(() => {
        tourIdx = (tourIdx + 1) % exhibits.length;
        const nextExhibit = exhibits[tourIdx];
        setSelectedExhibit(nextExhibit);
        if (sceneRef.current) {
          sceneRef.current.focusOnExhibit(nextExhibit);
        }
      }, 10000); // 10 seconds per stop
    } else {
      if (tourTimerRef.current) {
        clearInterval(tourTimerRef.current);
        tourTimerRef.current = null;
      }
    }

    return () => {
      if (tourTimerRef.current) {
        clearInterval(tourTimerRef.current);
      }
    };
  }, [isTouring, exhibits]);

  return (
    <div id="archaeological-exhibition-app" className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans">
      {/* 1. Main 3D WebGL Canvas Viewport */}
      <Viewport3D
        exhibits={exhibits}
        timeOfDay={timeOfDay}
        cameraMode={cameraMode}
        onExhibitClick={handleExhibitClick}
        onExhibitHover={setHoveredExhibit}
        onPlayerMove={setPlayerState}
        sceneRef={sceneRef}
      />

      {/* 2. Top Navigation & Experience Header Bar */}
      <HeaderBar
        timeOfDay={timeOfDay}
        onTimeOfDayChange={setTimeOfDay}
        cameraMode={cameraMode}
        onCameraModeChange={setCameraMode}
        isTouring={isTouring}
        onToggleTour={() => setIsTouring(!isTouring)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        exhibitsCount={exhibits.length}
        isCloudSynced={isCloudSynced}
      />

      {/* 3. Real-Time Archaeological Survey Radar / Minimap */}
      <Minimap
        playerState={playerState}
        exhibits={exhibits}
        selectedExhibit={selectedExhibit}
        onSelectExhibit={handleFocusExhibit}
        onTeleport={handleTeleport}
      />

      {/* 4. Controls HUD & Quick-Jump Plinth Carousel */}
      <ControlsGuide
        cameraMode={cameraMode}
        exhibits={exhibits}
        selectedExhibit={selectedExhibit}
        onSelectExhibit={handleFocusExhibit}
        onTouchJoystickMove={(x, y) => sceneRef.current?.setTouchJoystickMove(x, y)}
        onTouchLookDelta={(dx, dy) => sceneRef.current?.setTouchLookDelta(dx, dy)}
      />

      {/* 5. Hover Feedback Pill in center-bottom if hovering a 3D plinth */}
      {hoveredExhibit && !selectedExhibit && (
        <div
          id="hover-exhibit-pill"
          onClick={() => handleExhibitClick(hoveredExhibit)}
          className="fixed bottom-24 inset-x-0 mx-auto w-fit z-20 px-4 py-2 rounded-full bg-stone-950/90 text-amber-200 border border-amber-500/40 shadow-xl backdrop-blur-md flex items-center gap-2 cursor-pointer animate-in fade-in zoom-in-95 hover:bg-stone-900 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-serif font-semibold">{hoveredExhibit.title}</span>
          <span className="text-[10px] text-amber-400/80 uppercase font-mono ml-1">İncelemek için Tıkla</span>
        </div>
      )}

      {/* 6. Active Exhibit Inspection Modal / Audio Guide Drawer */}
      {selectedExhibit && (
        <ExhibitModal
          exhibit={selectedExhibit}
          allExhibits={exhibits}
          onClose={() => setSelectedExhibit(null)}
          onSelectExhibit={setSelectedExhibit}
          onFocus3D={handleFocusExhibit}
        />
      )}

      {/* 7. Admin Curator Portal & Image Upload Management Studio */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        exhibits={exhibits}
        onSaveExhibits={handleSaveExhibits}
        onFocusExhibit={handleFocusExhibit}
      />
    </div>
  );
}
