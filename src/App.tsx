// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  CheckCircle2, XCircle, Clock, Send, Plus, Trash2, Smartphone, Eye, Copy, Image as ImageIcon, Film, 
  Hash, Check, Layers, Square, ThumbsUp, MessageSquare, Share2, Edit3, Globe, Calendar, AlertCircle, Briefcase, Loader2, Share, ChevronLeft, ChevronRight, LayoutGrid, FileDown, SendHorizonal, Maximize2
} from 'lucide-react';

// --- ÍCONES DE REDES SOCIAIS (SVG Direto) ---
const Instagram = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);
const Facebook = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);
const Linkedin = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
);

// --- CONFIGURAÇÃO DO FIREBASE (Vitá) ---
const firebaseConfig = {
  apiKey: "AIzaSyD-SUA-CHAVE-AQUI",
  authDomain: "vita-projeto.firebaseapp.com",
  projectId: "vita-projeto",
  storageBucket: "vita-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLIENTE_VITA = { name: 'Vitá', color: 'from-emerald-400 to-teal-600' };

// --- COMPONENTE DE CARROSSEL ---
const MediaCarousel = ({ media, isPreview = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mediaArr = Array.isArray(media) ? media : (media ? [media] : []);

  if (mediaArr.length === 0) return <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-200"><ImageIcon size={24} /></div>;

  const next = (e) => { e.stopPropagation(); if (currentIndex < mediaArr.length - 1) setCurrentIndex(prev => prev + 1); };
  const prev = (e) => { e.stopPropagation(); if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };

  return (
    <div className="relative w-full h-full group/carousel overflow-hidden bg-white rounded-inherit">
      <div className="flex w-full h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {mediaArr.map((m, i) => (
          <div key={i} className="w-full h-full shrink-0 flex items-center justify-center relative bg-white">
            {m.type === 'video' ? <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center"><Film size={20} /></div> : <img src={m.url} className={`w-full h-full object-contain ${!isPreview && 'p-1'}`} />}
          </div>
        ))}
      </div>
      {mediaArr.length > 1 && (
        <>
          <button type="button" onClick={prev} className={`absolute left-1 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center transition-opacity z-10 ${currentIndex === 0 ? 'opacity-0' : 'opacity-100'} w-6 h-6`}><ChevronLeft size={16} /></button>
          <button type="button" onClick={next} className={`absolute right-1 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center transition-opacity z-10 ${currentIndex === mediaArr.length - 1 ? 'opacity-0' : 'opacity-100'} w-6 h-6`}><ChevronRight size={16} /></button>
          <span className="absolute top-1 right-1 bg-slate-900/60 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md z-10">{currentIndex + 1}/{mediaArr.length}</span>
        </>
      )}
    </div>
  );
};

