import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Film, Image as ImageIcon, Images } from 'lucide-react';
import type { GalleryMedia } from '../super-admin/gallery/types';
import { getPublishedGalleryMedia, subscribeToGalleryChanges } from '../services/gallery';
import batchPedestalImg from '../assets/images/batch_pedestal_27_1795068445518.jpg';
import jerseyStageBg from '../assets/images/jersey_stage_bg_1795068445588.jpg';
import nicBuildingImg from '../../nic.png';

interface MemoryArchiveStripProps {
  onOpenGallery: () => void;
}

type PreviewItem = {
  id: string;
  type: 'image' | 'video';
  chapterLabel: string;
  title: string;
  caption: string;
  url: string;
  imageClassName?: string;
  isCampusContain?: boolean;
};

const GALLERY_UPLOAD_POSTER = new URL('../super-admin/gallery/file_00000000b180820783d44c1a5d04d553.png', import.meta.url).href;

const CHAPTER_LABELS = [
  'FIRST DAY',
  'CLASSROOM STORIES',
  'FRIENDSHIP',
  'UNFORGETTABLE MOMENTS',
] as const;

const BUNDLED_ARCHIVE_ENTRIES: PreviewItem[] = [
  {
    id: 'rd27-archive-first-day',
    type: 'image',
    chapterLabel: 'FIRST DAY',
    title: 'National Ideal College',
    caption: 'The campus where Batch 2027 began',
    url: nicBuildingImg,
    isCampusContain: true,
  },
  {
    id: 'rd27-archive-stories',
    type: 'image',
    chapterLabel: 'CLASSROOM STORIES',
    title: 'Batch 27 Chronicles',
    caption: 'Voices & memories kept in silver',
    url: batchPedestalImg,
  },
  {
    id: 'rd27-archive-friendship',
    type: 'image',
    chapterLabel: 'FRIENDSHIP',
    title: 'Rag Day Brotherhood',
    caption: 'Together from the first bell to farewell',
    url: GALLERY_UPLOAD_POSTER,
    imageClassName: 'object-cover object-bottom',
  },
  {
    id: 'rd27-archive-moments',
    type: 'image',
    chapterLabel: 'UNFORGETTABLE MOMENTS',
    title: 'Future Is A Memory',
    caption: 'Every frame encoded inside the archive',
    url: jerseyStageBg,
  },
];

