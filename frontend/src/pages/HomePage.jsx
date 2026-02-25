import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import BannerCarousel from "../components/BannerCarousel";
import CategoryGrid from "../components/CategoryGrid";
import AdCard from "../components/AdCard";
import SEOHead from "../components/SEOHead";
import { Button } from "../components/ui/button";
import { ArrowRight, TrendingUp, Clock, Sparkles } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [promotedAds, setPromotedAds] = useState([]);
  const [recentAds, setRecentAds] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, promotedRes, recentRes, bannersRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/ads/promoted?limit=8`),
        axios.get(`${API_URL}/api/ads?sort=newest&limit=12`),
        axios.get(`${API_URL}/api/banners?position=homepage`)
      ]);
      
      setCategories(categoriesRes.data);
      setPromotedAds(promotedRes.data);
      setRecentAds(recentRes.data.ads || []);
      setBanners(bannersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="home-page">
      <SEOHead 
        title="X67 Digital Media - Anunțuri Gratuite România | Mașini SH, Case, Electronice, Joburi"
        description="Cel mai mare site de anunțuri gratuite din România. Vinde și cumpără mașini second hand, apartamente, case, electronice, locuri de muncă. Peste 10.000 anunțuri verificate zilnic!"
        keywords="anunturi gratuite, masini second hand, auto sh, apartamente de vanzare, case de vanzare, imobiliare romania, electronice ieftine, telefoane, laptopuri, locuri de munca, joburi romania, servicii, olx alternativa, publi24 alternativa"
        url="https://x67digital.com"
      />
      <Header />

      <main>
        {/* Hero Banner Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <BannerCarousel banners={banners} />
          </div>
        </section>

        {/* Categories Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Explorează Categoriile
                </h2>
                <p className="text-slate-400">
                  Găsește exact ce cauți în categoriile noastre
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i}
                    className={`rounded-2xl bg-[#0A0A0A] animate-pulse ${
                      i < 2 ? "md:col-span-2 md:row-span-2 aspect-video" : "aspect-[4/3]"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <CategoryGrid categories={categories} />
            )}
          </div>
        </section>

        {/* Promoted Ads Section */}
        {promotedAds.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                      Anunțuri Promovate
                    </h2>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Cele mai populare oferte
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {promotedAds.map((ad) => (
                  <AdCard key={ad.ad_id} ad={ad} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent Ads Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                    Anunțuri Recente
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm">
                    Cele mai noi anunțuri
                  </p>
                </div>
              </div>
              <Link to="/category/all">
                <Button 
                  variant="ghost" 
                  className="text-slate-400 hover:text-white hover:bg-white/5 text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Vezi toate</span>
                  <ArrowRight className="w-4 h-4 sm:ml-2" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="rounded-xl sm:rounded-2xl bg-[#0A0A0A] aspect-[4/3] animate-pulse"
                  />
                ))}
              </div>
            ) : recentAds.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentAds.map((ad) => (
                  <AdCard key={ad.ad_id} ad={ad} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-2xl bg-[#0A0A0A] border border-white/5">
                <p className="text-slate-400 mb-4">Nu există anunțuri încă</p>
                <Link to="/create-ad">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                    Adaugă primul anunț
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent border border-white/10 p-8 md:p-12 text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ai ceva de vândut?
                </h2>
                <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                  Postează anunțul tău în câteva minute și ajunge la mii de cumpărători potențiali.
                </p>
                <Link to="/create-ad">
                  <Button className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Publică Gratuit
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
