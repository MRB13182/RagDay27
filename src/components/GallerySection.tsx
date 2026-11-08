import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ImagePlus, Images, X } from 'lucide-react';
import { getPublicGalleryItems } from '../services/gallery';

export interface GalleryItem {
  id: string; title: string; caption: string | null; image_url: string; created_at: string;
}

export const GallerySection: React.FC = () => {
  const [items,setItems]=useState<GalleryItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [active,setActive]=useState<GalleryItem|null>(null);
  useEffect(()=>{let live=true;getPublicGalleryItems().then(rows=>{if(live)setItems(rows);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
  return <section id="gallery" className="rd-section py-20 sm:py-28 px-4 sm:px-6">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10">
        <div><span className="rd-eyebrow"><Images className="w-4 h-4"/> MOMENTS THAT STAY</span><h2 className="rd-heading mt-4">The <em>Rag Day</em> Gallery</h2><p className="text-slate-500 mt-3 max-w-xl">A collection of moments, memories and celebrations from our batch.</p></div>
        <span className="rd-count">{items.length.toString().padStart(2,'0')} MOMENTS</span>
      </div>
      {loading ? <div className="rd-gallery-empty">Loading memories…</div> : items.length===0 ? <div className="rd-gallery-empty"><ImagePlus className="w-8 h-8 mb-3"/>Gallery memories will appear here soon.</div> :
      <div className="rd-gallery-grid">{items.map((item,index)=><button key={item.id} type="button" onClick={()=>setActive(item)} className={`rd-gallery-card ${index%7===0?'rd-gallery-feature':''}`}><img src={item.image_url} alt={item.title} loading="lazy"/><span className="rd-gallery-overlay"><span><b>{item.title}</b>{item.caption&&<small>{item.caption}</small>}</span><ArrowUpRight className="w-5 h-5"/></span></button>)}</div>}
    </div>
    {active&&<div className="fixed inset-0 z-[220] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={()=>setActive(null)}><button type="button" aria-label="Close image preview" className="absolute top-5 right-5 p-3 rounded-full bg-white/10 text-white" onClick={()=>setActive(null)}><X/></button><div className="max-w-5xl w-full" onClick={e=>e.stopPropagation()}><img src={active.image_url} alt={active.title} className="max-h-[78vh] w-full object-contain rounded-2xl"/><h3 className="text-white text-xl font-bold mt-4">{active.title}</h3>{active.caption&&<p className="text-white/65 mt-1">{active.caption}</p>}</div></div>}
  </section>;
};
