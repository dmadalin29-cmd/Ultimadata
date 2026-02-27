import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Award, Star, Gift, TrendingUp, Clock, Zap,
  ChevronRight, Trophy, Crown, Medal, Shield
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Level icons
const LEVEL_ICONS = {
  1: Medal,
  2: Shield,
  3: Award,
  4: Crown
};

export default function LoyaltyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, loyaltyRes, leaderRes] = await Promise.all([
          axios.get(`${API_URL}/api/auth/me`, { withCredentials: true }),
          axios.get(`${API_URL}/api/loyalty/status`, { withCredentials: true }),
          axios.get(`${API_URL}/api/loyalty/leaderboard`)
        ]);
        setUser(userRes.data);
        setLoyaltyData(loyaltyRes.data);
        setLeaderboard(leaderRes.data.leaderboard);
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

  // Claim daily points
  const handleClaimDaily = async () => {
    setClaiming(true);
    try {
      const response = await axios.post(`${API_URL}/api/loyalty/claim-daily`, {}, { withCredentials: true });
      toast.success(`+${response.data.points_earned} puncte! Total: ${response.data.new_total}`);
      // Refresh data
      const loyaltyRes = await axios.get(`${API_URL}/api/loyalty/status`, { withCredentials: true });
      setLoyaltyData(loyaltyRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la revendicare");
    } finally {
      setClaiming(false);
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

  if (!loyaltyData) return null;

  const { points, level, next_level, points_to_next, recent_transactions, all_levels } = loyaltyData;
  const progressPercent = next_level 
    ? ((points - level.min_points) / (next_level.min_points - level.min_points)) * 100 
    : 100;

  const LevelIcon = LEVEL_ICONS[level.level] || Medal;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="loyalty-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Current Level Card */}
        <div className="bg-gradient-to-br from-[#0A0A0A] to-[#121212] border border-white/5 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${level.color}20` }}
              >
                <LevelIcon className="w-8 h-8" style={{ color: level.color }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{level.name}</h1>
                <p className="text-slate-400">Nivel {level.level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{points.toLocaleString()}</p>
              <p className="text-slate-400">puncte</p>
            </div>
          </div>
          
          {/* Progress to Next Level */}
          {next_level && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-400">Progres spre {next_level.name}</span>
                <span className="text-white">{points_to_next} puncte rămase</span>
              </div>
              <Progress value={progressPercent} className="h-3 bg-[#1A1A1A]" />
            </div>
          )}
          
          {/* Current Benefits */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <h3 className="text-white font-medium mb-3">Beneficiile tale</h3>
            <div className="flex flex-wrap gap-2">
              {level.benefits.map((benefit, idx) => (
                <span key={idx} className="px-3 py-1 bg-white/5 rounded-full text-sm text-slate-300">
                  ✓ {benefit}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Bonus */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Gift className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Bonus Zilnic</h3>
                <p className="text-slate-400">Revendică +2 puncte în fiecare zi!</p>
              </div>
            </div>
            <Button 
              onClick={handleClaimDaily}
              disabled={claiming}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              {claiming ? "Se revendică..." : "Revendică"}
            </Button>
          </div>
        </div>

        {/* All Levels */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Niveluri</h2>
          <div className="space-y-4">
            {all_levels.map((lvl) => {
              const Icon = LEVEL_ICONS[lvl.level] || Medal;
              const isCurrentOrPast = points >= lvl.min_points;
              const isCurrent = lvl.level === level.level;
              
              return (
                <div 
                  key={lvl.level}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${
                    isCurrent 
                      ? 'border-blue-500/50 bg-blue-500/10' 
                      : isCurrentOrPast 
                        ? 'border-white/10 bg-white/5' 
                        : 'border-white/5 opacity-50'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${lvl.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: lvl.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">{lvl.name}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">Actual</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{lvl.min_points.toLocaleString()} puncte</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">{lvl.benefits.length} beneficii</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Cum câștigi puncte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { action: "Postează un anunț", points: 10, icon: "📝" },
              { action: "Vinde un produs", points: 50, icon: "💰" },
              { action: "Lasă o recenzie", points: 5, icon: "⭐" },
              { action: "Primești recenzie 5 stele", points: 20, icon: "🌟" },
              { action: "Referral (înregistrare)", points: 100, icon: "👥" },
              { action: "Primul anunț", points: 50, icon: "🎉" },
              { action: "Verificare identitate", points: 100, icon: "✅" },
              { action: "Login zilnic", points: 2, icon: "📅" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{item.action}</p>
                </div>
                <span className="text-green-400 font-bold">+{item.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        {recent_transactions && recent_transactions.length > 0 && (
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Activitate Recentă</h2>
            <div className="space-y-3">
              {recent_transactions.slice(0, 10).map((tx) => (
                <div key={tx.transaction_id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white">{tx.description}</p>
                    <p className="text-slate-500 text-xs">
                      {new Date(tx.created_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                  <span className="text-green-400 font-bold">+{tx.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Top Utilizatori
            </h2>
            <div className="space-y-3">
              {leaderboard.slice(0, 10).map((u, idx) => (
                <div 
                  key={u.user_id} 
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    u.user_id === user?.user_id ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-white/5'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-500 text-black' :
                    idx === 1 ? 'bg-slate-300 text-black' :
                    idx === 2 ? 'bg-orange-400 text-black' :
                    'bg-white/10 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{u.name}</p>
                    <p className="text-slate-400 text-sm">{u.loyalty_level_name || "Bronze"}</p>
                  </div>
                  <span className="text-white font-bold">{u.loyalty_points?.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
