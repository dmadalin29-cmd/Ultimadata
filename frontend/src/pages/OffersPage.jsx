import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  DollarSign, Send, Check, X, ArrowLeftRight, 
  Clock, CheckCircle, XCircle, MessageCircle,
  TrendingDown, Package
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function OffersPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sentOffers, setSentOffers] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("received");
  
  // Counter offer dialog
  const [counterDialog, setCounterDialog] = useState({ open: false, offer: null });
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        setUser(response.data);
      } catch (error) {
        navigate("/auth");
      }
    };
    fetchUser();
  }, [navigate]);

  // Fetch offers
  useEffect(() => {
    const fetchOffers = async () => {
      if (!user) return;
      try {
        const [sentRes, receivedRes] = await Promise.all([
          axios.get(`${API_URL}/api/offers/sent`, { withCredentials: true }),
          axios.get(`${API_URL}/api/offers/received`, { withCredentials: true })
        ]);
        setSentOffers(sentRes.data.offers);
        setReceivedOffers(receivedRes.data.offers);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [user]);

  // Accept offer
  const handleAccept = async (offerId) => {
    try {
      await axios.post(`${API_URL}/api/offers/${offerId}/accept`, {}, { withCredentials: true });
      toast.success("Ofertă acceptată!");
      // Update local state
      setReceivedOffers(prev => prev.map(o => 
        o.offer_id === offerId ? { ...o, status: "accepted" } : o
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la acceptare");
    }
  };

  // Reject offer
  const handleReject = async (offerId) => {
    try {
      await axios.post(`${API_URL}/api/offers/${offerId}/reject`, {}, { withCredentials: true });
      toast.success("Ofertă respinsă");
      setReceivedOffers(prev => prev.map(o => 
        o.offer_id === offerId ? { ...o, status: "rejected" } : o
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la respingere");
    }
  };

  // Counter offer
  const handleCounter = async () => {
    if (!counterPrice || parseFloat(counterPrice) <= 0) {
      toast.error("Introdu un preț valid");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/offers/${counterDialog.offer.offer_id}/counter`,
        { counter_price: parseFloat(counterPrice), message: counterMessage },
        { withCredentials: true }
      );
      toast.success("Contra-ofertă trimisă!");
      setReceivedOffers(prev => prev.map(o => 
        o.offer_id === counterDialog.offer.offer_id 
          ? { ...o, status: "countered", counter_price: parseFloat(counterPrice) } 
          : o
      ));
      setCounterDialog({ open: false, offer: null });
      setCounterPrice("");
      setCounterMessage("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la trimitere");
    } finally {
      setSubmitting(false);
    }
  };

  // Accept counter offer (buyer side)
  const handleAcceptCounter = async (offerId) => {
    try {
      await axios.post(`${API_URL}/api/offers/${offerId}/accept-counter`, {}, { withCredentials: true });
      toast.success("Contra-ofertă acceptată!");
      setSentOffers(prev => prev.map(o => 
        o.offer_id === offerId ? { ...o, status: "accepted" } : o
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la acceptare");
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, label: "În așteptare", color: "text-yellow-400 bg-yellow-500/20" },
      accepted: { icon: CheckCircle, label: "Acceptată", color: "text-green-400 bg-green-500/20" },
      rejected: { icon: XCircle, label: "Respinsă", color: "text-red-400 bg-red-500/20" },
      countered: { icon: ArrowLeftRight, label: "Contra-ofertă", color: "text-blue-400 bg-blue-500/20" },
      expired: { icon: Clock, label: "Expirată", color: "text-slate-400 bg-slate-500/20" }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
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
    <div className="min-h-screen bg-[#050505]" data-testid="offers-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            Oferte de Preț
          </h1>
          <p className="text-slate-400">
            Gestionează ofertele trimise și primite
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#0A0A0A] border border-white/5 mb-6">
            <TabsTrigger value="received" className="data-[state=active]:bg-blue-600">
              Primite ({receivedOffers.filter(o => o.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="data-[state=active]:bg-blue-600">
              Trimise ({sentOffers.length})
            </TabsTrigger>
          </TabsList>

          {/* Received Offers */}
          <TabsContent value="received">
            {receivedOffers.length === 0 ? (
              <div className="text-center py-12 bg-[#0A0A0A] border border-white/5 rounded-xl">
                <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nu ai primit nicio ofertă</p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedOffers.map((offer) => (
                  <div 
                    key={offer.offer_id}
                    className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link to={`/ad/${offer.ad_id}`} className="text-white font-medium hover:text-blue-400">
                          {offer.ad_title}
                        </Link>
                        <p className="text-sm text-slate-400 mt-1">
                          De la: {offer.buyer_name} • {formatDistanceToNow(new Date(offer.created_at), { locale: ro, addSuffix: true })}
                        </p>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Prețul tău</p>
                        <p className="text-white font-bold">{offer.ad_price?.toLocaleString()} RON</p>
                      </div>
                      <TrendingDown className="w-6 h-6 text-slate-500" />
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Oferta</p>
                        <p className="text-green-400 font-bold">{offer.offered_price?.toLocaleString()} RON</p>
                      </div>
                      {offer.counter_price && (
                        <>
                          <ArrowLeftRight className="w-6 h-6 text-blue-400" />
                          <div className="flex-1">
                            <p className="text-slate-400 text-sm">Contra-oferta ta</p>
                            <p className="text-blue-400 font-bold">{offer.counter_price?.toLocaleString()} RON</p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {offer.message && (
                      <p className="text-slate-300 text-sm bg-[#121212] rounded-lg p-3 mb-3">
                        "{offer.message}"
                      </p>
                    )}
                    
                    {offer.status === "pending" && (
                      <div className="flex gap-2 mt-4">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-500"
                          onClick={() => handleAccept(offer.offer_id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Acceptă
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 border-blue-500 text-blue-400 hover:bg-blue-500/10"
                          onClick={() => setCounterDialog({ open: true, offer })}
                        >
                          <ArrowLeftRight className="w-4 h-4 mr-2" />
                          Contra-ofertă
                        </Button>
                        <Button 
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleReject(offer.offer_id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {offer.status === "accepted" && (
                      <Link to={`/messages?ad=${offer.ad_id}&to=${offer.buyer_id}`}>
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 mt-4">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contactează Cumpărătorul
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sent Offers */}
          <TabsContent value="sent">
            {sentOffers.length === 0 ? (
              <div className="text-center py-12 bg-[#0A0A0A] border border-white/5 rounded-xl">
                <Send className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nu ai trimis nicio ofertă</p>
                <Link to="/">
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-500">
                    Explorează Anunțuri
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sentOffers.map((offer) => (
                  <div 
                    key={offer.offer_id}
                    className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link to={`/ad/${offer.ad_id}`} className="text-white font-medium hover:text-blue-400">
                          {offer.ad_title}
                        </Link>
                        <p className="text-sm text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(offer.created_at), { locale: ro, addSuffix: true })}
                        </p>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Preț original</p>
                        <p className="text-white font-bold">{offer.ad_price?.toLocaleString()} RON</p>
                      </div>
                      <TrendingDown className="w-6 h-6 text-slate-500" />
                      <div className="flex-1">
                        <p className="text-slate-400 text-sm">Oferta ta</p>
                        <p className="text-green-400 font-bold">{offer.offered_price?.toLocaleString()} RON</p>
                      </div>
                      {offer.counter_price && (
                        <>
                          <ArrowLeftRight className="w-6 h-6 text-blue-400" />
                          <div className="flex-1">
                            <p className="text-slate-400 text-sm">Contra-ofertă</p>
                            <p className="text-blue-400 font-bold">{offer.counter_price?.toLocaleString()} RON</p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {offer.status === "countered" && (
                      <div className="flex gap-2 mt-4">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-500"
                          onClick={() => handleAcceptCounter(offer.offer_id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Acceptă {offer.counter_price?.toLocaleString()} RON
                        </Button>
                        <Link to={`/messages?ad=${offer.ad_id}&to=${offer.seller_id}`} className="flex-1">
                          <Button variant="outline" className="w-full border-white/10">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Negociază
                          </Button>
                        </Link>
                      </div>
                    )}
                    
                    {offer.status === "accepted" && (
                      <Link to={`/messages?ad=${offer.ad_id}&to=${offer.seller_id}`}>
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 mt-4">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contactează Vânzătorul
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Counter Offer Dialog */}
      <Dialog open={counterDialog.open} onOpenChange={(open) => !open && setCounterDialog({ open: false, offer: null })}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Fă o Contra-Ofertă</DialogTitle>
            <DialogDescription className="text-slate-400">
              Propune un preț diferit pentru {counterDialog.offer?.ad_title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Prețul tău:</span>
              <span className="text-white font-bold">{counterDialog.offer?.ad_price?.toLocaleString()} RON</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Oferta primită:</span>
              <span className="text-green-400 font-bold">{counterDialog.offer?.offered_price?.toLocaleString()} RON</span>
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Prețul tău contra-ofertă *</label>
              <Input
                type="number"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder="Introdu prețul"
                className="bg-[#121212] border-white/10 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Mesaj (opțional)</label>
              <Textarea
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                placeholder="Explică de ce acest preț..."
                className="bg-[#121212] border-white/10 text-white"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCounterDialog({ open: false, offer: null })}>
              Anulează
            </Button>
            <Button 
              onClick={handleCounter}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {submitting ? "Se trimite..." : "Trimite Contra-Ofertă"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