export const MemoryArchiveStrip: React.FC<MemoryArchiveStripProps> = ({ onOpenGallery }) => {
  const [remoteMedia, setRemoteMedia] = useState<GalleryMedia[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const items = await getPublishedGalleryMedia();
        if (mounted) setRemoteMedia(items);
      } catch {
        // Silently degrade to bundled archive entry when offline
      }
    };
    void load();

    let unsub = () => {};
    try {
      unsub = subscribeToGalleryChanges(() => {
        void load();
      });
    } catch {
      // Ignore subscription error on restricted contexts
    }

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const entries = useMemo<PreviewItem[]>(() => {
    const locals: PreviewItem[] = remoteMedia
      .filter(item => Boolean(item.image_url))
      .map((item, idx) => ({
        id: item.id,
        type: item.type,
        chapterLabel: CHAPTER_LABELS[idx % CHAPTER_LABELS.length],
        title: item.title || 'Batch Memory',
        caption: item.caption || 'Batch 2027 Archive',
        url: item.image_url,
      }));

    if (locals.length >= 4) {
      return locals;
    }

    // Prioritize real uploaded items and bundled gallery image while maintaining 4 archive frames
    return [...locals, ...BUNDLED_ARCHIVE_ENTRIES].slice(0, Math.max(4, locals.length + 1));
  }, [remoteMedia]);

  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(entries.length - 1, 0)));
  }, [entries.length]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + entries.length) % entries.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % entries.length);
  };

  const visibleFrames = useMemo(() => {
    if (entries.length === 0) return [];
    const count = Math.min(4, entries.length);
    return Array.from({ length: count }, (_, offset) => entries[(activeIndex + offset) % entries.length]);
  }, [entries, activeIndex]);

  return (
    <section
      id="our-story"
      aria-labelledby="memory-archive-heading"
      className="py-12 sm:py-16 relative overflow-hidden bg-[#08090D] border-t border-[#C9D0D9]/14"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-8 items-center">
          {/* Left Museum Editorial Column */}
          <div className="lg:col-span-3 space-y-4">
            <div className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.28em] text-[#8993A1]">
              Memory Archive
            </div>
            <h2
              id="memory-archive-heading"
              className="font-editorial italic text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.08] text-[#F5F7FA]"
            >
              MEMORIES,
              <br />
              <span className="chrome-text not-italic font-display font-extrabold text-2xl sm:text-3xl tracking-tight">
                ENCODED FOREVER.
              </span>
            </h2>
            <div className="w-20 h-[2px] bg-gradient-to-r from-[#8BEAFF] to-transparent shadow-[0_0_12px_rgba(139,234,255,0.5)]" />
            <p className="text-xs sm:text-sm text-[#C9D0D9]/80 leading-relaxed">
              Preserved frames from our first arrival to final farewell inside the NIC 27 vault.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenGallery}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg glass-button text-xs font-bold uppercase tracking-[0.12em] cursor-pointer whitespace-nowrap"
              >
                <Images className="w-3.5 h-3.5 text-[#8BEAFF]" />
                <span>Open Gallery</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8BEAFF]" />
              </button>
            </div>
          </div>

          {/* Right Horizontal Floating Gallery Strip */}
          <div className="lg:col-span-9 flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous memory frame"
              className="hidden sm:grid w-9 h-9 rounded-full glass-button place-items-center shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#C9D0D9]" />
            </button>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 items-center">
              {visibleFrames.map((item, idx) => {
                const isFailed = failedIds.has(item.id) || !item.url;
                const chapterTitle = CHAPTER_LABELS[idx] || item.chapterLabel;
                // Varied heights / depth cadence matching reference horizontal gallery
                const aspectClass =
                  idx === 0
                    ? 'aspect-[16/11] xl:-translate-y-1.5'
                    : idx === 1
                    ? 'aspect-[4/3] xl:translate-y-1.5'
                    : idx === 2
                    ? 'aspect-[16/11] xl:-translate-y-1'
                    : 'aspect-[4/3] xl:translate-y-1';

                return (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    onClick={onOpenGallery}
                    className={`group relative overflow-hidden rounded-xl border border-[#C9D0D9]/28 hover:border-[#8BEAFF]/65 bg-[rgba(12,17,25,0.68)] backdrop-blur-md text-left transition-all duration-300 cursor-pointer hover:-translate-y-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.42)] ${aspectClass}`}
                  >
                    <div className="relative w-full h-full overflow-hidden bg-[#0B0E13]">
                      {!isFailed && item.type === 'image' ? (
                        item.isCampusContain ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(139,234,255,0.16)_0%,rgba(12,17,25,0.92)_68%,#08090D_100%)] p-1.5">
                            <img
                              src={item.url}
                              alt={item.title}
                              loading="lazy"
                              onError={() => setFailedIds((prev) => new Set(prev).add(item.id))}
                              className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.04]"
                              style={{
                                WebkitMaskImage:
                                  'radial-gradient(ellipse 84% 88% at 50% 50%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)',
                                maskImage:
                                  'radial-gradient(ellipse 84% 88% at 50% 50%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)',
                              }}
                            />
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={item.title}
                            loading="lazy"
                            onError={() => setFailedIds((prev) => new Set(prev).add(item.id))}
                            className={`w-full h-full ${item.imageClassName || 'object-cover object-center'} transition-transform duration-500 group-hover:scale-[1.04]`}
                          />
                        )
                      ) : !isFailed && item.type === 'video' ? (
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          onError={() => setFailedIds((prev) => new Set(prev).add(item.id))}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#626B79] p-6">
                          {item.type === 'video' ? <Film className="w-7 h-7 mb-2" /> : <ImageIcon className="w-7 h-7 mb-2" />}
                          <span className="text-xs text-[#8993A1]">Archive Preview</span>
                        </div>
                      )}

                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#08090D]/90 via-[#08090D]/15 to-transparent"
                      />

                      {/* Glass Bottom Label Plaque */}
                      <div className="absolute inset-x-2.5 bottom-2.5 px-2.5 py-1.5 rounded-lg bg-[rgba(12,17,25,0.74)] backdrop-blur-md border border-[#C9D0D9]/24 group-hover:border-[#8BEAFF]/55 flex items-center justify-between gap-1.5 transition-colors">
                        <span className="text-[9.5px] font-mono font-bold uppercase tracking-[0.1em] text-[#F5F7FA] leading-tight">
                          {chapterTitle}
                        </span>
                        <span className="text-[10px] font-mono text-[#8BEAFF] shrink-0">→</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next memory frame"
              className="hidden sm:grid w-9 h-9 rounded-full glass-button place-items-center shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-[#C9D0D9]" />
            </button>
          </div>
        </div>

        {/* Mobile Arrow Navigation Controls */}
        <div className="flex sm:hidden items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous memory frame"
            className="w-9 h-9 rounded-full glass-button grid place-items-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#C9D0D9]" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next memory frame"
            className="w-9 h-9 rounded-full glass-button grid place-items-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-[#C9D0D9]" />
          </button>
        </div>
      </div>
    </section>
  );
};
