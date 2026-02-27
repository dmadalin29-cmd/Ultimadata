import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Scale, X, Check, MapPin, Calendar, Eye, Star,
  ArrowRight, Trash2, Plus, MessageCircle, DollarSign
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ComparePage() {
  const navigate = useNavigate();
  const [comparison, setComparison] = useState({ ads: [], count: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch comparison data
  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/compare`, { withCredentials: true });
        setComparison(response.data);
      } catch (error) {
        console.error("Error fetching comparison:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, []);

  // Remove from comparison
  const handleRemove = async (adId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/compare/remove/${adId}`, { withCredentials: true });
      setComparison({ ads: comparison.ads.filter(ad => ad.ad_id !== adId), count: response.data.count });
      toast.success("Anunț eliminat din comparație");
    } catch (error) {
      toast.error("Eroare la eliminare");
    }
  };

  // Clear all
  const handleClearAll = async () => {
    try {
      await axios.delete(`${API_URL}/api/compare/clear`, { withCredentials: true });
      setComparison({ ads: [], count: 0 });
      toast.success("Comparația a fost golită");
    } catch (error) {
      toast.error("Eroare la golire");
    }
  };

  // Format price
  const formatPrice = (price, priceType) => {
    if (priceType === "free") return "Gratuit";
    if (priceType === "negotiable") return price ? `${price.toLocaleString()} RON (neg.)` : "Negociabil";
    return price ? `${price.toLocaleString()} RON` : "La cerere";
  };

  // Get comparison attributes
  const getAttributes = () => {
    const attrs = [
      { key: "price", label: "Preț", format: (ad) => formatPrice(ad.price, ad.price_type) },
      { key: "city_name", label: "Locație", format: (ad) => ad.city_name || "-" },
      { key: "views", label: "Vizualizări", format: (ad) => ad.views || 0 },
      { key: "created_at", label: "Postat", format: (ad) => ad.created_at ? formatDistanceToNow(new Date(ad.created_at), { locale: ro, addSuffix: true }) : "-" },
      { key: "user_rating", label: "Rating vânzător", format: (ad) => ad.user_rating ? `${ad.user_rating.toFixed(1)} ⭐` : "-" },
    ];
    
    // Add category-specific attributes based on first ad's category
    if (comparison.ads.length > 0) {
      const category = comparison.ads[0].category_id;
      
      if (category === "auto") {
        attrs.push(
          { key: "year", label: "An fabricație", format: (ad) => ad.details?.year || "-" },
          { key: "mileage", label: "Kilometraj", format: (ad) => ad.details?.mileage ? `${ad.details.mileage.toLocaleString()} km` : "-" },
          { key: "fuel", label: "Combustibil", format: (ad) => ad.details?.fuel || "-" },
          { key: "engine", label: "Motor", format: (ad) => ad.details?.engine || "-" }
        );
      } else if (category === "real_estate") {
        attrs.push(
          { key: "rooms", label: "Camere", format: (ad) => ad.details?.rooms || "-" },
          { key: "surface", label: "Suprafață", format: (ad) => ad.details?.surface ? `${ad.details.surface} m²` : "-" },
          { key: "floor", label: "Etaj", format: (ad) => ad.details?.floor || "-" }
        );
      } else if (category === "electronics") {
        attrs.push(
          { key: "brand", label: "Brand", format: (ad) => ad.details?.brand || "-" },
          { key: "condition", label: "Stare", format: (ad) => ad.details?.condition || "-" }
        );
      }
    }
    
    return attrs;
  };

  // Find best value for each attribute
  const getBestValue = (key, ads) => {
    if (key === "price") {
      const prices = ads.filter(ad => ad.price > 0).map(ad => ({ id: ad.ad_id, price: ad.price }));
      if (prices.length === 0) return null;
      const minPrice = Math.min(...prices.map(p => p.price));
      return prices.find(p => p.price === minPrice)?.id;
    }
    if (key === "views") {
      const maxViews = Math.max(...ads.map(ad => ad.views || 0));
      return ads.find(ad => ad.views === maxViews)?.ad_id;
    }
    if (key === "user_rating") {
      const ratings = ads.filter(ad => ad.user_rating > 0);
      if (ratings.length === 0) return null;
      const maxRating = Math.max(...ratings.map(ad => ad.user_rating));
      return ratings.find(ad => ad.user_rating === maxRating)?.ad_id;
    }
    return null;
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
    <div className="min-h-screen bg-[#050505]" data-testid="compare-page">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-400" />
              Comparator Anunțuri
            </h1>
            <p className="text-slate-400">
              Compară până la 4 anunțuri side-by-side
            </p>
          </div>
          
          {comparison.count > 0 && (
            <Button 
              variant="ghost" 
              className="text-red-400 hover:text-red-300"
              onClick={handleClearAll}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Golește
            </Button>
          )}
        </div>

        {/* Empty State */}
        {comparison.count === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#0A0A0A] border border-white/5">
            <Scale className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Niciun anunț de comparat</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Adaugă anunțuri la comparație apăsând butonul "Compară" de pe paginile de anunțuri
            </p>
            <Link to="/">
              <Button className="bg-blue-600 hover:bg-blue-500">
                Explorează Anunțuri
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Ad Cards Header */}
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `200px repeat(${comparison.count}, 1fr)` }}>
              <div></div>
              {comparison.ads.map((ad) => (
                <div key={ad.ad_id} className="bg-[#0A0A0A] border border-white/5 rounded-xl overflow-hidden">
                  <div className="relative aspect-video">
                    <img
                      src={ad.images?.[0] || "https://via.placeholder.com/400x300?text=No+Image"}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white"
                      onClick={() => handleRemove(ad.ad_id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <Link to={`/ad/${ad.ad_id}`}>
                      <h3 className="font-medium text-white line-clamp-2 hover:text-blue-400 transition-colors">
                        {ad.title}
                      </h3>
                    </Link>
                    <p className="text-lg font-bold text-blue-400 mt-2">
                      {formatPrice(ad.price, ad.price_type)}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Add More Slot */}
              {comparison.count < 4 && (
                <Link 
                  to="/"
                  className="bg-[#0A0A0A] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center min-h-[200px] hover:border-blue-500/50 transition-colors"
                >
                  <Plus className="w-10 h-10 text-slate-500 mb-2" />
                  <span className="text-slate-400">Adaugă anunț</span>
                </Link>
              )}
            </div>

            {/* Comparison Table */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-xl overflow-hidden">
              {getAttributes().map((attr, idx) => {
                const bestId = getBestValue(attr.key, comparison.ads);
                
                return (
                  <div 
                    key={attr.key}
                    className={`grid gap-4 ${idx !== 0 ? 'border-t border-white/5' : ''}`}
                    style={{ gridTemplateColumns: `200px repeat(${comparison.count}, 1fr)` }}
                  >
                    <div className="p-4 bg-[#121212] font-medium text-slate-300">
                      {attr.label}
                    </div>
                    {comparison.ads.map((ad) => (
                      <div 
                        key={ad.ad_id} 
                        className={`p-4 text-white ${bestId === ad.ad_id ? 'bg-green-500/10' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          {attr.format(ad)}
                          {bestId === ad.ad_id && (
                            <Check className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: `200px repeat(${comparison.count}, 1fr)` }}>
              <div></div>
              {comparison.ads.map((ad) => (
                <div key={ad.ad_id} className="flex gap-2">
                  <Link to={`/ad/${ad.ad_id}`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-500">
                      Vezi Detalii
                    </Button>
                  </Link>
                  <Link to={`/messages?ad=${ad.ad_id}&to=${ad.user_id}`}>
                    <Button variant="outline" className="border-white/10 hover:bg-white/5">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
