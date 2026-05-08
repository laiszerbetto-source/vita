import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  CheckCircle2, XCircle, Clock, Send, Instagram, Facebook, Linkedin, 
  Plus, Trash2, Smartphone, Eye, Copy, Image as ImageIcon, Film, 
  Hash, Check, Layers, Square, ThumbsUp, MessageSquare, Share2, Edit3, Globe, Calendar, AlertCircle, Briefcase, Loader2, Share, ChevronLeft, ChevronRight, LayoutGrid, FileDown, SendHorizonal, Maximize2
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyARH2lOjbz9fQsOVJ25y-IQdzuMnfbfpRE",
  authDomain: "aoki-7a6ec.firebaseapp.com",
  projectId: "aoki-7a6ec",
  storageBucket: "aoki-7a6ec.firebasestorage.app",
  messagingSenderId: "762583424160",
  appId: "1:762583424160:web:72fa8b3bf5597a1db13dc5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Cliente Único
const CLIENTE_VITA = { name: 'Vitá', color: 'from-emerald-400 to-teal-600' };

// --- COMPONENTE DE CARROSSEL ---
const MediaCarousel = ({ media, isPreview = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mediaArr = Array.isArray(media) ? media : (media ? [media] : []);

  if (mediaArr.length === 0) {
    return <div className="w-full h-full flex items-center justify-center bg-slate-50"><ImageIcon size={24} className="text-slate-200" /></div>;
  }

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
          <button type="button" onClick={prev} className={`absolute left-1 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-opacity z-10 ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/carousel:opacity-100'} ${isPreview ? 'w-8 h-8' : 'w-5 h-5'}`}><ChevronLeft size={isPreview ? 20 : 14} /></button>
          <button type="button" onClick={next} className={`absolute right-1 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-opacity z-10 ${currentIndex === mediaArr.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/carousel:opacity-100'} ${isPreview ? 'w-8 h-8' : 'w-5 h-5'}`}><ChevronRight size={isPreview ? 20 : 14} /></button>
          {isPreview ? (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 p-1.5 bg-black/30 backdrop-blur-md rounded-full">
              {mediaArr.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all duration-300 ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/50'}`} />)}
            </div>
          ) : (
            <span className="absolute top-1 right-1 bg-slate-900/60 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md z-10 backdrop-blur-sm">{currentIndex + 1}/{mediaArr.length}</span>
          )}
        </>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('todos');
  const [mainView, setMainView] = useState('feed');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isClientView, setIsClientView] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [feedbackPost, setFeedbackPost] = useState(null);
  const [newFeedbackMessage, setNewFeedbackMessage] = useState('');
  const [zoomedPost, setZoomedPost] = useState(null);

  const [draggedMediaIdx, setDraggedMediaIdx] = useState(null);

  const [formState, setFormState] = useState({
    content: '', platforms: [], hashtags: '', postType: 'estatico',
    media: null, scheduleDate: '', scheduleTime: ''
  });
  
  const [previewPost, setPreviewPost] = useState(null);
  const [previewPlatform, setPreviewPlatform] = useState('instagram');

  const fileInputRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'client') setIsClientView(true);
  }, []);

  useEffect(() => {
    document.title = isClientView ? `Aprovação: ${CLIENTE_VITA.name}` : `SocialFlow | ${CLIENTE_VITA.name}`;
  }, [isClientView]);

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Erro auth:", err));
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); if (!u) setIsLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const postsRef = collection(db, 'projetos', 'vita', 'posts');
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      const docs = [];
      snapshot.forEach(d => docs.push({ id: d.id, ...d.data() }));
      docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPosts(docs);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!previewPost && posts.length > 0) {
      setPreviewPost(posts[0]);
      setPreviewPlatform(posts[0].platforms[0]);
    }
    if (feedbackPost) { const updated = posts.find(p => p.id === feedbackPost.id); if (updated) setFeedbackPost(updated); }
    if (zoomedPost) { const updated = posts.find(p => p.id === zoomedPost.id); if (updated) setZoomedPost(updated); }
  }, [posts]);

  const filteredPosts = posts.filter(p => activeTab === 'todos' || p.status === activeTab);

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadError('');
    if (files.length === 0) return;
    const newMedia = files.map(file => ({ type: file.type.startsWith('video') ? 'video' : 'image', url: URL.createObjectURL(file), file: file }));
    setFormState(prev => ({ ...prev, media: prev.postType === 'carrossel' ? [...(Array.isArray(prev.media) ? prev.media : (prev.media ? [prev.media] : [])), ...newMedia] : newMedia[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.content.trim() || formState.platforms.length === 0) return;
    setIsUploading(true);

    try {
      let finalMediaData = null;
      if (formState.media) {
        const mediaArray = Array.isArray(formState.media) ? formState.media : [formState.media];
        const processedMedia = [];
        for (const m of mediaArray) {
          if (m.file) {
            const fileRef = ref(storage, `projetos/vita/posts/${Date.now()}_${m.file.name}`);
            await uploadBytes(fileRef, m.file);
            const downloadUrl = await getDownloadURL(fileRef);
            processedMedia.push({ type: m.type, url: downloadUrl });
          } else {
            processedMedia.push(m);
          }
        }
        finalMediaData = formState.postType === 'carrossel' ? processedMedia : processedMedia[0];
      }

      const id = editingId || Date.now().toString();
      await setDoc(doc(db, 'projetos', 'vita', 'posts', id), {
        ...formState, media: finalMediaData, 
        status: editingId ? (posts.find(p => p.id === editingId)?.status || 'pendente') : 'pendente',
        date: editingId ? posts.find(p => p.id === editingId).date : new Date().toISOString(),
      }, { merge: true });

      setIsModalOpen(false); setEditingId(null);
      setFormState({ content: '', platforms: [], hashtags: '', postType: 'estatico', media: null, scheduleDate: '', scheduleTime: '' });
    } catch (err) { setUploadError("Erro ao guardar."); } finally { setIsUploading(false); }
  };

  const removeMedia = (index) => {
    setFormState(prev => {
      const newMedia = Array.isArray(prev.media) ? [...prev.media] : [prev.media];
      newMedia.splice(index, 1);
      return { ...prev, media: newMedia.length > 0 ? (prev.postType === 'carrossel' ? newMedia : newMedia[0]) : null };
    });
  };

  const deletePost = async (id) => { if (confirm("Apagar rascunho permanentemente?")) await deleteDoc(doc(db, 'projetos', 'vita', 'posts', id)); };

  const copyClientLink = () => {
    const url = new URL(window.location.href); url.searchParams.set('view', 'client');
    const textArea = document.createElement("textarea"); textArea.value = url.toString();
    document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);
    alert("Link copiado!");
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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days };
  };

  const changePostStatus = (id, newStatus, e) => {
    if (e) e.stopPropagation();
    setDoc(doc(db, 'projetos', 'vita', 'posts', id), { status: newStatus }, { merge: true });
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-indigo-600 animate-pulse text-xl"><Loader2 className="animate-spin mr-3" /> Sincronizando Flow...</div>;

  return (
    <>
    <div className="fixed inset-0 flex flex-col md:flex-row bg-[#F8FAFC] font-sans text-slate-900 antialiased overflow-hidden print:hidden">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-b md:border-r border-slate-200 p-5 md:p-6 flex flex-col gap-8 max-h-[45vh] md:max-h-none md:h-full overflow-y-auto overflow-x-hidden z-20 shrink-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">  
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-100"><Send size={24} /></div>
          <span className="font-black text-2xl tracking-tighter">SocialFlow</span>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
            <h3 className="text-lg font-black text-slate-800">{CLIENTE_VITA.name}</h3>
          </div>
          <nav className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4">Visualização</p>
             <button onClick={() => setMainView('feed')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all ${mainView === 'feed' ? 'bg-slate-900 text-white font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid size={18} /> Feed</button>
             <button onClick={() => setMainView('calendario')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all ${mainView === 'calendario' ? 'bg-slate-900 text-white font-bold shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={18} /> Calendário</button>
          </nav>
          <nav className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4">Status</p>
            {[{ id: 'todos', label: 'Todos', icon: <Eye size={18} /> }, { id: 'pendente', label: 'Pendentes', icon: <Clock size={18} className="text-amber-500" /> }, { id: 'aprovado', label: 'Aprovados', icon: <CheckCircle2 size={18} className="text-emerald-500" /> }, { id: 'rejeitado', label: 'Rejeitados', icon: <XCircle size={18} className="text-rose-500" /> }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm transition-all ${activeTab === t.id ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>{t.icon} {t.label}</button>
            ))}
          </nav>
        </div>

        {!isClientView && (
          <div className="mt-auto space-y-3">
             <button onClick={() => window.print()} className="w-full bg-slate-50 text-slate-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all text-xs border border-slate-200"><FileDown size={16} /> Exportar PDF</button>
             <button onClick={copyClientLink} className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all text-xs border border-slate-200"><Share size={16} /> Link p/ Cliente</button>
             <button onClick={() => { setEditingId(null); setFormState({ content: '', platforms: [], hashtags: '', postType: 'estatico', media: null, scheduleDate: '', scheduleTime: '' }); setIsModalOpen(true); }} className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl"><Plus size={20} /> Novo Post</button>
          </div>
        )}
      </aside>

      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-5 md:p-10 min-w-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-4 h-4 rounded-lg bg-gradient-to-tr ${CLIENTE_VITA.color} shadow-sm`} />
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{CLIENTE_VITA.name}</h2>
            </div>
            <p className="text-slate-400 text-sm font-medium italic">Dashboard do Cliente</p>
          </div>
        </header>

        {mainView === 'feed' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start content-start">
              {filteredPosts.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center flex flex-col items-center lg:col-span-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest"><ImageIcon className="w-12 h-12 mb-4 text-slate-200" /> Sem rascunhos</div>
              ) : (
                filteredPosts.map(post => (
                  <div key={post.id} onClick={() => { setPreviewPost(post); setPreviewPlatform(post.platforms[0]); }} className={`bg-white p-6 rounded-[2.5rem] border transition-all cursor-pointer hover:shadow-2xl relative ${previewPost?.id === post.id ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-2">
                        {post.platforms.map(plt => (
                          <div key={plt} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-indigo-600">
                            {plt === 'instagram' && <Instagram size={18} />}
                            {plt === 'facebook' && <Facebook size={18} />}
                            {plt === 'linkedin' && <Linkedin size={18} />}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200">{post.postType}</span>
                          <select 
                            value={post.status} 
                            onChange={(e) => changePostStatus(post.id, e.target.value, e)}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border outline-none cursor-pointer appearance-none text-center ${post.status === 'aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : post.status === 'rejeitado' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                          >
                            <option value="pendente">Pendente</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="rejeitado">Rejeitado</option>
                          </select>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-black flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100/50">
                          <Calendar size={14} /> {post.scheduleDate ? `${post.scheduleDate.split('-').reverse().join('/')} às ${post.scheduleTime}` : 'Imediato'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-6 items-start">
                      <div className="w-28 aspect-[4/5] shrink-0 rounded-2xl overflow-hidden border border-slate-100 relative shadow-inner">
                        <MediaCarousel media={post.media} isPreview={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 text-sm font-medium line-clamp-3 mb-2 whitespace-pre-wrap">{post.content}</p>
                        <p className="text-indigo-600 text-[11px] font-black truncate">{post.hashtags}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 mt-6 pt-6 border-t border-slate-50 overflow-hidden">
                      <div className="flex items-center gap-1 min-w-0">
                        <button onClick={(e) => { e.stopPropagation(); setZoomedPost(post); }} className="p-1.5 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-100 border border-slate-100 transition-all flex-shrink-0" title="Ampliar">
                          <Maximize2 size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setFeedbackPost(post); }} className="p-1.5 bg-slate-50 text-indigo-500 rounded-xl hover:bg-indigo-50 border border-slate-100 transition-all flex-shrink-0 relative">
                          <MessageSquare size={16} />
                          {post.feedbacks?.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white"></span>}
                        </button>
                        
                        {!isClientView && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(post.id); setFormState({...post}); setIsModalOpen(true); }} className="p-1.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 border border-slate-100 transition-all flex-shrink-0"><Edit3 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); deletePost(post.id); }} className="p-1.5 bg-slate-50 text-slate-300 rounded-xl hover:text-rose-600 border border-slate-100 flex-shrink-0"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 shrink-0">
                        {post.status !== 'rejeitado' && <button onClick={(e) => changePostStatus(post.id, 'rejeitado', e)} className="bg-slate-50 text-rose-500 px-3 py-1.5 rounded-xl text-[10px] font-black border border-rose-100 truncate hover:bg-rose-100 transition-colors">Rejeitar</button>}
                        {post.status !== 'pendente' && <button onClick={(e) => changePostStatus(post.id, 'pendente', e)} className="bg-slate-50 text-amber-500 px-3 py-1.5 rounded-xl text-[10px] font-black border border-amber-100 truncate hover:bg-amber-100 transition-colors">Pendente</button>}
                        {post.status !== 'aprovado' && <button onClick={(e) => changePostStatus(post.id, 'aprovado', e)} className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg truncate hover:bg-emerald-600 transition-colors">Aprovar Post</button>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* PREVIEW DO CELULAR */}
            <div className="hidden xl:block sticky top-10 space-y-6">
             {previewPost && (
                <div className="flex justify-center gap-2 bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm w-fit mx-auto">
                  {previewPost.platforms.map(plt => (
                    <button key={plt} onClick={() => setPreviewPlatform(plt)} className={`w-20 py-3 rounded-xl transition-all ${previewPlatform === plt ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                      {plt === 'instagram' && <Instagram size={18} className="mx-auto" />}
                      {plt === 'facebook' && <Facebook size={18} className="mx-auto" />}
                      {plt === 'linkedin' && <Linkedin size={18} className="mx-auto" />}
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-slate-900 rounded-[4rem] p-4 shadow-2xl relative border-[12px] border-slate-800 mx-auto w-[340px] h-[640px]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-800 rounded-b-[2rem] z-20 flex items-center justify-center"><div className="w-14 h-1.5 bg-slate-700 rounded-full" /></div>
                <div className="bg-white rounded-[3rem] h-full overflow-hidden flex flex-col relative shadow-inner">
                  {previewPost ? (
                    <div className="flex-1 overflow-y-auto bg-slate-50 pt-10 pb-24">
                       <div className="bg-white px-5 py-4 border-b border-slate-50 flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-slate-300 uppercase">{previewPlatform}</span>
                          <Smartphone size={14} className="text-slate-200" />
                       </div>
                       <div className="p-4">
                         <div className="relative group mb-4 rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-white aspect-[4/5]">
                            <MediaCarousel media={previewPost.media} isPreview={true} />
                         </div>
                         <p className="text-[12.5px] text-slate-800 font-medium whitespace-pre-wrap">{previewPost.content}</p>
                         <p className="text-[12.5px] text-indigo-600 font-bold mt-2">{previewPost.hashtags}</p>
                       </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-200 opacity-20"><Smartphone size={48} className="mb-4" /><p className="text-[10px] font-black uppercase">Selecione um post</p></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: CALENDÁRIO */}
        {mainView === 'calendario' && (
          <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-6">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 hover:bg-slate-50 rounded-full text-slate-400"><ChevronLeft /></button>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{currentMonth.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}</h3>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 hover:bg-slate-50 rounded-full text-slate-400"><ChevronRight /></button>
               </div>
            </div>

            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[160px]">
              {(() => {
                const { firstDay, days } = getDaysInMonth(currentMonth);
                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<div key={`empty-${i}`} className="border-r border-b border-slate-50 bg-slate-50/30"></div>);
                }
                for (let d = 1; d <= days; d++) {
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const dayPosts = filteredPosts.filter(p => p.scheduleDate === dateStr);
                  
                  cells.push(
                    <div 
                      key={d} 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const postId = e.dataTransfer.getData('postId');
                        if (postId) setDoc(doc(db, 'projetos', 'vita', 'posts', postId), { scheduleDate: dateStr }, { merge: true });
                      }}
                      className="border-r border-b border-slate-100 p-3 flex flex-col gap-1.5 hover:bg-slate-50 transition-colors group"
                    >
                      <span className="text-xs font-black text-slate-300 group-hover:text-indigo-600">{d}</span>
                      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
                        {dayPosts.map(p => (
                          <div 
                            key={p.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('postId', p.id)}
                            onClick={() => { setZoomedPost(p); }}
                            className={`p-1.5 rounded-lg border flex flex-col gap-1 cursor-pointer hover:scale-[1.02] shadow-sm ${
                              p.status === 'aprovado' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'
                            }`}
                          >
                             <div className="flex justify-between items-center pointer-events-none">
                                <span className="text-[8px] font-black text-slate-500">{p.scheduleTime}</span>
                                {p.media && <div className="w-4 h-4 rounded-sm overflow-hidden bg-slate-200"><img src={Array.isArray(p.media) ? p.media[0].url : p.media.url} className="w-full h-full object-cover" /></div>}
                             </div>
                             <p className="text-[8px] font-medium text-slate-700 line-clamp-2 leading-tight pointer-events-none">{p.content}</p>
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

      {/* MODAL DE ZOOM */}
      {zoomedPost && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setZoomedPost(null)}>
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setZoomedPost(null)} className="absolute top-6 right-6 z-50 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><XCircle size={24} /></button>
            
            <div className="w-full md:w-1/2 bg-slate-50 border-r border-slate-100 p-8 flex items-center justify-center min-h-[300px]">
               <div className="w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden shadow-lg bg-white">
                  <MediaCarousel media={zoomedPost.media} isPreview={true} />
               </div>
            </div>
            
            <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto flex flex-col">
               <div className="flex gap-2 mb-6">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200">{zoomedPost.postType}</span>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${zoomedPost.status === 'aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : zoomedPost.status === 'rejeitado' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{zoomedPost.status}</span>
               </div>
               
               <h3 className="text-xl font-black text-slate-900 mb-2">Detalhes da Postagem</h3>
               <p className="text-sm font-bold text-indigo-600 flex items-center gap-2 mb-8 bg-indigo-50 w-fit px-4 py-2 rounded-xl"><Calendar size={16} /> {zoomedPost.scheduleDate ? `${zoomedPost.scheduleDate.split('-').reverse().join('/')} às ${zoomedPost.scheduleTime}` : 'Imediato'}</p>
               
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6">
                  <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{zoomedPost.content}</p>
               </div>
               <p className="text-sm font-black text-indigo-600 mb-8">{zoomedPost.hashtags}</p>
               
               <div className="mt-auto pt-6 border-t border-slate-100 flex gap-2">
                  {zoomedPost.status !== 'rejeitado' && <button onClick={() => changePostStatus(zoomedPost.id, 'rejeitado')} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-2xl font-black text-xs hover:bg-rose-100 transition-colors">Rejeitar</button>}
                  {zoomedPost.status !== 'pendente' && <button onClick={() => changePostStatus(zoomedPost.id, 'pendente')} className="flex-1 bg-amber-50 text-amber-600 py-3 rounded-2xl font-black text-xs hover:bg-amber-100 transition-colors">Pendente</button>}
                  {zoomedPost.status !== 'aprovado' && <button onClick={() => changePostStatus(zoomedPost.id, 'aprovado')} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors">Aprovar Post</button>}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO/EDITAR POST */}
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
                        <button key={plt} type="button" onClick={() => setFormState(prev => ({ ...prev, platforms: prev.platforms.includes(plt) ? prev.platforms.filter(p => p !== plt) : [...prev.platforms, plt] }))} className={`flex-1 py-3 rounded-xl border-2 transition-all font-black text-[9px] uppercase ${formState.platforms.includes(plt) ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-md' : 'border-slate-100 text-slate-400'}`}>{plt}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Formato</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[ { id: 'estatico', icon: <Square size={16} />, label: 'Post' }, { id: 'carrossel', icon: <Layers size={16} />, label: 'Album' }, { id: 'reel', icon: <Film size={16} />, label: 'Vídeo' } ].map(type => (
                        <button key={type.id} type="button" onClick={() => setFormState({...formState, postType: type.id})} className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${formState.postType === type.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>{type.icon} <span className="text-[9px] font-black uppercase">{type.label}</span></button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">Mídia (Arraste p/ Reordenar)</label>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleMediaUpload} accept="image/*,video/*" multiple={formState.postType === 'carrossel'} />
                    <div className="flex gap-3 overflow-x-auto w-full pb-2 scrollbar-hide items-start">
                      <div onClick={() => fileInputRef.current.click()} className="h-24 w-24 shrink-0 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-indigo-300 transition-all">
                        <Plus size={24} className="text-indigo-500 mb-1" />
                        <span className="text-[9px] font-black text-slate-500 uppercase">Upload</span>
                      </div>
                      {(() => {
                        const mArr = Array.isArray(formState.media) ? formState.media : (formState.media ? [formState.media] : []);
                        return mArr.map((m, i) => (
                          <div 
                            key={i} draggable onDragStart={() => setDraggedMediaIdx(i)} onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); if (draggedMediaIdx === null || draggedMediaIdx === i) return; setFormState(prev => { const newMedia = [...prev.media]; const temp = newMedia[draggedMediaIdx]; newMedia.splice(draggedMediaIdx, 1); newMedia.splice(i, 0, temp); return { ...prev, media: newMedia }; }); setDraggedMediaIdx(null); }}
                            className="h-24 w-24 shrink-0 relative rounded-[1.5rem] overflow-hidden border border-slate-200 group/item cursor-grab active:cursor-grabbing"
                          >
                            <img src={m.url} className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm"><button type="button" onClick={() => removeMedia(i)} className="bg-rose-500 text-white p-2 rounded-xl hover:scale-110 transition-transform"><Trash2 size={16} /></button></div>
                            <span className="absolute top-1 left-1 bg-slate-900/60 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md pointer-events-none">{i + 1}</span>
                          </div>
                        ));
                      })()}
                    </div>
                    {uploadError && <p className="text-red-500 text-[10px] font-bold mt-2">{uploadError}</p>}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase mb-4 tracking-widest">Agendamento</label>
                    <div className="space-y-3">
                      <input type="date" required className="w-full p-4 bg-white border border-indigo-100 rounded-2xl text-xs font-black outline-none" value={formState.scheduleDate} onChange={(e) => setFormState({...formState, scheduleDate: e.target.value})} />
                      <input type="time" required className="w-full p-4 bg-white border border-indigo-100 rounded-2xl text-xs font-black outline-none" value={formState.scheduleTime} onChange={(e) => setFormState({...formState, scheduleTime: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Legenda</label>
                    <textarea required rows={5} className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed" value={formState.content} onChange={(e) => setFormState({...formState, content: e.target.value})} placeholder="Escreve aqui..."></textarea>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Hashtags</label>
                    <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-xs font-black outline-none" value={formState.hashtags} onChange={(e) => setFormState({...formState, hashtags: e.target.value})} placeholder="#vita #socialmedia" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black text-[10px] uppercase hover:text-slate-600 transition-colors">Sair</button>
                <button type="submit" disabled={formState.platforms.length === 0 || isUploading} className={`flex-[2] flex items-center justify-center gap-2 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${formState.platforms.length === 0 ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {isUploading ? <><Loader2 size={16} className="animate-spin" /> A guardar...</> : (editingId ? 'Atualizar Post' : 'Lançar Post')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CHAT DE FEEDBACK */}
      {feedbackPost && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><MessageSquare size={18} className="text-indigo-500" /> Chat do Post</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {feedbackPost.status}</p>
              </div>
              <button onClick={() => setFeedbackPost(null)} className="p-2 bg-white rounded-xl text-slate-400 shadow-sm"><XCircle size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
              {(!feedbackPost.feedbacks || feedbackPost.feedbacks.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2 opacity-50">
                  <MessageSquare size={32} />
                  <p className="text-xs font-bold uppercase tracking-widest">Sem mensagens</p>
                </div>
              ) : (
                feedbackPost.feedbacks.map((msg, i) => {
                  const isMine = (isClientView && msg.author === 'Cliente') || (!isClientView && msg.author === 'Agência');
                  return (
                    <div key={i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] font-black text-slate-400 uppercase mb-1">{msg.author} • {new Date(msg.date).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</span>
                      <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm font-medium leading-relaxed shadow-sm ${isMine ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form onSubmit={handleSendFeedback} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input type="text" value={newFeedbackMessage} onChange={(e) => setNewFeedbackMessage(e.target.value)} placeholder="Escreva o seu comentário..." className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:border-indigo-500 transition-colors" />
              <button type="submit" disabled={!newFeedbackMessage.trim()} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex-shrink-0"><SendHorizonal size={20} /></button>
            </form>
          </div>
        </div>
      )}
    </div>

    {/* LAYOUT EXCLUSIVO PARA IMPRESSÃO/PDF */}
    <div className="hidden print:block bg-white p-8 font-sans">
      <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">Relatório de Rascunhos</h1>
          <h2 className="text-lg font-bold text-slate-500">{CLIENTE_VITA.name}</h2>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400">Data de Geração</p>
          <p className="text-lg font-black text-slate-900">{new Date().toLocaleDateString('pt-PT')}</p>
        </div>
      </div>

      <div className="space-y-12">
        {filteredPosts.length === 0 ? (
          <p className="text-center text-slate-400 font-bold">Não existem posts no filtro atual para exportar.</p>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className="break-inside-avoid border border-slate-200 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                <div className="flex gap-3">
                  <span className="font-black text-xs uppercase bg-slate-100 px-2 py-1 rounded text-slate-600">{post.platforms.join(' • ')}</span>
                  <span className="font-black text-xs uppercase bg-slate-100 px-2 py-1 rounded text-slate-600">{post.postType}</span>
                </div>
                <span className="font-black text-sm text-indigo-600">{post.scheduleDate ? `${post.scheduleDate.split('-').reverse().join('/')} às ${post.scheduleTime}` : 'Imediato'}</span>
              </div>
              
              <div className="flex gap-6">
                {post.media && (
                  <div className="w-48 shrink-0">
                    <img src={Array.isArray(post.media) ? post.media[0].url : post.media.url} className="w-full h-auto rounded-lg" />
                    {Array.isArray(post.media) && post.media.length > 1 && <p className="text-xs font-bold text-slate-400 mt-2 text-center">+ {post.media.length - 1} imagem(ns)</p>}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  <p className="text-sm font-bold text-indigo-600 mt-4">{post.hashtags}</p>
                  <div className="mt-4 inline-block px-3 py-1 bg-slate-100 rounded-md text-xs font-black uppercase text-slate-500">Status: {post.status}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}