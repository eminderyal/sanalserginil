import React, { useState } from 'react';
import { Compass, Maximize2, Minimize2, Navigation } from 'lucide-react';
import { Exhibit, PlayerState } from '../types';
import { SITE_ZONES } from '../data/defaultExhibits';

interface MinimapProps {
  playerState: PlayerState;
  exhibits: Exhibit[];
  selectedExhibit: Exhibit | null;
  onSelectExhibit: (exhibit: Exhibit) => void;
  onTeleport: (x: number, z: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerState,
  exhibits,
  selectedExhibit,
  onSelectExhibit,
  onTeleport,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredExhibit, setHoveredExhibit] = useState<Exhibit | null>(null);

  // Map coordinate range: -30 to +30 in 3D world maps to 0% - 100%
  const worldToMap = (x: number, z: number) => {
    const minCoord = -28;
    const maxCoord = 28;
    const mapX = ((x - minCoord) / (maxCoord - minCoord)) * 100;
    const mapY = ((z - minCoord) / (maxCoord - minCoord)) * 100;
    return { left: `${Math.max(4, Math.min(96, mapX))}%`, top: `${Math.max(4, Math.min(96, mapY))}%` };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickXPercent = (e.clientX - rect.left) / rect.width;
    const clickYPercent = (e.clientY - rect.top) / rect.height;

    const minCoord = -28;
    const maxCoord = 28;
    const worldX = minCoord + clickXPercent * (maxCoord - minCoord);
    const worldZ = minCoord + clickYPercent * (maxCoord - minCoord);

    onTeleport(worldX, worldZ);
  };

  const playerPos = worldToMap(playerState.x, playerState.z);
  const playerDeg = (playerState.rotationY * 180) / Math.PI;

  return (
    <div
      id="archaeological-minimap-container"
      className={`fixed transition-all duration-300 z-30 ${
        isExpanded
          ? 'bottom-6 left-6 w-96 h-96 sm:w-[440px] sm:h-[440px]'
          : 'bottom-6 left-6 w-52 h-52 sm:w-60 sm:h-60'
      } rounded-2xl border border-stone-700/80 bg-stone-950/85 backdrop-blur-md shadow-2xl p-3 flex flex-col`}
    >
      {/* Map Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800 text-stone-300">
        <div className="flex items-center gap-1.5 text-xs font-serif uppercase tracking-widest text-amber-300">
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <span>Site Survey Radar</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            id="toggle-expand-minimap"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-200 transition-colors"
            title={isExpanded ? 'Collapse Radar' : 'Expand Survey Map'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Map Canvas Frame */}
      <div
        id="minimap-interactive-canvas"
        onClick={handleMapClick}
        className="relative flex-1 mt-2 rounded-xl bg-stone-900/90 border border-stone-800/80 overflow-hidden cursor-crosshair group select-none"
      >
        {/* Radar concentric grid rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[85%] h-[85%] rounded-full border border-amber-500/40" />
          <div className="w-[55%] h-[55%] rounded-full border border-amber-500/40" />
          <div className="w-[25%] h-[25%] rounded-full border border-amber-500/40" />
          <div className="absolute w-full h-[1px] bg-amber-500/30" />
          <div className="absolute h-full w-[1px] bg-amber-500/30" />
        </div>

        {/* Central Agora Stone Platform outline */}
        <div className="absolute top-[25%] left-[25%] w-[50%] h-[50%] border-2 border-stone-600/70 bg-stone-800/30 rounded-sm pointer-events-none">
          <span className="absolute bottom-1 right-1 text-[9px] font-serif text-stone-400 tracking-wider">
            Agora
          </span>
        </div>

        {/* North Temple Ruins Outline */}
        <div className="absolute top-[8%] left-[30%] w-[40%] h-[12%] border border-stone-700 bg-stone-800/40 pointer-events-none flex items-center justify-center">
          <span className="text-[8px] text-stone-400 font-serif">Sanctuary Relics</span>
        </div>

        {/* Site Zone annotations when expanded */}
        {isExpanded &&
          SITE_ZONES.map((zone) => {
            const pos = worldToMap(zone.center[0], zone.center[1]);
            return (
              <div
                key={zone.id}
                style={{ left: pos.left, top: pos.top }}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[9px] text-amber-200/60 font-serif pointer-events-none text-center whitespace-nowrap bg-stone-950/70 px-1.5 py-0.5 rounded border border-stone-800"
              >
                {zone.name}
              </div>
            );
          })}

        {/* Exhibits Plinth Markers */}
        {exhibits.map((exhibit) => {
          const pos = worldToMap(exhibit.position[0], exhibit.position[2]);
          const isSelected = selectedExhibit?.id === exhibit.id;
          const isHovered = hoveredExhibit?.id === exhibit.id;

          return (
            <div
              key={exhibit.id}
              id={`minimap-pin-${exhibit.id}`}
              style={{ left: pos.left, top: pos.top }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectExhibit(exhibit);
              }}
              onMouseEnter={() => setHoveredExhibit(exhibit)}
              onMouseLeave={() => setHoveredExhibit(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform duration-200 hover:scale-150"
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all flex items-center justify-center shadow-lg ${
                  isSelected
                    ? 'bg-amber-400 border-white ring-4 ring-amber-400/40 scale-125'
                    : 'bg-amber-600/90 border-stone-900 hover:bg-amber-400'
                }`}
              >
                <div className="w-1 h-1 rounded-full bg-stone-950" />
              </div>
            </div>
          );
        })}

        {/* Player Position Indicator Beacon */}
        <div
          id="minimap-player-beacon"
          style={{ left: playerPos.left, top: playerPos.top }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
        >
          {/* Vision Cone */}
          <div
            style={{ transform: `rotate(${playerDeg}deg)` }}
            className="w-12 h-12 -ml-6 -mt-6 relative flex items-center justify-center transition-transform duration-75"
          >
            <div
              className="absolute top-0 w-8 h-8 opacity-40 bg-gradient-to-t from-transparent to-cyan-300 rounded-t-full"
              style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
            />
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-md flex items-center justify-center">
              <Navigation className="w-2 h-2 text-stone-950 fill-stone-950" />
            </div>
          </div>
        </div>
      </div>

      {/* Hover Tooltip or Selected Info */}
      <div className="mt-2 min-h-6 flex items-center justify-between text-[11px] text-stone-300 font-sans px-1">
        {hoveredExhibit ? (
          <div className="truncate text-amber-300 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="truncate">{hoveredExhibit.title}</span>
            <span className="text-stone-400 text-[10px]">({hoveredExhibit.era})</span>
          </div>
        ) : (
          <span className="text-stone-400 text-[10px]">Click anywhere to teleport</span>
        )}
        <span className="text-[10px] text-stone-400 font-mono">
          X:{Math.round(playerState.x)} Z:{Math.round(playerState.z)}
        </span>
      </div>
    </div>
  );
};
