import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Heart, Trash2, TrendingDown, MapPin, Eye, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites`, {
        withCredentials: true
      });
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (adId) => {
    try {
      await axios.delete(`${API_URL}/api/favorites/${adId}`, {
        withCredentials: true
      });
      setFavorites(prev => prev.filter(f => f.ad_id !== adId));
      toast.success("Eliminat din favorite");
    } catch (error) {
      toast.error("Eroare la eliminare");
    }
  };

  const formatPrice = (price) => {
    if (!price) return "Preț la cerere";
    return `${price.toLocaleString("ro-RO")} €`;
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="favorites-page">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
            <Heart className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Anunțuri Favorite</h1>
            <p className="text-slate-400">{favorites.length} anunțuri salvate</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-[#0A0A0A] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((ad) => (
              <div 
                key={ad.ad_id} 
                className="group relative rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-all"
              >
                {/* Price Drop Badge */}
                {ad.price_dropped && (
                  <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Preț redus!
                  </div>
                )}
                
                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFavorite(ad.ad_id);
                  }}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link to={`/ad/${ad.ad_id}`}>
                  {/* Image */}
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {ad.images && ad.images.length > 0 ? (
                      <img
                        src={ad.images[0].startsWith("http") ? ad.images[0] : `${API_URL}${ad.images[0]}`}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#121212] flex items-center justify-center">
                        <Heart className="w-12 h-12 text-slate-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-white font-medium truncate mb-2">{ad.title}</h3>
                    
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{ad.city_name || ad.city_id}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold text-white">{formatPrice(ad.price)}</p>
                        {ad.price_dropped && ad.original_price && (
                          <p className="text-sm text-slate-500 line-through">{formatPrice(ad.original_price)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-sm">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {ad.views || 0}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1 text-slate-500 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>
                        Salvat {formatDistanceToNow(new Date(ad.favorited_at), { addSuffix: true, locale: ro })}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#0A0A0A] flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-slate-700" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Niciun anunț salvat</h2>
            <p className="text-slate-400 mb-6">Salvează anunțurile care te interesează pentru a le accesa rapid</p>
            <Button asChild className="bg-blue-600 hover:bg-blue-500">
              <Link to="/">Explorează anunțuri</Link>
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
