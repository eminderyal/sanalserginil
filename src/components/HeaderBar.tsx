import React from 'react';
import {
  Sun,
  Sunset,
  Moon,
  Footprints,
  Orbit,
  Lock,
  Play,
  Pause,
} from 'lucide-react';
import { TimeOfDay, CameraMode } from '../types';

interface HeaderBarProps {
  timeOfDay: TimeOfDay;
  onTimeOfDayChange: (time: TimeOfDay) => void;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  isTouring: boolean;
  onToggleTour: () => void;
  onOpenAdmin: () => void;
  exhibitsCount: number;
  isCloudSynced?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  timeOfDay,
  onTimeOfDayChange,
  cameraMode,
  onCameraModeChange,
  isTouring,
  onToggleTour,
  onOpenAdmin,
  exhibitsCount,
  isCloudSynced,
}) => {
  return (
    <header
      id="exhibition-header-bar"
      className="fixed top-0 inset-x-0 z-30 px-2 sm:px-6 py-2 sm:py-3 bg-stone-950/85 backdrop-blur-md border-b border-stone-800/80 flex items-center justify-between transition-all select-none"
    >
      {/* Title & Brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg border border-amber-500/40 text-stone-950 font-serif font-black text-sm shrink-0">
          🏛️
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-serif font-bold text-xs sm:text-base tracking-wide text-amber-100 truncate">
              BBGNIGTH Türkiye
            </h1>
            {isCloudSynced && (
              <span
                id="cloud-synced-indicator"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0"
                title="Bulut Veritabanı ile Canlı Senkronize"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden xs:inline">Canlı</span>
              </span>
            )}
          </div>
          {exhibitsCount > 0 && (
            <p className="text-[10px] font-serif tracking-widest text-stone-400 uppercase hidden sm:block">
              {exhibitsCount} Eser Kaidelerde Sergileniyor
            </p>
          )}
        </div>
      </div>

      {/* Center Controls: View Modes & Time of Day */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Time of Day Segmented Control */}
        <div className="flex items-center bg-stone-900/90 rounded-xl p-0.5 border border-stone-800">
          <button
            id="time-day-btn"
            onClick={() => onTimeOfDayChange('day')}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors ${
              timeOfDay === 'day'
                ? 'bg-amber-500 text-stone-950 font-medium shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Gündüz (Öğle Vakti)"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-serif">Gündüz</span>
          </button>

          <button
            id="time-sunset-btn"
            onClick={() => onTimeOfDayChange('sunset')}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors ${
              timeOfDay === 'sunset'
                ? 'bg-amber-500 text-stone-950 font-medium shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Gün Batımı (Kızıl Gökyüzü)"
          >
            <Sunset className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-serif">Gün Batımı</span>
          </button>

          <button
            id="time-night-btn"
            onClick={() => onTimeOfDayChange('night')}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors ${
              timeOfDay === 'night'
                ? 'bg-amber-500 text-stone-950 font-medium shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Gece & Yıldızlar ve Meşaleler"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-serif">Gece</span>
          </button>
        </div>

        {/* Camera Navigation Mode Switcher */}
        <div className="flex items-center bg-stone-900/90 rounded-xl p-0.5 border border-stone-800">
          <button
            id="cam-first-person-btn"
            onClick={() => onCameraModeChange('first_person')}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors ${
              cameraMode === 'first_person'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-serif'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Birinci Şahıs Yürüme Modu"
          >
            <Footprints className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-xs font-serif">Yürü</span>
          </button>

          <button
            id="cam-orbit-btn"
            onClick={() => onCameraModeChange('orbit')}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors ${
              cameraMode === 'orbit'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-serif'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Kuşbakışı / Yörünge Dron Görünümü"
          >
            <Orbit className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-xs font-serif">Yörünge</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Guided Tour, Admin Panel */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Guided Tour Autoplay */}
        <button
          id="toggle-virtual-tour-btn"
          onClick={onToggleTour}
          className={`min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-serif flex items-center justify-center gap-1.5 border transition-all active:scale-95 ${
            isTouring
              ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 animate-pulse'
              : 'bg-stone-900/90 text-stone-300 hover:text-amber-200 border-stone-800'
          }`}
          title={isTouring ? 'Turu Durdur' : 'Rehberli Sanal Turu Başlat'}
        >
          {isTouring ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span className="hidden md:inline">Tur</span>
        </button>

        {/* Admin Curator Portal Trigger */}
        <button
          id="header-admin-studio-btn"
          onClick={onOpenAdmin}
          className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-serif font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
          title="Yönetici Fotoğraf ve Eser Düzenleme Paneli"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Yönetim</span>
        </button>
      </div>
    </header>
  );
};
