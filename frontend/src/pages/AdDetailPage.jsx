import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEOHead from "../components/SEOHead";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { RatingBadge } from "../components/StarRating";
import { toast } from "sonner";
import {
  MapPin,
  Eye,
  Clock,
  Phone,
  Mail,
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Zap,
  Star,
  User,
  Flag,
  ArrowUp,
  Timer,
  Copy,
  MessageCircle,
  X,
  ZoomIn,
  Scale,
  DollarSign
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Image Lightbox component
function ImageLightbox({ images, currentIndex, onClose, onNext, onPrev }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, onNext, onPrev]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button 
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Previous button */}
      {images.length > 1 && (
        <button 
          className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      
      {/* Image */}
      <img 
        src={images[currentIndex]} 
        alt={`Imagine ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Next button */}
      {images.length > 1 && (
        <button 
          className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
      
      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

export default function AdDetailPage() {
  const { adId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  
  // Compare & Offer states
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerCurrency, setOfferCurrency] = useState("EUR");
  const [offerMessage, setOfferMessage] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  
  // Report states
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReasons, setReportReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    fetchAd();
    if (user) {
      fetchReferralCode();
    }
  }, [adId, user]);

  const fetchAd = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ads/${adId}`);
      setAd(response.data);
    } catch (error) {
      console.error("Error fetching ad:", error);
      toast.error("Anunțul nu a fost găsit");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralCode = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/referral-code`, {
        withCredentials: true
      });
      setReferralCode(response.data.referral_code);
      setReferralCount(response.data.referral_count || 0);
    } catch (error) {
      console.error("Error fetching referral code:", error);
    }
  };

  const fetchReportReasons = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/report/reasons`);
      setReportReasons(response.data.reasons);
    } catch (error) {
      console.error("Error fetching report reasons:", error);
    }
  };

  const handleOpenReport = () => {
    if (reportReasons.length === 0) {
      fetchReportReasons();
    }
    setShowReportDialog(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReason) {
      toast.error("Selectează un motiv pentru raportare");
      return;
    }
    
    setSubmittingReport(true);
    try {
      await axios.post(
        `${API_URL}/api/ads/${adId}/report`,
        { 
          reason: selectedReason, 
          description: reportDescription 
        },
        { withCredentials: true }
      );
      toast.success("Mulțumim! Raportul tău a fost trimis și va fi analizat.");
      setShowReportDialog(false);
      setSelectedReason("");
      setReportDescription("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la trimiterea raportului");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleTopup = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setTopupLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/ads/${adId}/topup`,
        {},
        { withCredentials: true }
      );
      toast.success("TopUp reușit! Anunțul tău este acum primul în categorie.");
      fetchAd();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la TopUp");
    } finally {
      setTopupLoading(false);
    }
  };

  const handleAutoTopupToggle = async (enabled) => {
    try {
      await axios.post(
        `${API_URL}/api/ads/${adId}/auto-topup`,
        { enabled },
        { withCredentials: true }
      );
      toast.success(`Auto-TopUp ${enabled ? "activat" : "dezactivat"}`);
      fetchAd();
    } catch (error) {
      toast.error("Eroare la actualizare");
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de referral copiat! Distribuie-l pentru TopUp mai rapid.");
  };

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (user && ad) {
      checkFavorite();
    }
  }, [user, ad]);

  const checkFavorite = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites/check/${adId}`, {
        withCredentials: true
      });
      setIsFavorite(response.data.is_favorite);
    } catch (error) {
      console.error("Error checking favorite:", error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      if (isFavorite) {
        await axios.delete(`${API_URL}/api/favorites/${adId}`, { withCredentials: true });
        toast.success("Eliminat din favorite");
      } else {
        await axios.post(`${API_URL}/api/favorites/${adId}`, {}, { withCredentials: true });
        toast.success("Adăugat la favorite");
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      toast.error("Eroare la actualizare");
    }
  };

  const startConversation = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (ad.user_id === user.user_id) {
      toast.error("Nu poți trimite mesaj la propriul anunț");
      return;
    }
    navigate(`/messages?ad=${adId}&to=${ad.user_id}`);
  };

  // Add to comparison
  const handleAddToCompare = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/compare/add`,
        { ad_id: adId },
        { withCredentials: true }
      );
      toast.success(`Adăugat la comparație (${response.data.count}/4)`);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("Eroare la adăugare");
      }
    }
  };

  // Submit offer
  const handleSubmitOffer = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const price = parseFloat(offerPrice);
    if (!price || price <= 0) {
      toast.error("Introdu un preț valid");
      return;
    }
    
    setSubmittingOffer(true);
    try {
      await axios.post(
        `${API_URL}/api/offers`,
        {
          ad_id: adId,
          offered_price: price,
          message: offerMessage || null
        },
        { withCredentials: true }
      );
      toast.success("Oferta a fost trimisă!");
      setShowOfferDialog(false);
      setOfferPrice("");
      setOfferMessage("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la trimiterea ofertei");
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handlePaidTopup = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setTopupLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/ads/${adId}/topup-paid`,
        {},
        { withCredentials: true }
      );
      // Redirect to Viva Wallet checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la procesarea plății");
      setTopupLoading(false);
    }
  };

  const handleBoost = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/api/payments/create-order`,
        {
          ad_id: adId,
          payment_type: "boost",
          customer_email: user.email,
          customer_name: user.name
        },
        { withCredentials: true }
      );
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error("Eroare la procesarea plății");
    }
  };

  const handlePromote = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/api/payments/create-order`,
        {
          ad_id: adId,
          payment_type: "promote",
          customer_email: user.email,
          customer_name: user.name
        },
        { withCredentials: true }
      );
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error("Eroare la procesarea plății");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiat în clipboard!");
  };

  const formatPrice = () => {
    if (!ad) return "";
    if (ad.price_type === "free") return "Gratuit";
    if (ad.price_type === "negotiable") return ad.price ? `${ad.price.toLocaleString("ro-RO")} € (neg.)` : "Negociabil";
    return ad.price ? `${ad.price.toLocaleString("ro-RO")} €` : "Preț la cerere";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="aspect-video rounded-2xl bg-[#0A0A0A] mb-8" />
            <div className="h-8 bg-[#0A0A0A] rounded w-3/4 mb-4" />
            <div className="h-6 bg-[#0A0A0A] rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!ad) return null;

  const images = ad.images?.length > 0 ? ad.images : [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop"
  ];

  const timeAgo = ad.created_at 
    ? formatDistanceToNow(new Date(ad.created_at), { addSuffix: true, locale: ro })
    : "";

  const isOwner = user && user.user_id === ad.user_id;

  // Generate SEO data for ad
  const adSeoTitle = ad ? `${ad.title} - ${ad.price ? ad.price + ' €' : 'Preț negociabil'} | X67` : 'Anunț | X67 Digital';
  const adSeoDescription = ad ? `${ad.description?.slice(0, 150)}... ${ad.city_name || ''} - ${ad.category_name || ''}` : 'Anunț pe X67 Digital Media';
  const adSeoImage = ad?.images?.[0] || 'https://x67digital.com/og-image.png';

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="ad-detail-page">
      {/* Image Lightbox */}
      {showLightbox && images.length > 0 && (
        <ImageLightbox 
          images={images}
          currentIndex={currentImageIndex}
          onClose={() => setShowLightbox(false)}
          onNext={() => setCurrentImageIndex(i => (i + 1) % images.length)}
          onPrev={() => setCurrentImageIndex(i => (i - 1 + images.length) % images.length)}
        />
      )}
      
      <SEOHead 
        title={adSeoTitle}
        description={adSeoDescription}
        keywords={`${ad?.title || ''}, ${ad?.category_name || ''}, ${ad?.city_name || ''}, anunturi romania`}
        image={adSeoImage}
        url={`https://x67digital.com/ad/${adId}`}
        type="product"
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/" className="hover:text-white transition-colors">Acasă</Link>
          <span>/</span>
          <Link 
            to={`/category/${ad.category_id}`} 
            className="hover:text-white transition-colors"
          >
            {ad.category_name}
          </Link>
          <span>/</span>
          <span className="text-slate-400 truncate max-w-[200px]">{ad.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="relative rounded-2xl overflow-hidden bg-[#0A0A0A]">
              {/* Badges */}
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                {ad.is_promoted && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium shadow-lg">
                    <Star className="w-4 h-4" />
                    Promovat
                  </span>
                )}
                {ad.is_boosted && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-fuchsia-600 text-white text-sm font-medium shadow-lg">
                    <Zap className="w-4 h-4" />
                    Ridicat
                  </span>
                )}
              </div>

              {/* Main Image */}
              <div className="aspect-video relative group cursor-pointer" onClick={() => setShowLightbox(true)}>
                <img
                  src={images[currentImageIndex]}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop";
                  }}
                />
                
                {/* Zoom indicator */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm rounded-full p-3">
                    <ZoomIn className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => (i - 1 + images.length) % images.length); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      data-testid="prev-image-btn"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => (i + 1) % images.length); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      data-testid="next-image-btn"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === currentImageIndex ? "border-blue-500" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Price */}
            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="ad-title">
                  {ad.title}
                </h1>
                <span 
                  className={`text-2xl md:text-3xl font-bold flex-shrink-0 ${
                    ad.price_type === "free" ? "text-emerald-400" : "text-white"
                  }`}
                  data-testid="ad-price"
                >
                  {formatPrice()}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {ad.city_name}{ad.city_county && `, ${ad.city_county}`}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {ad.views} vizualizări
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {timeAgo}
                </span>
                {ad.category_name && (
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: `${ad.category_color}20`,
                      color: ad.category_color
                    }}
                  >
                    {ad.category_name}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5">
              <h2 className="text-xl font-semibold text-white mb-4">Descriere</h2>
              <p className="text-slate-400 whitespace-pre-wrap leading-relaxed" data-testid="ad-description">
                {ad.description}
              </p>
            </div>

            {/* Details */}
            {ad.details && Object.keys(ad.details).length > 0 && (
              <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5">
                <h2 className="text-xl font-semibold text-white mb-4">Detalii</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(ad.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Contact & Actions */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5 sticky top-24">
              {/* Seller Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                {ad.user_picture ? (
                  <img 
                    src={ad.user_picture} 
                    alt="" 
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <User className="w-7 h-7 text-blue-500" />
                  </div>
                )}
                <div>
                  <Link 
                    to={`/seller/${ad.user_id}`}
                    className="text-white font-medium hover:text-blue-400 transition-colors"
                  >
                    {ad.user_name || "Anonim"}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ad.user_rating ? (
                      <RatingBadge 
                        rating={ad.user_rating} 
                        totalReviews={ad.user_reviews}
                        size="sm"
                      />
                    ) : (
                      <span className="text-slate-500 text-sm">Vânzător</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* View Seller Profile */}
              <Link
                to={`/seller/${ad.user_id}`}
                className="block w-full text-center py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-4"
              >
                Vezi profilul vânzătorului →
              </Link>

              {/* Contact Buttons */}
              {showContact ? (
                <div className="space-y-3">
                  {ad.contact_phone && (
                    <a 
                      href={`tel:${ad.contact_phone}`}
                      className="flex items-center gap-3 w-full p-4 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                      data-testid="contact-phone"
                    >
                      <Phone className="w-5 h-5" />
                      <span>{ad.contact_phone}</span>
                    </a>
                  )}
                  {ad.contact_email && (
                    <a 
                      href={`mailto:${ad.contact_email}`}
                      className="flex items-center gap-3 w-full p-4 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                      data-testid="contact-email"
                    >
                      <Mail className="w-5 h-5" />
                      <span className="truncate">{ad.contact_email}</span>
                    </a>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full h-14 text-lg rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  onClick={() => setShowContact(true)}
                  data-testid="show-contact-btn"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Arată contactul
                </Button>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                  onClick={handleShare}
                  data-testid="share-btn"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Distribuie
                </Button>
                <Button
                  variant="outline"
                  className={`flex-1 border-white/10 ${isFavorite ? 'text-red-400 border-red-500/30' : 'text-slate-400'} hover:text-red-400 hover:bg-red-500/10`}
                  onClick={toggleFavorite}
                  data-testid="favorite-btn"
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? "Salvat" : "Salvează"}
                </Button>
              </div>

              {/* Message Button (not for owner) */}
              {!isOwner && (
                <Button
                  className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={startConversation}
                  data-testid="message-btn"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Trimite mesaj
                </Button>
              )}
              
              {/* Compare & Offer Buttons (not for owner) */}
              {!isOwner && (
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                    onClick={handleAddToCompare}
                    data-testid="compare-btn"
                  >
                    <Scale className="w-4 h-4 mr-2" />
                    Compară
                  </Button>
                  {ad.price > 0 && ad.price_type !== "free" && (
                    <Button
                      variant="outline"
                      className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                      onClick={() => setShowOfferDialog(true)}
                      data-testid="make-offer-btn"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Fă o ofertă
                    </Button>
                  )}
                </div>
              )}

              {/* Boost/Promote - TopUp Section */}
              {isOwner && ad.status === "active" && (
                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                  {ad.category_id === "escorts" ? (
                    <>
                      <h4 className="text-white font-medium">TopUp Anunț Escorte - 10 RON</h4>
                      <p className="text-slate-400 text-xs">Plătește 10 RON pentru a ridica anunțul în TOP. Nelimitat pe zi!</p>
                      
                      {/* Paid TopUp Button for Escorts */}
                      <Button
                        className="w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                        onClick={handlePaidTopup}
                        disabled={topupLoading}
                        data-testid="paid-topup-btn"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {topupLoading ? "Se procesează..." : "💳 Top-Up 10 RON - Ridică în TOP"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <h4 className="text-white font-medium">TopUp Anunț - GRATUIT</h4>
                      
                      {/* Free TopUp Button */}
                      <Button
                        className="w-full bg-gradient-to-r from-fuchsia-600 to-blue-600 hover:from-fuchsia-500 hover:to-blue-500 text-white"
                        onClick={handleTopup}
                        disabled={topupLoading}
                        data-testid="topup-btn"
                      >
                        <ArrowUp className="w-4 h-4 mr-2" />
                        {topupLoading ? "Se procesează..." : "TopUp - Ridică în TOP"}
                      </Button>
                    </>
                  )}
                  
                  {/* Auto TopUp Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#121212]">
                    <div className="flex items-center gap-3">
                      <Timer className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white text-sm font-medium">Auto-TopUp</p>
                        <p className="text-slate-500 text-xs">Ridică automat la fiecare oră</p>
                      </div>
                    </div>
                    <Switch
                      checked={ad.auto_topup !== false}
                      onCheckedChange={handleAutoTopupToggle}
                    />
                  </div>
                  
                  {/* Referral Section */}
                  {referralCode && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 className="w-4 h-4 text-emerald-400" />
                        <p className="text-emerald-400 text-sm font-medium">Bonus Referral</p>
                      </div>
                      <p className="text-slate-400 text-xs mb-3">
                        {referralCount > 0 
                          ? `Ai ${referralCount} referral(uri)! TopUp la fiecare 40 min.`
                          : "Distribuie link-ul și vei putea face TopUp la fiecare 40 min în loc de 60!"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={copyReferralLink}
                      >
                        <Copy className="w-3 h-3 mr-2" />
                        Copiază link referral
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Report */}
              <button 
                onClick={handleOpenReport}
                className="flex items-center gap-2 mt-6 text-slate-500 hover:text-red-400 text-sm transition-colors"
                data-testid="report-ad-btn"
              >
                <Flag className="w-4 h-4" />
                Raportează anunțul
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-400" />
              Raportează Anunțul
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Selectează motivul pentru care dorești să raportezi acest anunț
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {reportReasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    selectedReason === reason.id 
                      ? 'border-red-500/50 bg-red-500/10 text-white' 
                      : 'border-white/10 bg-[#121212] text-slate-400 hover:border-white/20'
                  }`}
                >
                  {reason.name}
                </button>
              ))}
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Detalii suplimentare (opțional)
              </label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Descrie problema în detaliu..."
                className="bg-[#121212] border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              className="border-white/10"
            >
              Anulează
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={!selectedReason || submittingReport}
              className="bg-red-600 hover:bg-red-500"
            >
              {submittingReport ? "Se trimite..." : "Trimite Raportul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Fă o Ofertă de Preț</DialogTitle>
            <DialogDescription className="text-slate-400">
              Propune un preț pentru "{ad?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-slate-400">Prețul cerut:</span>
              <span className="text-white font-bold text-lg">{ad?.price?.toLocaleString()} RON</span>
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Oferta ta (RON) *</label>
              <Input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Introdu prețul oferit"
                className="bg-[#121212] border-white/10 text-white text-lg"
              />
              {offerPrice && ad?.price && (
                <p className="text-sm mt-2 text-slate-400">
                  {((parseFloat(offerPrice) / ad.price) * 100).toFixed(0)}% din prețul cerut
                  {parseFloat(offerPrice) < ad.price && (
                    <span className="text-green-400 ml-2">
                      (economisești {(ad.price - parseFloat(offerPrice)).toLocaleString()} RON)
                    </span>
                  )}
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Mesaj (opțional)</label>
              <Textarea
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Adaugă un mesaj pentru vânzător..."
                className="bg-[#121212] border-white/10 text-white"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowOfferDialog(false)}>
              Anulează
            </Button>
            <Button 
              onClick={handleSubmitOffer}
              disabled={submittingOffer || !offerPrice}
              className="bg-green-600 hover:bg-green-500"
            >
              {submittingOffer ? "Se trimite..." : "Trimite Oferta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
