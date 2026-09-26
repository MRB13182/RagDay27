import React, { useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Shirt, Layers, CheckCircle2 } from 'lucide-react';
import { JerseyShowcaseSettings, JerseyItem } from '../types';

interface JerseyShowcaseSectionProps {
  settings: JerseyShowcaseSettings;
  onRegisterClick?: () => void;
  className?: string;
}

export const JerseyShowcaseSection: React.FC<JerseyShowcaseSectionProps> = ({
  settings,
  onRegisterClick,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'front' | 'back'>('back');

  if (!settings.enabled || !settings.jerseys || settings.jerseys.length === 0) {
    return null;
  }

  const activeJersey: JerseyItem = settings.jerseys[currentIndex] || settings.jerseys[0];
  const hasMultiple = settings.jerseys.length > 1;

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? settings.jerseys.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === settings.jerseys.length - 1 ? 0 : prev + 1));
  };

  // Determine current active image based on view mode
  const currentImage =
    viewMode === 'front'
      ? activeJersey.frontImage || activeJersey.backImage
      : activeJersey.backImage || activeJersey.frontImage;

  return (
    <section className={`py-10 sm:py-16 relative overflow-hidden ${className}`}>
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#5B5FEF]/10 via-[#00D4FF]/10 to-[#7A6CFF]/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-md mb-3">
            <Shirt className="w-3.5 h-3.5 text-[#5B5FEF]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Official Merchandise
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Batch 2027 Jersey Showcase
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Every registered member receives the authentic high-performance squad kit with personalized print.
          </p>
        </div>

        {/* Main Showcase Showcase Box */}
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-3xl p-4 sm:p-6 bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(91,95,239,0.12)] transition-all duration-300">
            {/* Top Glass Ribbon */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/70 border border-slate-200/70 mb-4 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-slate-800">
                  {activeJersey.badgeText || 'Signature Batch Edition'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* View Switcher: Front vs Back */}
                {(activeJersey.frontImage && activeJersey.backImage) && (
                  <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setViewMode('front')}
                      className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'front'
                          ? 'bg-white text-[#5B5FEF] shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('back')}
                      className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'back'
                          ? 'bg-white text-[#5B5FEF] shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Back
                    </button>
                  </div>
                )}

                {/* Right Tag */}
                <span className="text-[11px] font-mono font-bold text-[#5B5FEF] bg-[#5B5FEF]/10 px-2.5 py-0.5 rounded-full">
                  {activeJersey.tagText || 'RD27'}
                </span>
              </div>
            </div>

            {/* Jersey Photo Showcase Frame */}
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center shadow-inner group">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={activeJersey.name || 'Official Jersey Mockup'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <Shirt className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                  <span className="text-xs">No jersey image uploaded</span>
                </div>
              )}

              {/* Bottom Caption Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-4 sm:p-5">
                <div className="text-white w-full flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">
                      {activeJersey.subtitle || 'Custom Squad Kit'}
                    </p>
                    <p className="text-sm sm:text-base font-bold tracking-wide mt-0.5 text-white">
                      {activeJersey.title || 'Back Name & Number Print Included'}
                    </p>
                  </div>

                  {hasMultiple && (
                    <span className="text-[10px] font-mono bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-slate-200">
                      {currentIndex + 1} / {settings.jerseys.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Carousel Arrows (If multiple jerseys) */}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous jersey"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next jersey"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-110 active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Floating Overlays */}
            <div className="hidden sm:flex absolute -bottom-3 -left-3 p-2.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-lg items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B5FEF] to-[#7A6CFF] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {activeJersey.badge1 || 'Custom Fit'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {activeJersey.badge1Sub || 'Sizes S to 4XL'}
                </div>
              </div>
            </div>

            <div className="hidden sm:flex absolute -top-3 -right-3 p-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-lg items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
              <span className="text-xs font-bold text-slate-800 font-mono">
                {activeJersey.badge2 || '100% Cotton & Mesh'}
              </span>
            </div>
          </div>

          {/* Carousel Dot Indicators (If multiple jerseys) */}
          {hasMultiple && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {settings.jerseys.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx ? 'w-6 bg-[#5B5FEF]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to ${item.name || `Jersey ${idx + 1}`}`}
                />
              ))}
            </div>
          )}

          {/* Quick Register CTA under showcase */}
          {onRegisterClick && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onRegisterClick}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#5B5FEF] hover:text-[#4a4ed4] hover:underline cursor-pointer"
              >
                <span>Customize your name & size on registration</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
