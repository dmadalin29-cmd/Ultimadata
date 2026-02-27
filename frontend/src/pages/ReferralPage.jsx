import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Users, Gift, Copy, Share2, TrendingUp, 
  Award, CheckCircle, UserPlus, ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ReferralPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, codeRes, listRes] = await Promise.all([
          axios.get(`${API_URL}/api/auth/me`, { withCredentials: true }),
          axios.get(`${API_URL}/api/referral/code`, { withCredentials: true }),
          axios.get(`${API_URL}/api/referral/list`, { withCredentials: true })
        ]);
        setUser(userRes.data);
        setReferralData(codeRes.data);
        setReferrals(listRes.data.referrals || []);
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

  // Copy referral link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralData.referral_link);
      setCopied(true);
      toast.success("Link copiat în clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Nu am putut copia link-ul");
    }
  };

  // Share referral
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Alătură-te X67 Digital Media!",
          text: `Folosește codul meu de referral și primește beneficii! Cod: ${referralData.referral_code}`,
          url: referralData.referral_link
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
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

  if (!referralData) return null;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="referral-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20 rounded-2xl p-8 mb-8 text-center">
          <div className="w-20 h-20 bg-purple-500/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Users className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Program Referral</h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Invită-ți prietenii să folosească X67 Digital Media și câștigă puncte de loialitate pentru fiecare utilizator nou!
          </p>
        </div>

        {/* Referral Code Card */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 mb-8">
          <h2 className="text-white font-bold text-lg mb-4">Codul tău de referral</h2>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-4 py-3 font-mono text-xl text-purple-400 tracking-wider">
              {referralData.referral_code}
            </div>
            <Button 
              onClick={handleCopyLink}
              variant="outline" 
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>

          {/* Referral Link */}
          <div className="mb-6">
            <label className="text-slate-400 text-sm mb-2 block">Link-ul tău de referral:</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={referralData.referral_link} 
                readOnly
                className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-4 py-2 text-slate-300 text-sm"
              />
              <Button 
                onClick={handleShare}
                className="bg-purple-600 hover:bg-purple-500"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#121212] rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <UserPlus className="w-5 h-5 text-green-400" />
                <span className="text-slate-400 text-sm">Utilizatori invitați</span>
              </div>
              <p className="text-3xl font-bold text-white">{referralData.total_referrals}</p>
            </div>
            <div className="bg-[#121212] rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <span className="text-slate-400 text-sm">Puncte câștigate</span>
              </div>
              <p className="text-3xl font-bold text-white">{referralData.points_earned}</p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6 mb-8">
          <h2 className="text-white font-bold text-lg mb-4">Beneficiile tale</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border border-green-500/20">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Gift className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">+100 puncte per înregistrare</h3>
                <p className="text-slate-400 text-sm">Primești 100 de puncte de loialitate pentru fiecare utilizator nou care se înregistrează cu codul tău.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg border border-blue-500/20">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">+50 puncte per anunț</h3>
                <p className="text-slate-400 text-sm">Când utilizatorul invitat postează primul anunț, primești încă 50 de puncte bonus.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-500/10 to-transparent rounded-lg border border-purple-500/20">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">TopUp mai rapid</h3>
                <p className="text-slate-400 text-sm">Utilizatorii cu referrals au acces la TopUp la fiecare 40 minute în loc de 60!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Utilizatori invitați</h2>
            <span className="text-slate-400 text-sm">{referrals.length} total</span>
          </div>
          
          {referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-2">Nu ai invitat încă pe nimeni</p>
              <p className="text-slate-500 text-sm">Distribuie link-ul tău de referral pentru a câștiga puncte!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div 
                  key={referral.user_id} 
                  className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    {referral.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{referral.name || "Utilizator"}</p>
                    <p className="text-slate-500 text-xs">
                      S-a înregistrat pe {new Date(referral.created_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                  <div className="text-green-400 text-sm font-medium">
                    +100 pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA to Loyalty */}
        <div className="mt-8 text-center">
          <Link to="/loyalty">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              Vezi punctele tale de loialitate
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
