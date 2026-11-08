import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ImagePlus, Images, Link2, Play, X, ExternalLink, Film, Image as ImageIcon } from 'lucide-react';
import { getPublicGalleryItems } from '../services/gallery';

export interface GalleryItem {
  id: string;
  title: string;
  caption: string | null;
  image_url: string;
  created_at: string;
  media_type?: 'image' | 'video' | 'album';
  external_url?: string | null;
  thumbnail_url?: string | null;
}

type GalleryFilter = 'all' | 'image' | 'video' | 'album';

const isSafeExternalUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const GallerySection: React.FC<{ preview?: boolean }> = ({ preview = false }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState<GalleryFilter>('all');

  useEffect(() => {
    let live = true;
    getPublicGalleryItems()
      .then(rows => { if (live) setItems(rows); })
      .catch(error => console.error('Gallery loading failed:', error))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const visibleItems = useMemo(() => {
    const typed = items.map(item => ({ ...item, media_type: item.media_type || 'image' }));
    return typed.filter(item => filter === 'all' || item.media_type === filter)
      .slice(0, preview ? 6 : undefined);
  }, [items, filter, preview]);

  const counts = useMemo(() => ({
    image: items.filter(item => !item.media_type || item.media_type === 'image').length,
    video: items.filter(item => item.media_type === 'video').length,
    album: items.filter(item => item.media_type === 'album').length,
  }), [items]);

  const filters: { id: GalleryFilter; label: string; Icon: typeof Images }[] = [
    { id: 'all', label: 'All memories', Icon: Images },
    { id: 'image', label: 'Photos', Icon: ImageIcon },
    { id: 'video', label: 'Videos', Icon: Film },
    { id: 'album', label: 'Albums', Icon: Images },
  ];

  return (
    <section id="gallery" className="rd-section py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-9">
          <div>
            <span className="rd-eyebrow"><Images className="w-4 h-4" /> MOMENTS THAT STAY</span>
            <h1 className="rd-heading mt-4">{preview ? <>A glimpse of <em>Rag Day</em></> : <>The <em>Rag Day</em> Gallery</>}</h1>
            <p className="text-slate-500 mt-3 max-w-xl">Photos, videos and shared albums celebrating our batch memories.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => setFilter(id)}
                className={`rd-gallery-filter ${filter === id ? 'is-active' : ''}`}>
                <Icon className="w-4 h-4" /> {label}
                <span>{id === 'all' ? items.length : counts[id]}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rd-gallery-empty">Loading memories…</div>
        ) : visibleItems.length === 0 ? (
          <div className="rd-gallery-empty"><ImagePlus className="w-8 h-8 mb-3" />No {filter === 'all' ? 'gallery' : filter} memories have been shared yet.</div>
        ) : (
          <div className="rd-gallery-grid">
            {visibleItems.map((item, index) => {
              const type = item.media_type || 'image';
              const thumbnail = item.thumbnail_url || item.image_url;
              const isAlbum = type === 'album';
              const safeUrl = isAlbum && item.external_url && isSafeExternalUrl(item.external_url);
              return (
                <article key={item.id} className={`rd-gallery-card ${index % 7 === 0 ? 'rd-gallery-feature' : ''}`}>
                  {isAlbum && safeUrl ? (
                    <a href={item.external_url!} target="_blank" rel="noopener noreferrer" className="rd-gallery-media-link">
                      <img src={thumbnail} alt={item.title} loading="lazy" />
                      <span className="rd-gallery-media-badge"><Link2 className="w-4 h-4" /> Album link</span>
                      <span className="rd-gallery-overlay"><span><b>{item.title}</b>{item.caption && <small>{item.caption}</small>}</span><ExternalLink className="w-5 h-5" /></span>
                    </a>
                  ) : type === 'video' ? (
                    <button type="button" onClick={() => setActive(item)} className="rd-gallery-media-link">
                      <img src={thumbnail} alt={item.title} loading="lazy" />
                      <span className="rd-gallery-play"><Play className="w-6 h-6 fill-current" /></span>
                      <span className="rd-gallery-overlay"><span><b>{item.title}</b>{item.caption && <small>{item.caption}</small>}</span><Play className="w-5 h-5" /></span>
                    </button>
                  ) : !isAlbum ? (
                    <button type="button" onClick={() => setActive(item)} className="rd-gallery-media-link">
                      <img src={item.image_url} alt={item.title} loading="lazy" />
                      <span className="rd-gallery-overlay"><span><b>{item.title}</b>{item.caption && <small>{item.caption}</small>}</span><ArrowUpRight className="w-5 h-5" /></span>
                    </button>
                  ) : (
                    <div className="rd-gallery-invalid-album"><Link2 className="w-6 h-6" /><b>{item.title}</b><small>Album link unavailable</small></div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-[220] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <button type="button" aria-label="Close media preview" className="absolute top-5 right-5 p-3 rounded-full bg-white/10 text-white" onClick={() => setActive(null)}><X /></button>
          <div className="max-w-5xl w-full" onClick={event => event.stopPropagation()}>
            {active.media_type === 'video' ? (
              <video src={active.external_url || active.image_url} poster={active.thumbnail_url || undefined} controls playsInline className="max-h-[78vh] w-full rounded-2xl bg-black" />
            ) : (
              <img src={active.image_url} alt={active.title} className="max-h-[78vh] w-full object-contain rounded-2xl" />
            )}
            <h2 className="text-white text-xl font-bold mt-4">{active.title}</h2>
            {active.caption && <p className="text-white/65 mt-1">{active.caption}</p>}
          </div>
        </div>
      )}
    </section>
  );
};
