import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { 
  BarChart3, 
  Eye, 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  FileText,
  ArrowUp,
  Clock,
  Zap
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [overview, setOverview] = useState(null);
  const [viewsData, setViewsData] = useState(null);
  const [adsPerformance, setAdsPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    try {
      const [overviewRes, viewsRes, performanceRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/overview`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/views?days=30`, { withCredentials: true }),
        axios.get(`${API_URL}/api/analytics/ads-performance`, { withCredentials: true })
      ]);
      
      setOverview(overviewRes.data);
      setViewsData(viewsRes.data);
      setAdsPerformance(performanceRes.data.ads || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>+{trend}%</span>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );

  const maxViews = viewsData?.daily_views ? Math.max(...viewsData.daily_views.map(d => d.views)) : 100;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="dashboard-page">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-fuchsia-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-400">Statistici și performanță anunțuri</p>
            </div>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-500">
            <Link to="/create-ad">
              <FileText className="w-4 h-4 mr-2" />
              Anunț nou
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-[#0A0A0A] rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-[#0A0A0A] rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard 
                icon={FileText} 
                label="Anunțuri active" 
                value={overview?.active_ads || 0}
                color="bg-blue-600"
              />
              <StatCard 
                icon={Eye} 
                label="Vizualizări totale" 
                value={overview?.total_views || 0}
                color="bg-emerald-600"
                trend={12}
              />
              <StatCard 
                icon={Heart} 
                label="Favorite" 
                value={overview?.total_favorites || 0}
                color="bg-red-600"
              />
              <StatCard 
                icon={MessageCircle} 
                label="Mesaje primite" 
                value={overview?.total_messages || 0}
                color="bg-fuchsia-600"
              />
            </div>

            {/* Views Chart */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Vizualizări - Ultimele 30 zile</h2>
                <div className="text-2xl font-bold text-white">
                  {viewsData?.total_views || 0} <span className="text-sm text-slate-400 font-normal">total</span>
                </div>
              </div>
              
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-40">
                {viewsData?.daily_views?.slice(-30).map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-500 hover:to-blue-300 transition-colors cursor-pointer group relative"
                    style={{ height: `${Math.max((day.views / maxViews) * 100, 5)}%` }}
                    title={`${day.date}: ${day.views} vizualizări`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {day.views} vizualizări
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Acum 30 zile</span>
                <span>Astăzi</span>
              </div>
            </div>

            {/* Top Ads */}
            {viewsData?.top_ads && viewsData.top_ads.length > 0 && (
              <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Top anunțuri după vizualizări</h2>
                <div className="space-y-3">
                  {viewsData.top_ads.map((ad, i) => (
                    <Link 
                      key={ad.ad_id}
                      to={`/ad/${ad.ad_id}`}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                        i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-600"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium truncate">{ad.title}</p>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Eye className="w-4 h-4" />
                        <span>{ad.views}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Ads Performance Table */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white">Performanță anunțuri</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-slate-400 text-sm font-medium p-4">Anunț</th>
                      <th className="text-center text-slate-400 text-sm font-medium p-4">Status</th>
                      <th className="text-center text-slate-400 text-sm font-medium p-4">Vizualizări</th>
                      <th className="text-center text-slate-400 text-sm font-medium p-4">Favorite</th>
                      <th className="text-center text-slate-400 text-sm font-medium p-4">Conversații</th>
                      <th className="text-center text-slate-400 text-sm font-medium p-4">Ultimul TopUp</th>
                      <th className="text-right text-slate-400 text-sm font-medium p-4">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adsPerformance.length > 0 ? (
                      adsPerformance.map((ad) => (
                        <tr key={ad.ad_id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4">
                            <Link to={`/ad/${ad.ad_id}`} className="text-white font-medium hover:text-blue-400">
                              {ad.title}
                            </Link>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              ad.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                              ad.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                              "bg-red-500/10 text-red-400"
                            }`}>
                              {ad.status === "active" ? "Activ" : ad.status === "pending" ? "Așteptare" : "Respins"}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1 text-white">
                              <Eye className="w-4 h-4 text-slate-400" />
                              {ad.views}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1 text-white">
                              <Heart className="w-4 h-4 text-red-400" />
                              {ad.favorites}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1 text-white">
                              <MessageCircle className="w-4 h-4 text-blue-400" />
                              {ad.conversations}
                            </div>
                          </td>
                          <td className="p-4 text-center text-slate-400 text-sm">
                            {ad.last_topup ? (
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(ad.last_topup).toLocaleDateString("ro-RO")}
                              </div>
                            ) : "-"}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/10 text-white hover:bg-white/5"
                              asChild
                            >
                              <Link to={`/ad/${ad.ad_id}`}>
                                <ArrowUp className="w-3 h-3 mr-1" />
                                TopUp
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Nu ai anunțuri încă. <Link to="/create-ad" className="text-blue-400 hover:underline">Creează primul anunț</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
