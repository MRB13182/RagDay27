import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Film,Image as ImageIcon,Images,Pause,Play,X} from 'lucide-react';
import type {GalleryMedia} from '../super-admin/gallery/types';
import {getGalleryMedia,subscribeToGalleryChanges} from '../services/gallery';

type Filter='all'|'image'|'video';

type GalleryEntry =
 | {id:string;type:'image';title:string;caption:string;url:string}
 | {id:string;type:'video';title:string;caption:string;url:string};

const bundledGallery:GalleryEntry[]=[{
 id:'rd27-gallery-upload-001',
 type:'image',
 title:'Rag Day Gallery',
 caption:'Batch memories',
 // The image is committed inside src/, so Vite bundles it and emits a valid URL.
 url: new URL('../super-admin/gallery/file_00000000b180820783d44c1a5d04d553.png', import.meta.url).href
}];

export const GallerySection:React.FC=()=>{
 const [items,setItems]=useState<GalleryMedia[]>([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState<Filter>('all'),[index,setIndex]=useState(0),[active,setActive]=useState<GalleryMedia|GalleryEntry|null>(null),[playing,setPlaying]=useState(true);
 const videoRef=useRef<HTMLVideoElement>(null),urls=useRef(new Map<string,string>());
 const refresh=async()=>{try{setItems(await getGalleryMedia());}catch(e){console.error('Local Gallery unavailable',e);}finally{setLoading(false);}};
 useEffect(()=>{void refresh();const unsubscribe=subscribeToGalleryChanges(()=>void refresh());return()=>{unsubscribe();urls.current.forEach(URL.revokeObjectURL);};},[]);
 const localEntries=useMemo<GalleryEntry[]>(()=>items.map(item=>({id:item.id,type:item.type,title:item.title,caption:item.caption,url:''})),[items]);
 const allEntries=useMemo(()=>[...bundledGallery,...localEntries],[localEntries]);
 const visible=useMemo(()=>allEntries.filter(x=>filter==='all'||x.type===filter),[allEntries,filter]);
 const current=visible[index]||null;
 const src=(item:GalleryEntry|GalleryMedia)=>{
  if('url'in item&&item.url)return item.url;
  const media=item as GalleryMedia;
  let value=urls.current.get(media.id);
  if(!value){value=URL.createObjectURL(media.blob);urls.current.set(media.id,value);}
  return value;
 };
 const reduced=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const next=()=>setIndex(v=>(v+1)%Math.max(visible.length,1)),previous=()=>setIndex(v=>(v-1+visible.length)%Math.max(visible.length,1));
 useEffect(()=>{if(!playing||!current||current.type!=='image'||reduced)return;const t=window.setTimeout(next,5500);return()=>window.clearTimeout(t);},[playing,current?.id,visible.length,reduced]);
 useEffect(()=>{if(current?.type==='video'&&videoRef.current&&playing)void videoRef.current.play().catch(()=>setPlaying(false));},[current?.id,playing]);
 return <section className="rd-section min-h-[75vh] px-4 py-16 sm:px-6 sm:py-24"><div className="mx-auto max-w-7xl"><header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><span className="rd-eyebrow"><Images className="h-4 w-4"/> BATCH MEMORIES</span><h1 className="rd-heading mt-4">The <em>Rag Day</em> Gallery</h1><p className="mt-3 text-slate-500">Photos and videos from our batch celebration.</p></div><div className="flex gap-2">{([{id:'all',label:'All',Icon:Images},{id:'image',label:'Photos',Icon:ImageIcon},{id:'video',label:'Videos',Icon:Film}] as const).map(({id,label,Icon})=><button key={id} onClick={()=>{setFilter(id);setIndex(0);}} className={'rd-gallery-filter '+(filter===id?'is-active':'')}><Icon className="h-4 w-4"/>{label}</button>)}</div></header>
 {loading?<div className="rd-gallery-empty">Loading media…</div>:!visible.length?<div className="rd-gallery-empty"><Images className="mb-3 h-8 w-8"/>No media has been added yet.</div>:<><div className="overflow-hidden rounded-[2rem] border border-white bg-slate-950 shadow-2xl"><div className="relative grid min-h-[260px] place-items-center sm:min-h-[480px]">{current?.type==='image'?<img key={current.id} src={src(current)} alt={current.title} onError={e=>{console.error('Gallery image failed to load:',src(current));e.currentTarget.style.display='none';}} className="max-h-[72vh] w-full object-contain animate-fadeIn"/>:<video key={current?.id} ref={videoRef} src={current?src(current):undefined} muted autoPlay={playing} playsInline controls onEnded={next} onError={()=>setPlaying(false)} className="max-h-[72vh] w-full"/>}<button onClick={previous} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900"><ArrowLeft/></button><button onClick={next} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-slate-900"><ArrowRight/></button><button onClick={()=>setPlaying(v=>!v)} aria-label="Pause or play" className="absolute bottom-4 right-4 rounded-full bg-white/90 p-3 text-slate-900">{playing?<Pause/>:<Play/>}</button><button onClick={()=>current&&setActive(current as GalleryMedia|GalleryEntry)} aria-label="Fullscreen preview" className="absolute bottom-4 left-4 rounded-full bg-white/90 p-3 text-slate-900"><Images/></button></div><div className="flex items-center justify-between gap-3 bg-slate-950 px-5 py-4 text-white"><div className="min-w-0"><p className="truncate font-bold">{current?.title}</p><p className="truncate text-xs text-white/60">{current?.caption}</p></div><span className="text-xs text-white/60">{index+1} / {visible.length}</span></div></div><div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">{visible.map((item,i)=><button key={item.id} onClick={()=>{setIndex(i);setPlaying(false);}} className={'relative aspect-video overflow-hidden rounded-xl border-2 bg-slate-900 '+(i===index?'border-indigo-500':'border-transparent')}>{item.type==='image'?<img src={src(item)} alt={item.title} className="h-full w-full object-cover"/>:<span className="grid h-full place-items-center text-white"><Film/></span>}</button>)}</div></>}</div>
 {active&&<div className="fixed inset-0 z-[230] grid place-items-center bg-black/95 p-4" onClick={()=>setActive(null)}><button onClick={()=>setActive(null)} aria-label="Close fullscreen" className="absolute right-5 top-5 rounded-full bg-white/15 p-3 text-white"><X/></button><div className="w-full max-w-6xl" onClick={e=>e.stopPropagation()}>{active.type==='image'?<img src={src(active)} alt={active.title} className="mx-auto max-h-[85vh] object-contain"/>:<video src={src(active)} muted autoPlay controls playsInline className="mx-auto max-h-[85vh] w-full"/>}<p className="mt-3 text-center text-white">{active.title}</p></div></div>}</section>;
};
