// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  CheckCircle2, XCircle, Clock, Send, Plus, Trash2, Smartphone, Eye, Copy, Image as ImageIcon, Film, 
  Hash, Check, Layers, Square, ThumbsUp, MessageSquare, Share2, Edit3, Globe, Calendar, AlertCircle, Briefcase, Loader2, Share, ChevronLeft, ChevronRight, LayoutGrid, FileDown, SendHorizonal, Maximize2
} from 'lucide-react';

// --- ÍCONES DE REDES SOCIAIS (SVG Direto para evitar erros de versão) ---
const Instagram = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);
const Facebook = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);
const Linkedin = ({ size = 18 }) => (
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
          <button type="button" onClick={prev} className={`absolute left-1 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-opacity z-10 ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/carousel:opacity-100'} w-5 h-5`}><ChevronLeft size={14} /></button>
          <button type="button" onClick={next} className={`absolute right-1 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-opacity z-10 ${currentIndex === mediaArr.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/carousel:opacity-100'} w-5 h-5`}><ChevronRight size={14} /></button>
          <span className="absolute top-1 right-1 bg-slate-900/60 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md z-10 backdrop-blur-sm">{currentIndex + 1}/{mediaArr.length}</span>
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
  const [newFeedbackMessage, setNewFeedbackMessage] = useState('');
  const [zoomedPost, setZoomedPost] = useState(null);
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

  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 1024 * 1024) { alert(`A imagem ${file.name} é maior que 1MB.`); return; }
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
      setIsModalOpen(false); setEditingId(null);
      setFormState({ content: '', platforms: [], hashtags: '', postType: 'estatico', media: null, scheduleDate: '', scheduleTime: '' });
    } catch (err) { alert("Erro ao guardar."); } finally { setIsUploading(false); }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!newFeedbackMessage.trim() || !feedbackPost) return;
    const authorRole = isClientView ? 'Cliente' : 'Agência';
    const newMsg = { text: newFeedbackMessage.trim(), author: authorRole, date: new Date().toISOString() };
    const updatedFeedbacks = [...(feedbackPost.feedbacks || []), newMsg];
    await setDoc(doc(db, 'projetos', 'vita', 'posts', feedbackPost.id), { feedbacks: updatedFeedbacks }, { merge: true });
    setNewFeedbackMessage('');
  };

  const changeStatus = (id, s) => setDoc(doc(db, 'projetos', 'vita', 'posts', id), { status: s }, { merge: true });

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-emerald-600 animate-pulse">Sincronizando Vitá...</div>;

  const filteredPosts = posts.filter(p => activeTab === 'todos' || p.status === activeTab);

  return (
    <>
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden print:hidden">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 h-full shrink-0">  
        <div className="flex items-center gap-3"><div className="bg-emerald-600 p-2 rounded-2xl text-white shadow-lg shadow-emerald-100"><Send size={24} /></div><span className="font-black text-2xl tracking-tighter">SocialFlow</span></div>
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Cliente</p><h3 className="text-lg font-black text-slate-800">{CLIENTE_VITA.name}</h3></div>
          <nav className="space-y-1">
             <button onClick={() => setMainView('feed')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all ${mainView === 'feed' ? 'bg-slate-900 text-white font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid size={18} /> Feed</button>
             <button onClick={() => setMainView('calendario')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all ${mainView === 'calendario' ? 'bg-slate-900 text-white font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={18} /> Calendário</button>
          </nav>
          <nav className="space-y-1">
            {['todos', 'pendente', 'aprovado', 'rejeitado'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm transition-all capitalize ${activeTab === t ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>{t}</button>
            ))}
          </nav>
        </div>
        {!isClientView && (
          <div className="mt-auto space-y-3">
             <button onClick={() => window.print()} className="w-full bg-slate-50 text-slate-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs border border-slate-200"><FileDown size={16} /> Exportar PDF</button>
             <button onClick={() => { setEditingId(null); setFormState({ content: '', platforms: [], hashtags: '', postType: 'estatico', media: null, scheduleDate: '', scheduleTime: '' }); setIsModalOpen(true); }} className="w-full bg-emerald-600 text-white py-4 rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-xl"><Plus size={20} /> Novo Post</button>
          </div>
        )}
      </aside>

      <main className="flex-1 h-full overflow-y-auto p-5 md:p-10 min-w-0">
        <header className="mb-10"><div className="flex items-center gap-2 mb-1"><div className={`w-4 h-4 rounded-lg bg-gradient-to-tr ${CLIENTE_VITA.color}`} /><h2 className="text-3xl font-black text-slate-900 tracking-tight">{CLIENTE_VITA.name}</h2></div><p className="text-slate-400 text-sm font-medium italic">Dashboard do Cliente</p></header>

        {mainView === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 w-full items-start">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-2">
                    {post.platforms.map(plt => (
                      <div key={plt} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-emerald-600">
                        {plt === 'instagram' && <Instagram />}
                        {plt === 'facebook' && <Facebook />}
                        {plt === 'linkedin' && <Linkedin />}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${post.status === 'aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : post.status === 'rejeitado' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{post.status}</span>
                    <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50"><Calendar size={14} /> {post.scheduleDate?.split('-').reverse().join('/')} às {post.scheduleTime}</span>
                  </div>
                </div>
                <div className="flex gap-6 items-start">
                  <div className="w-28 aspect-[4/5] shrink-0 rounded-2xl overflow-hidden border border-slate-100 relative bg-slate-50"><MediaCarousel media={post.media} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 text-sm font-medium line-clamp-3 mb-2 whitespace-pre-wrap">{post.content}</p>
                    <p className="text-emerald-600 text-[11px] font-black truncate">{post.hashtags}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setZoomedPost(post)} className="p-1.5 bg-slate-50 text-emerald-600 rounded-xl hover:bg-emerald-100 border border-slate-100"><Maximize2 size={16} /></button>
                    <button onClick={() => setFeedbackPost(post)} className="p-1.5 bg-slate-50 text-emerald-500 rounded-xl hover:bg-emerald-50 border border-slate-100 relative"><MessageSquare size={16} />{post.feedbacks?.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>}</button>
                    {!isClientView && (
                      <button onClick={() => { setEditingId(post.id); setFormState({...post}); setIsModalOpen(true); }} className="p-1.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-emerald-50 border border-slate-100"><Edit3 size={16} /></button>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {post.status !== 'rejeitado' && <button onClick={() => changeStatus(post.id, 'rejeitado')} className="bg-slate-50 text-rose-500 px-3 py-1.5 rounded-xl text-[10px] font-black border border-rose-100 truncate hover:bg-rose-100">Rejeitar</button>}
                    {post.status !== 'aprovado' && <button onClick={() => changeStatus(post.id, 'aprovado')} className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg">Aprovar Post</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {mainView === 'calendario' && (
          <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-8 border-b border-slate-100 flex justify-center items-center gap-6">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 hover:bg-slate-50 rounded-full text-slate-400"><ChevronLeft /></button>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{currentMonth.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 hover:bg-slate-50 rounded-full text-slate-400"><ChevronRight /></button>
             </div>
             <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (<div key={d} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{d}</div>))}</div>
             <div className="grid grid-cols-7 auto-rows-[160px]">
                {(() => {
                  const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate();
                  const cells = [];
                  for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="border-r border-b border-slate-50 bg-slate-50/30"></div>);
                  for (let d = 1; d <= days; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const dayPosts = posts.filter(p => p.scheduleDate === dateStr);
                    cells.push(
                      <div key={d} className="border-r border-b border-slate-100 p-3 flex flex-col gap-1.5 hover:bg-slate-50 transition-colors group">
                        <span className="text-xs font-black text-slate-300 group-hover:text-emerald-600">{d}</span>
                        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
                          {dayPosts.map(p => (
                            <div key={p.id} onClick={() => setZoomedPost(p)} className={`p-1.5 rounded-lg border flex flex-col gap-1 cursor-pointer hover:scale-[1.02] shadow-sm ${p.status === 'aprovado' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                               <div className="flex justify-between items-center"><span className="text-[8px] font-black text-slate-500">{p.scheduleTime}</span>{p.media && <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-200"><img src={Array.isArray(p.media) ? p.media[0].url : p.media.url} className="w-full h-full object-cover" /></div>}</div>
                               <p className="text-[8px] font-medium text-slate-700 line-clamp-2 leading-tight">{p.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return cells;
                })()}
             </div>
          </div>
        )}
      </main>

      {/* MODAL ZOOM */}
      {zoomedPost && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setZoomedPost(null)}>
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setZoomedPost(null)} className="absolute top-6 right-6 z-50 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><XCircle size={24} /></button>
            <div className="w-full md:w-1/2 bg-slate-50 border-r border-slate-100 p-8 flex items-center justify-center min-h-[300px]"><div className="w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden shadow-lg bg-white"><MediaCarousel media={zoomedPost.media} isPreview={true} /></div></div>
            <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto flex flex-col">
               <div className="flex gap-2 mb-6"><span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200">{zoomedPost.postType}</span><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${zoomedPost.status === 'aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : zoomedPost.status === 'rejeitado' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{zoomedPost.status}</span></div>
               <h3 className="text-xl font-black text-slate-900 mb-2">Detalhes da Postagem</h3>
               <p className="text-sm font-bold text-emerald-600 flex items-center gap-2 mb-8 bg-emerald-50 w-fit px-4 py-2 rounded-xl"><Calendar size={16} /> {zoomedPost.scheduleDate?.split('-').reverse().join('/')} às {zoomedPost.scheduleTime}</p>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6 flex-1"><p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{zoomedPost.content}</p></div>
               <p className="text-sm font-black text-emerald-600 mb-8">{zoomedPost.hashtags}</p>
               <div className="flex gap-2 mt-auto">
                  <button onClick={() => { changeStatus(zoomedPost.id, 'aprovado'); setZoomedPost(null); }} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors uppercase">Aprovar Post</button>
                  <button onClick={() => { changeStatus(zoomedPost.id, 'rejeitado'); setZoomedPost(null); }} className="flex-1 bg-rose-50 text-rose-600 py-4 rounded-2xl font-black text-xs hover:bg-rose-100 transition-colors uppercase">Rejeitar</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO POST */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-xl z-10">
              <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Editar Post' : 'Novo Conteúdo'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:rotate-90 transition-all"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Destino</label>
                    <div className="flex gap-2">
                      {['instagram', 'facebook', 'linkedin'].map(plt => (
                        <button key={plt} type="button" onClick={() => setFormState(p => ({ ...p, platforms: p.platforms.includes(plt) ? p.platforms.filter(x => x !== plt) : [...p.platforms, plt] }))} className={`flex-1 py-3 rounded-xl border-2 transition-all font-black text-[9px] uppercase ${formState.platforms.includes(plt) ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>{plt}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Formato</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{id:'estatico',icon:<Square size={16}/>,label:'Post'},{id:'carrossel',icon:<Layers size={16}/>,label:'Álbum'},{id:'reel',icon:<Film size={16}/>,label:'Vídeo'}].map(type => (
                        <button key={type.id} type="button" onClick={() => setFormState({...formState, postType: type.id})} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${formState.postType === type.id ? 'border-emerald-600 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>{type.icon} <span className="text-[9px] font-black uppercase">{type.label}</span></button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Mídia (Máx 1MB cada)</label>
                    <input type="file" className="hidden" id="fileUp" onChange={handleMediaUpload} accept="image/*" multiple={formState.postType === 'carrossel'} />
                    <label htmlFor="fileUp" className="h-24 w-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all"><Plus size={24} className="text-emerald-500 mb-1" /><span className="text-[9px] font-black text-slate-500 uppercase">Upload</span></label>
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {Array.isArray(formState.media) ? formState.media.map((m, i) => (
                        <div key={i} className="h-20 w-20 shrink-0 relative rounded-2xl overflow-hidden border border-slate-200"><img src={m.url} className="w-full h-full object-cover" /><button type="button" onClick={() => setFormState(p => ({...p, media: p.media.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg hover:scale-110 transition-transform"><Trash2 size={12} /></button></div>
                      )) : formState.media && (
                        <div className="h-20 w-20 shrink-0 relative rounded-2xl overflow-hidden border border-slate-200"><img src={formState.media.url} className="w-full h-full object-cover" /><button type="button" onClick={() => setFormState(p => ({...p, media: null}))} className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg hover:scale-110 transition-transform"><Trash2 size={12} /></button></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100">
                    <label className="block text-[10px] font-black text-emerald-400 uppercase mb-4 tracking-widest">Agendamento</label>
                    <div className="space-y-3">
                      <input type="date" required className="w-full p-4 bg-white border border-emerald-100 rounded-2xl text-xs font-black outline-none" value={formState.scheduleDate} onChange={(e) => setFormState({...formState, scheduleDate: e.target.value})} />
                      <input type="time" required className="w-full p-4 bg-white border border-emerald-100 rounded-2xl text-xs font-black outline-none" value={formState.scheduleTime} onChange={(e) => setFormState({...formState, scheduleTime: e.target.value})} />
                    </div>
                  </div>
                  <textarea required rows={5} className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed" value={formState.content} onChange={(e) => setFormState({...formState, content: e.target.value})} placeholder="Legenda do post..."></textarea>
                  <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-xs font-black outline-none" value={formState.hashtags} onChange={(e) => setFormState({...formState, hashtags: e.target.value})} placeholder="#vitá #socialmedia" />
                </div>
              </div>
              <div className="flex gap-4 pt-6 border-t border-slate-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase hover:text-slate-600">Sair</button>
                <button type="submit" disabled={isUploading} className="flex-[2] flex items-center justify-center gap-2 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all">{isUploading ? <><Loader2 className="animate-spin" /> A guardar...</> : (editingId ? 'Atualizar Post' : 'Publicar Conteúdo')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FEEDBACK */}
      {feedbackPost && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div><h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><MessageSquare size={18} className="text-emerald-500" /> Chat do Post</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {feedbackPost.status}</p></div>
              <button onClick={() => setFeedbackPost(null)} className="p-2 bg-white rounded-xl text-slate-400 shadow-sm"><XCircle size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
              {(!feedbackPost.feedbacks || feedbackPost.feedbacks.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2 opacity-50"><MessageSquare size={32} /><p className="text-xs font-bold uppercase tracking-widest">Sem mensagens</p></div>
              ) : (
                feedbackPost.feedbacks.map((msg, i) => {
                  const isMine = (isClientView && msg.author === 'Cliente') || (!isClientView && msg.author === 'Agência');
                  return (
                    <div key={i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] font-black text-slate-400 uppercase mb-1">{msg.author} • {new Date(msg.date).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}</span>
                      <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm font-medium leading-relaxed shadow-sm ${isMine ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>{msg.text}</div>
                    </div>
                  )
                })
              )}
            </div>
            <form onSubmit={handleSendFeedback} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input type="text" value={newFeedbackMessage} onChange={(e) => setNewFeedbackMessage(e.target.value)} placeholder="Escreva o seu comentário..." className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:border-emerald-500 transition-colors" />
              <button type="submit" disabled={!newFeedbackMessage.trim()} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all flex-shrink-0"><SendHorizonal size={20} /></button>
            </form>
          </div>
        </div>
      )}
    </div>

    {/* LAYOUT PARA IMPRESSÃO/PDF */}
    <div className="hidden print:block bg-white p-8 font-sans">
      <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
        <div><h1 className="text-3xl font-black text-slate-900 mb-1">Relatório de Rascunhos</h1><h2 className="text-lg font-bold text-slate-500">{CLIENTE_VITA.name}</h2></div>
        <div className="text-right"><p className="text-sm font-bold text-slate-400">Data de Geração</p><p className="text-lg font-black text-slate-900">{new Date().toLocaleDateString('pt-PT')}</p></div>
      </div>
      <div className="space-y-12">
        {filteredPosts.map(post => (
          <div key={post.id} className="break-inside-avoid border border-slate-200 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
               <div className="flex gap-3"><span className="font-black text-xs uppercase bg-slate-100 px-2 py-1 rounded text-slate-600">{post.platforms.join(' • ')}</span><span className="font-black text-xs uppercase bg-slate-100 px-2 py-1 rounded text-slate-600">{post.postType}</span></div>
               <span className="font-black text-sm text-emerald-600">{post.scheduleDate?.split('-').reverse().join('/')} às {post.scheduleTime}</span>
            </div>
            <div className="flex gap-6">
              {post.media && <div className="w-48 shrink-0"><img src={Array.isArray(post.media) ? post.media[0].url : post.media.url} className="w-full h-auto rounded-lg shadow-sm" /></div>}
              <div className="flex-1"><p className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{post.content}</p><p className="text-sm font-bold text-emerald-600 mt-4">{post.hashtags}</p><div className="mt-4 inline-block px-3 py-1 bg-slate-100 rounded-md text-xs font-black uppercase text-slate-500">Status: {post.status}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
