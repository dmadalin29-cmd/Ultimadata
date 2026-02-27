import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  BarChart3, Eye, Heart, MessageCircle, Star, 
  TrendingUp, Package, DollarSign, Award, ArrowRight,
  Bell, Clock, Zap, Users, ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdCard from "../components/AdCard";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user and dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, dashRes] = await Promise.all([
          axios.get(`${API_URL}/api/auth/me`, { withCredentials: true }),
          axios.get(`${API_URL}/api/seller/dashboard`, { withCredentials: true })
        ]);
        setUser(userRes.data);
        setDashboard(dashRes.data);
      } catch (error) {
        if (error.response?.status === 401) {
          navigate("/auth");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

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

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-slate-400">Nu am putut încărca datele</p>
        </div>
      </div>
    );
  }

  const { summary, recent_activity, top_ads, loyalty, badges } = dashboard;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="seller-dashboard">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Dashboard Vânzător</h1>
            <p className="text-slate-400">Bine ai venit, {user?.name}!</p>
          </div>
          <Link to="/create-ad">
            <Button className="bg-blue-600 hover:bg-blue-500">
              <Package className="w-4 h-4 mr-2" />
              Adaugă Anunț
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-slate-400 text-sm">Anunțuri Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{summary.active_ads}</p>
            <p className="text-xs text-slate-500">din {summary.total_ads} total</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Eye className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-slate-400 text-sm">Vizualizări</span>
            </div>
            <p className="text-2xl font-bold text-white">{summary.total_views.toLocaleString()}</p>
            <p className="text-xs text-green-400">+{recent_activity.views_this_week} săptămâna asta</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Heart className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-slate-400 text-sm">Favorite</span>
            </div>
            <p className="text-2xl font-bold text-white">{summary.total_favorites}</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <MessageCircle className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-slate-400 text-sm">Conversații</span>
            </div>
            <p className="text-2xl font-bold text-white">{summary.total_conversations}</p>
            {summary.unread_messages > 0 && (
              <p className="text-xs text-purple-400">{summary.unread_messages} necitite</p>
            )}
          </div>
        </div>

        {/* Second Row - Offers & Rating */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Oferte de Preț</h3>
              <Link to="/offers" className="text-blue-400 text-sm hover:underline">Vezi toate</Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{summary.pending_offers}</p>
                <p className="text-xs text-slate-400">În așteptare</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{summary.accepted_offers}</p>
                <p className="text-xs text-slate-400">Acceptate</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Rating</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= Math.round(summary.avg_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                  />
                ))}
              </div>
              <span className="text-white font-bold">{summary.avg_rating.toFixed(1)}</span>
              <span className="text-slate-400 text-sm">({summary.total_reviews} recenzii)</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">Nivel Fidelitate</h3>
              <Link to="/loyalty" className="text-blue-400 text-sm hover:underline">Detalii</Link>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8" style={{ color: loyalty.level.color }} />
              <div>
                <p className="text-white font-bold">{loyalty.level.name}</p>
                <p className="text-sm text-slate-400">{loyalty.points.toLocaleString()} puncte</p>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 mb-8">
            <h3 className="text-white font-medium mb-4">Badge-urile Tale</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span 
                  key={badge}
                  className="px-3 py-1 bg-white/5 rounded-full text-sm text-slate-300"
                >
                  {badge.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Performing Ads */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Top Anunțuri</h2>
            <Link to="/dashboard" className="text-blue-400 text-sm hover:underline flex items-center gap-1">
              Vezi toate <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {top_ads.length === 0 ? (
            <div className="text-center py-12 bg-[#0A0A0A] border border-white/5 rounded-xl">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nu ai niciun anunț activ</p>
              <Link to="/create-ad">
                <Button className="mt-4 bg-blue-600 hover:bg-blue-500">
                  Creează primul anunț
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {top_ads.map((ad) => (
                <AdCard key={ad.ad_id} ad={ad} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/messages" className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 hover:border-blue-500/50 transition-colors">
            <MessageCircle className="w-8 h-8 text-blue-400 mb-2" />
            <h3 className="text-white font-medium">Mesaje</h3>
            <p className="text-slate-400 text-sm">Vezi conversațiile</p>
          </Link>
          
          <Link to="/saved-searches" className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 hover:border-green-500/50 transition-colors">
            <Bell className="w-8 h-8 text-green-400 mb-2" />
            <h3 className="text-white font-medium">Alerte</h3>
            <p className="text-slate-400 text-sm">Căutări salvate</p>
          </Link>
          
          <Link to="/referral" className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 hover:border-purple-500/50 transition-colors">
            <Users className="w-8 h-8 text-purple-400 mb-2" />
            <h3 className="text-white font-medium">Referral</h3>
            <p className="text-slate-400 text-sm">Invită prieteni</p>
          </Link>
          
          <Link to="/verification" className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 hover:border-yellow-500/50 transition-colors">
            <Award className="w-8 h-8 text-yellow-400 mb-2" />
            <h3 className="text-white font-medium">Verificare</h3>
            <p className="text-slate-400 text-sm">Obține badge-ul</p>
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
