import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdCard from "../components/AdCard";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Edit,
  Plus,
  Settings,
  LogOut,
  Eye,
  Clock,
  Check,
  X,
  AlertCircle
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [myAds, setMyAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalViews: 0 });

  useEffect(() => {
    fetchMyAds();
  }, []);

  const fetchMyAds = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/my-ads`, {
        withCredentials: true
      });
      const ads = response.data.ads || [];
      setMyAds(ads);
      const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
      setStats({
        total: ads.length,
        active: ads.filter(a => a.status === "active").length,
        pending: ads.filter(a => a.status === "pending").length,
        totalViews
      });
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAd = async (adId) => {
    if (!window.confirm("Ești sigur că vrei să ștergi acest anunț?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/ads/${adId}`, {
        withCredentials: true
      });
      toast.success("Anunț șters cu succes");
      fetchMyAds();
    } catch (error) {
      toast.error("Eroare la ștergerea anunțului");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
            <Check className="w-3 h-3" />
            Activ
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs">
            <Clock className="w-3 h-3" />
            În așteptare
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs">
            <X className="w-3 h-3" />
            Respins
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="profile-page">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-6 sticky top-24">
              {/* User Info */}
              <div className="text-center mb-6">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt="" 
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-blue-500" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                <p className="text-slate-400 text-sm">{user?.email}</p>
                {user?.role === "admin" && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                    Administrator
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-6 p-4 rounded-xl bg-[#121212]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-slate-500">Anunțuri</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.totalViews}</p>
                  <p className="text-xs text-slate-500">Vizualizări</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
                  <p className="text-xs text-slate-500">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                  <p className="text-xs text-slate-500">Așteptare</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Link to="/create-ad">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white" data-testid="create-ad-profile-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Anunț nou
                  </Button>
                </Link>
                {user?.role === "admin" && (
                  <Link to="/admin">
                    <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  className="w-full border-white/10 text-red-400 hover:bg-red-500/10"
                  onClick={handleLogout}
                  data-testid="logout-profile-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Deconectare
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-[#0A0A0A] border border-white/5 p-1 mb-6">
                <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
                  Toate ({stats.total})
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-blue-600">
                  Active ({stats.active})
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600">
                  În așteptare ({stats.pending})
                </TabsTrigger>
              </TabsList>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-[#0A0A0A] aspect-[4/3] animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <TabsContent value="all">
                    {myAds.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {myAds.map((ad) => (
                          <div key={ad.ad_id} className="relative">
                            <AdCard ad={ad} />
                            <div className="absolute top-3 left-3 z-10">
                              {getStatusBadge(ad.status)}
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteAd(ad.ad_id);
                              }}
                              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                              data-testid={`delete-ad-${ad.ad_id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-2xl bg-[#0A0A0A] border border-white/5">
                        <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400 mb-4">Nu ai niciun anunț încă</p>
                        <Link to="/create-ad">
                          <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Creează primul anunț
                          </Button>
                        </Link>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="active">
                    {myAds.filter(a => a.status === "active").length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {myAds.filter(a => a.status === "active").map((ad) => (
                          <div key={ad.ad_id} className="relative">
                            <AdCard ad={ad} />
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteAd(ad.ad_id);
                              }}
                              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-2xl bg-[#0A0A0A] border border-white/5">
                        <p className="text-slate-400">Nu ai anunțuri active</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pending">
                    {myAds.filter(a => a.status === "pending").length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {myAds.filter(a => a.status === "pending").map((ad) => (
                          <div key={ad.ad_id} className="relative">
                            <AdCard ad={ad} />
                            <div className="absolute top-3 left-3 z-10">
                              {getStatusBadge(ad.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-2xl bg-[#0A0A0A] border border-white/5">
                        <p className="text-slate-400">Nu ai anunțuri în așteptare</p>
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
