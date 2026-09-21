import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Compass,
  FileText,
} from 'lucide-react';
import { Exhibit } from '../types';

interface ExhibitModalProps {
  exhibit: Exhibit;
  allExhibits: Exhibit[];
  onClose: () => void;
  onSelectExhibit: (exhibit: Exhibit) => void;
  onFocus3D: (exhibit: Exhibit) => void;
}

export const ExhibitModal: React.FC<ExhibitModalProps> = ({
  exhibit,
  allExhibits,
  onClose,
  onSelectExhibit,
  onFocus3D,
}) => {
  const [isZoomedImage, setIsZoomedImage] = useState(false);

  const currentIndex = allExhibits.findIndex((e) => e.id === exhibit.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allExhibits.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      const prev = allExhibits[currentIndex - 1];
      onSelectExhibit(prev);
      onFocus3D(prev);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const next = allExhibits[currentIndex + 1];
      onSelectExhibit(next);
      onFocus3D(next);
    }
  };

  return (
    <>
      {/* Lightbox full-screen zoom if toggled */}
      {isZoomedImage && (
        <div
          id="exhibit-lightbox-modal"
          onClick={() => setIsZoomedImage(false)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <img
            src={exhibit.imageUrl}
            alt={exhibit.title}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-stone-800"
          />
          <button
            onClick={() => setIsZoomedImage(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-stone-900/80 text-stone-200 hover:bg-stone-800"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Exhibit Details Card / Drawer */}
      <div
        id="exhibit-info-panel"
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[540px] z-40 bg-stone-950/95 text-stone-100 border-l border-stone-800 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 animate-in slide-in-from-right overscroll-contain"
      >
        {/* Top Action Header */}
        <div className="p-3.5 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-serif font-semibold truncate">
              Eser {currentIndex + 1} / {allExhibits.length}
            </span>
            <span className="text-stone-600 hidden xs:inline">•</span>
            <span className="text-xs text-stone-400 font-mono capitalize hidden xs:inline truncate">
              {exhibit.frameStyle === 'stone_pedestal' ? 'Mermer Kaide' :
               exhibit.frameStyle === 'glass_vitrine' ? 'Cam Vitrin' :
               exhibit.frameStyle === 'bronze_stela' ? 'Bronz Dikilitaş' :
               exhibit.frameStyle === 'obsidian_monolith' ? 'Obsidyen Monolit' : 'Stand'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="exhibit-teleport-cam-btn"
              onClick={() => onFocus3D(exhibit)}
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-stone-800/80 hover:bg-amber-600/30 text-amber-300 text-xs font-sans flex items-center gap-1.5 border border-stone-700/60 transition-colors active:scale-95"
              title="3D kamerayı bu kaideye odakla"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Görünümü Ortala</span>
            </button>

            <button
              id="close-exhibit-modal-btn"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex items-center justify-center active:scale-95"
              title="Paneli kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Artifact Image Showcase */}
          <div className="relative group rounded-xl overflow-hidden bg-stone-900 border border-stone-800 shadow-inner">
            <img
              src={exhibit.imageUrl}
              alt={exhibit.title}
              className="w-full h-64 sm:h-72 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-60" />

            {/* Zoom Button */}
            <button
              id="zoom-exhibit-image-btn"
              onClick={() => setIsZoomedImage(true)}
              className="absolute bottom-3 right-3 p-2 rounded-lg bg-stone-900/80 text-amber-300 hover:bg-stone-900 border border-stone-700/60 transition-transform active:scale-95 flex items-center gap-1 text-xs"
            >
              <ZoomIn className="w-4 h-4" />
              <span>Yüksek Çözünürlükte İncele</span>
            </button>

            {/* Frame Badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-stone-950/80 text-[11px] font-serif text-stone-300 border border-stone-800 backdrop-blur-sm">
              Klasik Arkeolojik Kaide
            </div>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100 leading-tight">
              {exhibit.title}
            </h2>
            {exhibit.subtitle && (
              <p className="text-sm font-serif italic text-amber-400/90 mt-1">
                {exhibit.subtitle}
              </p>
            )}
          </div>

          {/* Single Description Box: "Açıklama" */}
          <div className="p-4 sm:p-5 rounded-xl bg-stone-900/80 border border-stone-800 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-800/80">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-serif font-bold tracking-wider text-amber-200 uppercase">
                Açıklama
              </h3>
            </div>
            <p className="text-sm font-sans text-stone-200 leading-relaxed whitespace-pre-line">
              {exhibit.description || 'Eser için detaylı açıklama belirtilmemiş.'}
            </p>
          </div>

          {/* Tag Badges if any */}
          {exhibit.tags && exhibit.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {exhibit.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-sans bg-stone-900 text-stone-400 border border-stone-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Tour Navigation Footer */}
        <div className="p-3 sm:p-4 border-t border-stone-800 bg-stone-900/90 flex items-center justify-between shrink-0">
          <button
            id="prev-exhibit-btn"
            onClick={handlePrev}
            disabled={!hasPrev}
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl text-xs font-sans flex items-center gap-1.5 border transition-all active:scale-95 ${
              hasPrev
                ? 'bg-stone-800 text-stone-200 hover:bg-stone-700 border-stone-700'
                : 'opacity-40 cursor-not-allowed bg-stone-900 text-stone-500 border-stone-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Önceki</span>
          </button>

          <button
            id="next-exhibit-btn"
            onClick={handleNext}
            disabled={!hasNext}
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl text-xs font-sans flex items-center gap-1.5 border transition-all active:scale-95 ${
              hasNext
                ? 'bg-amber-500 text-stone-950 font-medium hover:bg-amber-400 border-amber-400'
                : 'opacity-40 cursor-not-allowed bg-stone-900 text-stone-500 border-stone-800'
            }`}
          >
            <span>Sonraki</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
