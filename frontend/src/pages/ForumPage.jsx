import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  MessageSquare, Users, Eye, Clock, ArrowLeft,
  Plus, Send, ThumbsUp, Pin
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ForumPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [threads, setThreads] = useState([]);
  const [thread, setThread] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [newThread, setNewThread] = useState({
    title: "",
    content: "",
    category: "general"
  });

  useEffect(() => {
    fetchData();
  }, [threadId, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes] = await Promise.all([
        axios.get(`${API_URL}/api/forum/categories`)
      ]);
      setCategories(catRes.data.categories);

      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        setUser(userRes.data);
      } catch (e) {}

      if (threadId) {
        const threadRes = await axios.get(`${API_URL}/api/forum/threads/${threadId}`);
        setThread(threadRes.data);
      } else {
        const params = selectedCategory ? `?category=${selectedCategory}` : "";
        const threadsRes = await axios.get(`${API_URL}/api/forum/threads${params}`);
        setThreads(threadsRes.data.threads);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/forum/threads`, newThread, { withCredentials: true });
      toast.success("Discuție creată!");
      navigate(`/forum/${res.data.thread_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!replyContent.trim()) return;
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/forum/threads/${threadId}/reply`,
        { content: replyContent },
        { withCredentials: true }
      );
      setReplyContent("");
      fetchData(); // Refresh
      toast.success("Răspuns postat!");
    } catch (error) {
      toast.error("Eroare la postare");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Thread detail view
  if (threadId && thread) {
    return (
      <div className="min-h-screen bg-[#050505]" data-testid="forum-thread">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Link to="/forum" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            Înapoi la Forum
          </Link>
          
          {/* Original Post */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {thread.user_picture ? (
                  <img src={thread.user_picture} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  thread.user_name?.[0]?.toUpperCase() || "U"
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-medium">{thread.user_name}</span>
                  {thread.is_pinned && (
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Fixat
                    </span>
                  )}
                  <span className="text-slate-500 text-sm">
                    {new Date(thread.created_at).toLocaleDateString("ro-RO")}
                  </span>
                </div>
                
                <h1 className="text-2xl font-bold text-white mb-4">{thread.title}</h1>
                <p className="text-slate-300 whitespace-pre-wrap">{thread.content}</p>
                
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <Eye className="w-4 h-4" /> {thread.views} vizualizări
                  </span>
                  <span className="text-slate-500 text-sm flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" /> {thread.reply_count} răspunsuri
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Replies */}
          {thread.replies?.length > 0 && (
            <div className="space-y-4 mb-6">
              <h3 className="text-white font-medium">Răspunsuri ({thread.replies.length})</h3>
              
              {thread.replies.map((reply) => (
                <div key={reply.reply_id} className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {reply.user_picture ? (
                        <img src={reply.user_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        reply.user_name?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">{reply.user_name}</span>
                        <span className="text-slate-500 text-xs">
                          {new Date(reply.created_at).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply Form */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
            <form onSubmit={handleReply} className="flex gap-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={user ? "Scrie un răspuns..." : "Autentifică-te pentru a răspunde"}
                disabled={!user}
                rows={3}
                className="flex-1 p-3 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 resize-none disabled:opacity-50"
              />
              <Button 
                type="submit" 
                disabled={!user || submitting || !replyContent.trim()}
                className="bg-blue-600 hover:bg-blue-500 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  // Forum list view
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="forum-page">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full mb-4">
              <Users className="w-5 h-5" />
              Comunitate
            </div>
            <h1 className="text-3xl font-bold text-white">Forum Discuții</h1>
            <p className="text-slate-400">Discută cu alți utilizatori, cere sfaturi și împărtășește experiențe</p>
          </div>
          
          <Button 
            onClick={() => user ? setShowNewThread(true) : navigate("/auth")}
            className="bg-purple-600 hover:bg-purple-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Discuție Nouă
          </Button>
        </div>

        {/* New Thread Form */}
        {showNewThread && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Creează Discuție Nouă</h3>
            
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Titlu</label>
                  <input
                    type="text"
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                    placeholder="Despre ce vrei să discuți?"
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Categorie</label>
                  <select
                    value={newThread.category}
                    onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Mesaj</label>
                <textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  placeholder="Descrie subiectul în detaliu..."
                  rows={5}
                  className="w-full p-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-500">
                  {submitting ? "Se creează..." : "Publică"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowNewThread(false)} className="border-white/10">
                  Anulează
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 sticky top-24">
              <h3 className="text-white font-medium mb-4">Categorii</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === null ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  📋 Toate discuțiile
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === cat.id ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Threads List */}
          <div className="lg:col-span-3">
            {threads.length === 0 ? (
              <div className="text-center py-16 bg-[#0A0A0A] border border-white/5 rounded-xl">
                <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nu există discuții în această categorie</p>
                <Button 
                  onClick={() => setShowNewThread(true)}
                  className="mt-4 bg-purple-600 hover:bg-purple-500"
                >
                  Începe o discuție
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((t) => (
                  <Link
                    key={t.thread_id}
                    to={`/forum/${t.thread_id}`}
                    className="block bg-[#0A0A0A] border border-white/5 rounded-xl p-4 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {t.user_picture ? (
                          <img src={t.user_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          t.user_name?.[0]?.toUpperCase() || "U"
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {t.is_pinned && (
                            <Pin className="w-4 h-4 text-yellow-400" />
                          )}
                          <h3 className="text-white font-medium truncate">{t.title}</h3>
                        </div>
                        
                        <div className="flex items-center gap-3 text-slate-500 text-sm">
                          <span>{t.user_name}</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {t.reply_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {t.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(t.last_reply_at).toLocaleDateString("ro-RO")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
