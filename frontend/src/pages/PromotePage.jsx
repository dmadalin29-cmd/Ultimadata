import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Zap, Crown, TrendingUp, Star, Check, 
  ArrowRight, Shield, Award, Rocket
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PromotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const adId = searchParams.get("ad_id");
  
  const [user, setUser] = useState(null);
  const [ad, setAd] = useState(null);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    fetchData();
  }, [adId]);

  const fetchData = async () => {
    try {
      const [userRes, premiumRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/me`, { withCredentials: true }),
        axios.get(`${API_URL}/api/premium/status`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setPremiumStatus(premiumRes.data);
      
      if (adId) {
        const adRes = await axios.get(`${API_URL}/api/ads/${adId}`);
        setAd(adRes.data);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePromotion = async (type) => {
    if (!adId) {
      toast.error("Selectează un anunț pentru a-l promova");
      return;
    }
    
    setPurchasing(type);
    try {
      const response = await axios.post(
        `${API_URL}/api/promotions/purchase`,
        { ad_id: adId, promotion_type: type },
        { withCredentials: true }
      );
      
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la procesarea plății");
      setPurchasing(null);
    }
  };

  const handlePurchasePremium = async () => {
    setPurchasing("premium");
    try {
      const response = await axios.post(
        `${API_URL}/api/premium/subscribe`,
        {},
        { withCredentials: true }
      );
      
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la procesarea plății");
      setPurchasing(null);
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
    <div className="min-h-screen bg-[#050505]" data-testid="promote-page">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Crește-ți Vizibilitatea
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Promovează-ți anunțurile pentru a ajunge la mai mulți cumpărători și vinde mai rapid
          </p>
        </div>

        {/* Selected Ad */}
        {ad && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 mb-8">
            <p className="text-slate-400 text-sm mb-2">Anunț selectat pentru promovare:</p>
            <div className="flex items-center gap-4">
              {ad.images?.[0] && (
                <img src={ad.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
              <div>
                <h3 className="text-white font-medium">{ad.title}</h3>
                <p className="text-blue-400">{ad.price} €</p>
              </div>
            </div>
          </div>
        )}

        {/* Promotion Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* TOP Category */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#0F0F0F] border border-yellow-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">TOP în Categorie</h3>
                  <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full">Popular</span>
                </div>
              </div>
              
              <p className="text-slate-400 mb-6">
                Anunțul tău apare primul în categoria sa timp de 7 zile
              </p>
              
              <ul className="space-y-3 mb-6">
                {["Poziție #1 în categorie", "Badge TOP vizibil", "7 zile de expunere", "3x mai multe vizualizări"].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-yellow-400" />
                    {benefit}
                  </li>
                ))}
              </ul>
              
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold text-white">15</span>
                  <span className="text-slate-400 ml-1">RON / săptămână</span>
                </div>
                <Button 
                  onClick={() => handlePurchasePromotion("top_category")}
                  disabled={!adId || purchasing === "top_category"}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                >
                  {purchasing === "top_category" ? "Se procesează..." : "Activează"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Homepage Featured */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#0F0F0F] border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Star className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Featured Homepage</h3>
                  <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">Recomandat</span>
                </div>
              </div>
              
              <p className="text-slate-400 mb-6">
                Anunțul tău apare pe pagina principală timp de 7 zile
              </p>
              
              <ul className="space-y-3 mb-6">
                {["Vizibil pe homepage", "Badge PROMOVAT", "7 zile de expunere", "10x mai multe vizualizări"].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-blue-400" />
                    {benefit}
                  </li>
                ))}
              </ul>
              
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold text-white">40</span>
                  <span className="text-slate-400 ml-1">RON / săptămână</span>
                </div>
                <Button 
                  onClick={() => handlePurchasePromotion("homepage")}
                  disabled={!adId || purchasing === "homepage"}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {purchasing === "homepage" ? "Se procesează..." : "Activează"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Subscription */}
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,...')] opacity-5"></div>
          
          <div className="relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Crown className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Vânzător Pro</h2>
                    <p className="text-purple-400">Abonament Premium</p>
                  </div>
                </div>
                
                <p className="text-slate-400 mb-6 max-w-xl">
                  Devino un vânzător profesionist cu acces la toate funcționalitățile premium
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Rocket, text: "Anunțuri nelimitate" },
                    { icon: TrendingUp, text: "Statistici avansate" },
                    { icon: Shield, text: "Suport prioritar" },
                    { icon: Zap, text: "TopUp fără așteptare" },
                    { icon: Award, text: "Badge Verificat" },
                    { icon: Star, text: "Profil evidențiat" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-300">
                      <item.icon className="w-5 h-5 text-purple-400" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-center md:text-right">
                <div className="mb-4">
                  <span className="text-5xl font-bold text-white">99</span>
                  <span className="text-slate-400 ml-2">RON / lună</span>
                </div>
                
                {premiumStatus?.is_premium ? (
                  <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg inline-block">
                    ✓ Abonament activ până la {new Date(premiumStatus.expires_at).toLocaleDateString("ro-RO")}
                  </div>
                ) : (
                  <Button 
                    onClick={handlePurchasePremium}
                    disabled={purchasing === "premium"}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8"
                  >
                    {purchasing === "premium" ? "Se procesează..." : "Activează Pro"}
                    <Crown className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
