import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Film, Image as ImageIcon, Images, Pause, Play, X } from 'lucide-react';
import type { GalleryMedia } from '../super-admin/gallery/types';
import { getGalleryMedia, subscribeToGalleryChanges } from '../services/gallery';

type Filter = 'all' | 'image' | 'video';
type GalleryEntry =
  | { id: string; type: 'image'; title: string; caption: string; url: string }
  | { id: string; type: 'video'; title: string; caption: string; url: string };

const bundledGallery: GalleryEntry[] = [{
  id: 'rd27-gallery-upload-001',
  type: 'image',
  title: 'Rag Day Gallery',
  caption: 'Batch memories',
  // Vite resolves this asset relative to the module for both root and /RagDay27/ deployments.
  url: new URL('../super-admin/gallery/file_00000000b180820783d44c1a5d04d553.png', import.meta.url).href,
}];

export const GallerySection: React.FC = () => {
  const [items, setItems] = useState<GalleryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageWarning, setStorageWarning] = useState('');
  const [failedMedia, setFailedMedia] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<GalleryMedia | GalleryEntry | null>(null);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrls = useRef(new Map<string, string>());

  const refresh = useCallback(async () => {
    try {
      setItems(await getGalleryMedia());
      setStorageWarning('');
    } catch (error) {
      console.error('Local Gallery storage unavailable:', error);
      setStorageWarning('Device-local gallery uploads are unavailable in this browser. The published gallery is still available below.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const media = await getGalleryMedia();
        if (mounted) {
          setItems(media);
          setStorageWarning('');
        }
      } catch (error) {
        console.error('Local Gallery storage unavailable:', error);
        if (mounted) {
          setStorageWarning('Device-local gallery uploads are unavailable in this browser. The published gallery is still available below.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeToGalleryChanges(() => { void refresh(); });
    } catch (error) {
      console.warn('Gallery live updates are unavailable:', error);
    }

    return () => {
      mounted = false;
      unsubscribe();
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    };
  }, [refresh]);

  const localEntries = useMemo<GalleryEntry[]>(
    () => items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title || 'Untitled media',
      caption: item.caption || '',
      url: '',
    })),
    [items],
  );
  const allEntries = useMemo(() => [...bundledGallery, ...localEntries], [localEntries]);
  const visible = useMemo(() => allEntries.filter((item) => filter === 'all' || item.type === filter), [allEntries, filter]);

  useEffect(() => {
    setIndex((currentIndex) => Math.min(currentIndex, Math.max(visible.length - 1, 0)));
  }, [visible.length]);

  const current = visible[index] || null;

  const src = useCallback((item: GalleryEntry | GalleryMedia): string => {
    if ('url' in item && item.url) return item.url;
    const media = item as GalleryMedia;
    const existing = objectUrls.current.get(media.id);
    if (existing) return existing;
    const objectUrl = URL.createObjectURL(media.blob);
    objectUrls.current.set(media.id, objectUrl);
    return objectUrl;
  }, []);

  const markMediaFailed = (id: string) => setFailedMedia((currentFailures) => new Set(currentFailures).add(id));

  const reducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const next = useCallback(() => setIndex((value) => (value + 1) % Math.max(visible.length, 1)), [visible.length]);
  const previous = useCallback(() => setIndex((value) => (value - 1 + visible.length) % Math.max(visible.length, 1)), [visible.length]);

  useEffect(() => {
    if (!playing || !current || current.type !== 'image' || reducedMotion) return;
    const timer = window.setTimeout(next, 5500);
    return () => window.clearTimeout(timer);
  }, [playing, current?.id, next, reducedMotion]);

  useEffect(() => {
    if (current?.type === 'video' && videoRef.current && playing) {
      void videoRef.current.play().catch(() => setPlaying(false));
    }
  }, [current?.id, playing]);

  const mediaSource = (entry: GalleryEntry | GalleryMedia) => {
    try {
      return src(entry);
    } catch (error) {
      console.error('Could not create a gallery media URL:', error);
      markMediaFailed(entry.id);
      return '';
    }
  };

  return (
    <section className="rd-section min-h-[75vh] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rd-eyebrow"><Images className="h-4 w-4" /> BATCH MEMORIES</span>
            <h1 className="rd-heading mt-4">The <em>Rag Day</em> Gallery</h1>
            <p className="mt-3 text-slate-500">Photos and videos from our batch celebration.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter gallery">
            {([
              { id: 'all', label: 'All', Icon: Images },
              { id: 'image', label: 'Photos', Icon: ImageIcon },
              { id: 'video', label: 'Videos', Icon: Film },
            ] as const).map(({ id, label, Icon }) => (
              <button key={id} type="button" aria-pressed={filter === id} onClick={() => { setFilter(id); setIndex(0); }} className={'rd-gallery-filter ' + (filter === id ? 'is-active' : '')}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
        </header>

        {storageWarning && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{storageWarning}</p>}

        {loading ? (
          <div className="rd-gallery-empty" role="status">Loading media…</div>
        ) : !visible.length ? (
          <div className="rd-gallery-empty"><Images className="mb-3 h-8 w-8" />No media has been added yet.</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-[2rem] border border-white bg-slate-950 shadow-2xl">
              <div className="relative grid min-h-[260px] place-items-center sm:min-h-[480px]">
                {current?.type === 'image' ? (
                  failedMedia.has(current.id) ? (
                    <div className="grid min-h-[260px] w-full place-items-center bg-slate-900 px-5 py-12 text-center text-white sm:min-h-[480px]">
                      <div><ImageIcon className="mx-auto mb-3 h-10 w-10 text-slate-400" /><p className="font-semibold">This image is unavailable</p><p className="mt-1 text-sm text-slate-300">Try another gallery item.</p></div>
                    </div>
                  ) : (
                    <img key={current.id} src={mediaSource(current) || undefined} alt={current.title} onError={() => markMediaFailed(current.id)} className="max-h-[72vh] w-full object-contain animate-fadeIn" />
                  )
                ) : current?.type === 'video' ? (
                  failedMedia.has(current.id) ? (
                    <div className="grid min-h-[260px] w-full place-items-center bg-slate-900 px-5 py-12 text-center text-white sm:min-h-[480px]">
                      <div><Film className="mx-auto mb-3 h-10 w-10 text-slate-400" /><p className="font-semibold">This video is unavailable</p><p className="mt-1 text-sm text-slate-300">Try another gallery item.</p></div>
                    </div>
                  ) : (
                    <video key={current.id} ref={videoRef} src={mediaSource(current) || undefined} muted autoPlay={playing} playsInline controls onEnded={next} onError={() => markMediaFailed(current.id)} className="max-h-[72vh] w-full" />
                  )
                ) : null}
                <button type="button" onClick={previous} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900"><ArrowLeft /></button>
                <button type="button" onClick={next} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900"><ArrowRight /></button>
                <button type="button" onClick={() => setPlaying((value) => !value)} aria-label="Pause or play slideshow" className="absolute bottom-4 right-4 rounded-full bg-white/90 p-3 text-slate-900">{playing ? <Pause /> : <Play />}</button>
                <button type="button" onClick={() => current && !failedMedia.has(current.id) && setActive(current as GalleryMedia | GalleryEntry)} aria-label="Fullscreen preview" disabled={!current || failedMedia.has(current.id)} className="absolute bottom-4 left-4 rounded-full bg-white/90 p-3 text-slate-900 disabled:opacity-50"><Images /></button>
              </div>
              <div className="flex items-center justify-between gap-3 bg-slate-950 px-5 py-4 text-white">
                <div className="min-w-0"><p className="truncate font-bold">{current?.title}</p><p className="truncate text-xs text-white/60">{current?.caption}</p></div>
                <span className="text-xs text-white/60">{index + 1} / {visible.length}</span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
              {visible.map((item, itemIndex) => (
                <button key={item.id} type="button" onClick={() => { setIndex(itemIndex); setPlaying(false); }} aria-label={'Open ' + item.title} className={'relative aspect-video overflow-hidden rounded-xl border-2 bg-slate-900 ' + (itemIndex === index ? 'border-indigo-500' : 'border-transparent')}>
                  {item.type === 'image' && !failedMedia.has(item.id) ? (
                    <img src={mediaSource(item) || undefined} alt="" onError={() => markMediaFailed(item.id)} className="h-full w-full object-cover" />
                  ) : <span className="grid h-full place-items-center text-white">{item.type === 'video' ? <Film /> : <ImageIcon />}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-[230] grid place-items-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label={active.title} onClick={() => setActive(null)}>
          <button type="button" onClick={() => setActive(null)} aria-label="Close fullscreen" className="absolute right-5 top-5 rounded-full bg-white/15 p-3 text-white"><X /></button>
          <div className="w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            {active.type === 'image' ? (
              <img src={mediaSource(active) || undefined} alt={active.title} onError={() => markMediaFailed(active.id)} className="mx-auto max-h-[85vh] object-contain" />
            ) : <video src={mediaSource(active) || undefined} muted autoPlay controls playsInline className="mx-auto max-h-[85vh] w-full" />}
            <p className="mt-3 text-center text-white">{active.title}</p>
          </div>
        </div>
      )}
    </section>
  );
};