export default function App() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('todos');
  const [mainView, setMainView] = useState('feed');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isClientView, setIsClientView] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [feedbackPost, setFeedbackPost] = useState(null);
  const [zoomedPost, setZoomedPost] = useState(null);
  const [previewPost, setPreviewPost] = useState(null);
  const [previewPlatform, setPreviewPlatform] = useState('instagram');
  const [formState, setFormState] = useState({ content: '', platforms: [], hashtags: '', postType: 'estatico', media: null, scheduleDate: '', scheduleTime: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'client') setIsClientView(true);
    
    const unsubscribe = onSnapshot(collection(db, 'projetos', 'vita', 'posts'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPosts(docs);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LOGICA DE CONVERSÃO PARA BASE64 (MENOR QUE 1MB) ---
  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.size > 1024 * 1024) {
        alert(`A imagem ${file.name} é maior que 1MB. Por favor, use imagens menores.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newMedia = { type: file.type.startsWith('video') ? 'video' : 'image', url: reader.result };
        setFormState(prev => ({
          ...prev,
          media: prev.postType === 'carrossel' 
            ? [...(Array.isArray(prev.media) ? prev.media : (prev.media ? [prev.media] : [])), newMedia] 
            : newMedia
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.content.trim() || formState.platforms.length === 0) return;
    setIsUploading(true);

    try {
      const id = editingId || Date.now().toString();
      await setDoc(doc(db, 'projetos', 'vita', 'posts', id), {
        ...formState,
        status: editingId ? (posts.find(p => p.id === editingId)?.status || 'pendente') : 'pendente',
        date: editingId ? posts.find(p => p.id === editingId).date : new Date().toISOString(),
      }, { merge: true });

      setIsModalOpen(false);
      setEditingId(null);
      setFormState({ content: '', platforms: [], hashtags: '', postType: 'estatico', media: null, scheduleDate: '', scheduleTime: '' });
    } catch (err) { alert("Erro ao guardar."); } finally { setIsUploading(false); }
  };

  const deletePost = async (id) => { if (confirm("Apagar permanentemente?")) await deleteDoc(doc(db, 'projetos', 'vita', 'posts', id)); };
  
  const changeStatus = (id, s) => setDoc(doc(db, 'projetos', 'vita', 'posts', id), { status: s }, { merge: true });

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-emerald-600 animate-pulse">Sincronizando Vitá...</div>;

  const filteredPosts = posts.filter(p => activeTab === 'todos' || p.status === activeTab);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden print:hidden">
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 h-full shrink-0">
        <div className="flex items-center gap-3"><div className="bg-emerald-600 p-2 rounded-2xl text-white shadow-lg shadow-emerald-100"><Send size={20} /></div><span className="font-black text-2xl tracking-tighter">SocialFlow</span></div>
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cliente</p><h3 className="text-lg font-black text-slate-800">{CLIENTE_VITA.name}</h3></div>
          <nav className="space-y-1">
             <button onClick={() => setMainView('feed')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all ${mainView === 'feed' ? 'bg-slate-900 text-white font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid size={18} /> Feed</button>
             <button onClick={() => setMainView('calendario')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all ${mainView === 'calendario' ? 'bg-slate-900 text-white font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={18} /> Calendário</button>
          </nav>
          <nav className="space-y-1">
            {['todos', 'pendente', 'aprovado', 'rejeitado'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all capitalize ${activeTab === t ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>{t}</button>
            ))}
          </nav>
        </div>
        {!isClientView && (
          <div className="mt-auto space-y-3">
             <button onClick={() => window.print()} className="w-full bg-slate-50 text-slate-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs border border-slate-200"><FileDown size={16} /> PDF</button>
             <button onClick={() => { setEditingId(null); setFormState({ content: '', platforms: [], hashtags: '', postType: 'estatico', media: null, scheduleDate: '', scheduleTime: '' }); setIsModalOpen(true); }} className="w-full bg-emerald-600 text-white py-4 rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-xl"><Plus size={20} /> Novo Post</button>
          </div>
        )}
      </aside>

      <main className="flex-1 h-full overflow-y-auto p-5 md:p-10 min-w-0">
        <header className="mb-10"><div className="flex items-center gap-2 mb-1"><div className={`w-4 h-4 rounded-lg bg-gradient-to-tr ${CLIENTE_VITA.color}`} /><h2 className="text-3xl font-black text-slate-900 tracking-tight">{CLIENTE_VITA.name}</h2></div><p className="text-slate-400 text-sm font-medium italic">Dashboard do Cliente</p></header>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer" onClick={() => setZoomedPost(post)}>
              <div className="flex justify-between mb-6">
                <div className="flex gap-1.5">
                  {post.platforms.map(plt => (
                    <div key={plt} className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-emerald-600">
                      {plt === 'instagram' && <Instagram size={16} />}
                      {plt === 'facebook' && <Facebook size={16} />}
                      {plt === 'linkedin' && <Linkedin size={16} />}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${post.status === 'aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : post.status === 'rejeitado' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{post.status}</span>
                  <span className="text-[9px] font-black text-slate-400">{post.scheduleDate?.split('-').reverse().join('/')} às {post.scheduleTime}</span>
                </div>
              </div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-slate-100 mb-4 bg-slate-50">
                <MediaCarousel media={post.media} isPreview={false} />
              </div>
              <p className="text-slate-700 text-sm font-medium line-clamp-3 mb-4 whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex gap-2">
                  {!isClientView && <button onClick={(e) => { e.stopPropagation(); setEditingId(post.id); setFormState({...post}); setIsModalOpen(true); }} className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-emerald-50"><Edit3 size={16} /></button>}
                  <button onClick={(e) => { e.stopPropagation(); setZoomedPost(post); }} className="p-2 bg-slate-50 text-indigo-500 rounded-xl hover:bg-indigo-50"><Maximize2 size={16} /></button>
                </div>
                <div className="flex gap-1">
                  {post.status !== 'aprovado' && <button onClick={(e) => { e.stopPropagation(); changeStatus(post.id, 'aprovado'); }} className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg">Aprovar</button>}
                  {post.status === 'pendente' && <button onClick={(e) => { e.stopPropagation(); changeStatus(post.id, 'rejeitado'); }} className="bg-rose-50 text-rose-500 px-3 py-1.5 rounded-xl text-[10px] font-black border border-rose-100">Rejeitar</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL ZOOM */}
      {zoomedPost && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setZoomedPost(null)}>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="w-full md:w-1/2 bg-slate-100 p-8 flex items-center justify-center">
              <div className="w-full max-w-xs aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-white"><MediaCarousel media={zoomedPost.media} isPreview={true} /></div>
            </div>
            <div className="w-full md:w-1/2 p-10 overflow-y-auto flex flex-col">
              <button onClick={() => setZoomedPost(null)} className="self-end mb-4 p-2 bg-slate-100 rounded-full hover:rotate-90 transition-all"><XCircle /></button>
              <div className="flex gap-2 mb-6"><span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200">{zoomedPost.postType}</span></div>
              <p className="text-sm font-bold text-emerald-600 flex items-center gap-2 mb-6 bg-emerald-50 w-fit px-4 py-2 rounded-xl"><Calendar size={16} /> {zoomedPost.scheduleDate?.split('-').reverse().join('/')} às {zoomedPost.scheduleTime}</p>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6 flex-1"><p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{zoomedPost.content}</p></div>
              <p className="text-sm font-black text-emerald-600 mb-8">{zoomedPost.hashtags}</p>
              <div className="flex gap-2 mt-auto">
                 <button onClick={() => changeStatus(zoomedPost.id, 'aprovado')} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-emerald-100">APROVAR POST</button>
                 <button onClick={() => changeStatus(zoomedPost.id, 'rejeitado')} className="flex-1 bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs">REJEITAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-xl z-10">
              <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Editar Post' : 'Novo Conteúdo'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:rotate-90 transition-all"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {['instagram', 'facebook', 'linkedin'].map(plt => (
                  <button key={plt} type="button" onClick={() => setFormState(p => ({ ...p, platforms: p.platforms.includes(plt) ? p.platforms.filter(x => x !== plt) : [...p.platforms, plt] }))} className={`py-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase ${formState.platforms.includes(plt) ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>{plt}</button>
                ))}
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <input type="file" multiple className="hidden" id="fileUp" onChange={handleMediaUpload} accept="image/*" />
                <label htmlFor="fileUp" className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all">
                  <ImageIcon size={32} className="text-emerald-500 mb-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase">Upload Imagens (Máx 1MB)</p>
                </label>
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {Array.isArray(formState.media) ? formState.media.map((m, i) => (
                    <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 relative shrink-0"><img src={m.url} className="w-full h-full object-cover" /></div>
                  )) : formState.media && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0"><img src={formState.media.url} className="w-full h-full object-cover" /></div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4"><input type="date" required className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black" value={formState.scheduleDate} onChange={e => setFormState({...formState, scheduleDate: e.target.value})} /><input type="time" required className="w-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black" value={formState.scheduleTime} onChange={e => setFormState({...formState, scheduleTime: e.target.value})} /></div>
                <textarea required rows={5} className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium outline-none" value={formState.content} onChange={e => setFormState({...formState, content: e.target.value})} placeholder="Legenda do post..."></textarea>
                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black" value={formState.hashtags} onChange={e => setFormState({...formState, hashtags: e.target.value})} placeholder="#hashtags" />
              </div>
              <button type="submit" disabled={isUploading} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                {isUploading ? <Loader2 className="animate-spin mx-auto" /> : (editingId ? 'Atualizar Post' : 'Publicar Conteúdo')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
