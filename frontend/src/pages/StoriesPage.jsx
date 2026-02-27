import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Trophy, Heart, MessageCircle, Clock, Send,
  ThumbsUp, Plus, ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function StoriesPage() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
    sold_item: "",
    sold_price: "",
    days_to_sell: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storiesRes] = await Promise.all([
        axios.get(`${API_URL}/api/stories`)
      ]);
      setStories(storiesRes.data.stories);
      
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        setUser(userRes.data);
      } catch (e) {
        // Not logged in
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/stories`, form, { withCredentials: true });
      toast.success("Povestea ta a fost trimisă! Va fi publicată după aprobare.");
      setShowForm(false);
      setForm({ title: "", content: "", category: "", sold_item: "", sold_price: "", days_to_sell: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la trimitere");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (storyId) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    try {
      const res = await axios.post(`${API_URL}/api/stories/${storyId}/like`, {}, { withCredentials: true });
      setStories(stories.map(s => 
        s.story_id === storyId 
          ? { ...s, likes: s.likes + (res.data.liked ? 1 : -1) }
          : s
      ));
    } catch (error) {
      toast.error("Eroare");
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

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="stories-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full mb-4">
            <Trophy className="w-5 h-5" />
            Povești de Succes
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Descoperă Cum Au Vândut Alții
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto mb-6">
            Citește povești reale de la utilizatori care au vândut cu succes pe platforma noastră
          </p>
          
          <Button 
            onClick={() => user ? setShowForm(true) : navigate("/auth")}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Împărtășește Povestea Ta
          </Button>
        </div>

        {/* Submit Form */}
        {showForm && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Împărtășește Povestea Ta</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Titlu</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Am vândut mașina în 3 zile!"
                  className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Ce ai vândut?</label>
                  <input
                    type="text"
                    value={form.sold_item}
                    onChange={(e) => setForm({ ...form, sold_item: e.target.value })}
                    placeholder="Ex: BMW 320d"
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Categorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Selectează</option>
                    <option value="auto">Auto</option>
                    <option value="imobiliare">Imobiliare</option>
                    <option value="electronice">Electronice</option>
                    <option value="other">Altele</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Preț de vânzare (€)</label>
                  <input
                    type="number"
                    value={form.sold_price}
                    onChange={(e) => setForm({ ...form, sold_price: e.target.value })}
                    placeholder="Ex: 15000"
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">În câte zile ai vândut?</label>
                  <input
                    type="number"
                    value={form.days_to_sell}
                    onChange={(e) => setForm({ ...form, days_to_sell: e.target.value })}
                    placeholder="Ex: 3"
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-slate-400 text-sm mb-1 block">Povestea ta</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Spune-ne cum a decurs experiența ta..."
                  rows={5}
                  className="w-full p-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting} className="bg-yellow-500 hover:bg-yellow-400 text-black">
                  {submitting ? "Se trimite..." : "Trimite Povestea"}
                  <Send className="w-4 h-4 ml-2" />
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/10">
                  Anulează
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Stories List */}
        {stories.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nu există povești încă. Fii primul care împărtășește!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {stories.map((story) => (
              <div 
                key={story.story_id}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 hover:border-yellow-500/20 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {story.user_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{story.user_name}</span>
                      <span className="text-slate-500 text-sm">•</span>
                      <span className="text-slate-500 text-sm">
                        {new Date(story.created_at).toLocaleDateString("ro-RO")}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{story.title}</h3>
                    
                    {(story.sold_item || story.days_to_sell) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {story.sold_item && (
                          <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                            {story.sold_item}
                          </span>
                        )}
                        {story.sold_price && (
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                            {story.sold_price} €
                          </span>
                        )}
                        {story.days_to_sell && (
                          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {story.days_to_sell} zile
                          </span>
                        )}
                      </div>
                    )}
                    
                    <p className="text-slate-400 mb-4">{story.content}</p>
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(story.story_id)}
                        className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Heart className="w-5 h-5" />
                        <span>{story.likes || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
