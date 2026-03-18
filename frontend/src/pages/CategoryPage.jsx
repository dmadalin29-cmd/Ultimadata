import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AdCard from "../components/AdCard";
import SEOHead from "../components/SEOHead";
import AgeVerificationModal from "../components/AgeVerificationModal";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// SEO keywords for each category
const CATEGORY_SEO = {
  auto: {
    title: "Mașini Second Hand România - Auto SH, Autoturisme de Vânzare | X67",
    description: "Anunțuri mașini second hand din toată România. BMW, Audi, Mercedes, VW, Ford și alte mărci. Prețuri de la 1000€. Găsește mașina perfectă!",
    keywords: "masini second hand, auto sh, autoturisme, masini ieftine, vanzari auto, bmw sh, audi second, mercedes ocasii, vw golf, ford focus"
  },
  imobiliare: {
    title: "Apartamente și Case de Vânzare România - Imobiliare | X67",
    description: "Anunțuri imobiliare din toată România. Apartamente, case, terenuri, spații comerciale. Prețuri actualizate zilnic!",
    keywords: "apartamente vanzare, case vanzare, imobiliare romania, terenuri, garsoniere, apartamente 2 camere, case ieftine, chirii"
  },
  electronice: {
    title: "Electronice Second Hand - Telefoane, Laptopuri, TV | X67",
    description: "Electronice și electrocasnice second hand. iPhone, Samsung, laptopuri, televizoare la prețuri mici!",
    keywords: "electronice second hand, telefoane ieftine, iphone sh, samsung second, laptopuri, televizoare, electrocasnice"
  },
  locuri_munca: {
    title: "Locuri de Muncă România - Joburi, Angajări 2024 | X67",
    description: "Cele mai noi locuri de muncă din România. Joburi full-time, part-time, remote. Aplică acum!",
    keywords: "locuri de munca, joburi romania, angajari, cariera, oferte munca, job remote, part time, full time"
  },
  moda: {
    title: "Haine și Încălțăminte - Modă Second Hand | X67",
    description: "Haine de firmă second hand, încălțăminte, accesorii. Branduri originale la prețuri mici!",
    keywords: "haine second hand, incaltaminte, moda, accesorii, branduri, rochii, pantofi, genti"
  },
  servicii: {
    title: "Servicii România - Reparații, Transport, Curățenie | X67",
    description: "Servicii profesionale în toată România. Reparații, transport, curățenie, instalații și multe altele!",
    keywords: "servicii romania, reparatii, transport, curatenie, instalatii, zugraveli, meditații"
  },
  animale: {
    title: "Animale de Companie - Câini, Pisici, Accesorii | X67",
    description: "Anunțuri animale de companie. Câini, pisici, păsări, accesorii pentru animale!",
    keywords: "animale companie, caini, pisici, pasari, accesorii animale, hrana animale, pet shop"
  },
  escorts: {
    title: "Escorte România - Companie pentru Evenimente | X67",
    description: "Servicii de escortă și companie pentru evenimente în România.",
    keywords: "escorte, companie, evenimente, intalniri"
  }
};

export default function CategoryPage() {
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [ads, setAds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAds, setTotalAds] = useState(0);
  
  // Age verification for escorts category
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  
  // Check if age verification is needed for escorts category
  useEffect(() => {
    if (categoryId === 'escorts' || categoryId === 'escorte') {
      const isVerified = localStorage.getItem('age_verified_18plus') === 'true';
      if (!isVerified) {
        setShowAgeModal(true);
        setAgeVerified(false);
      } else {
        setAgeVerified(true);
      }
    } else {
      setAgeVerified(true);
    }
  }, [categoryId]);
  
  // Get SEO data for current category
  const seoData = CATEGORY_SEO[categoryId] || {
    title: `Anunțuri ${categoryId} România | X67 Digital`,
    description: `Cele mai bune anunțuri ${categoryId} din România. Prețuri actualizate zilnic!`,
    keywords: `${categoryId}, anunturi, romania`
  };
  
  // Filters
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const currentCategory = categories.find(c => c.id === categoryId);

  // Helper function to change page and scroll to top
  const handlePageChange = (newPage) => {
    if (typeof newPage === 'function') {
      setPage(prev => {
        const nextPage = newPage(prev);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return nextPage;
      });
    } else {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAds();
  }, [categoryId, selectedSubcategory, selectedCity, sortBy, minPrice, maxPrice, page]);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, citiesRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/cities`)
      ]);
      setCategories(categoriesRes.data);
      setCities(citiesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchAds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryId && categoryId !== "all") {
        params.append("category_id", categoryId);
      }
      if (selectedSubcategory && selectedSubcategory !== "all") params.append("subcategory_id", selectedSubcategory);
      if (selectedCity && selectedCity !== "all") params.append("city_id", selectedCity);
      if (sortBy) params.append("sort", sortBy);
      if (minPrice) params.append("min_price", minPrice);
      if (maxPrice) params.append("max_price", maxPrice);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", page);
      params.append("limit", 20);

      const response = await axios.get(`${API_URL}/api/ads?${params.toString()}`);
      setAds(response.data.ads || []);
      setTotalPages(response.data.pages || 1);
      setTotalAds(response.data.total || 0);
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAds();
  };

  const clearFilters = () => {
    setSelectedSubcategory("all");
    setSelectedCity("all");
    setSortBy("newest");
    setMinPrice("");
    setMaxPrice("");
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters = (selectedSubcategory && selectedSubcategory !== "all") || (selectedCity && selectedCity !== "all") || minPrice || maxPrice || searchQuery;

  // Handle age verification
  const handleAgeConfirm = () => {
    setShowAgeModal(false);
    setAgeVerified(true);
  };

  const handleAgeCancel = () => {
    setShowAgeModal(false);
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="category-page">
      {/* Age Verification Modal for Escorts */}
      <AgeVerificationModal 
        isOpen={showAgeModal} 
        onConfirm={handleAgeConfirm}
        onCancel={handleAgeCancel}
      />
      
      <SEOHead 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url={`https://x67digital.com/category/${categoryId}`}
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link to="/" className="hover:text-white transition-colors">Acasă</Link>
            <span>/</span>
            <span className="text-white">{currentCategory?.name || "Toate Anunțurile"}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {currentCategory?.name || "Toate Anunțurile"}
              </h1>
              <p className="text-slate-400">
                {totalAds} anunțuri găsite
              </p>
            </div>
            
            <Button
              variant="outline"
              className="lg:hidden border-white/10 text-white hover:bg-white/5"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtre
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? "fixed inset-0 z-50 bg-[#050505] p-4 overflow-y-auto" : "hidden"} lg:block lg:relative lg:w-64 lg:flex-shrink-0`}>
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Mobile header */}
              <div className="flex items-center justify-between lg:hidden mb-4">
                <h2 className="text-xl font-bold text-white">Filtre</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Caută</label>
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Caută anunțuri..."
                    className="pl-10 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                    data-testid="filter-search"
                  />
                </form>
              </div>

              {/* Subcategory */}
              {currentCategory?.subcategories && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Subcategorie</label>
                  <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                    <SelectTrigger className="bg-[#121212] border-white/10 text-white" data-testid="filter-subcategory">
                      <SelectValue placeholder="Toate subcategoriile" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-white/10">
                      <SelectItem value="all">Toate</SelectItem>
                      {currentCategory.subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* City */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Oraș</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="bg-[#121212] border-white/10 text-white" data-testid="filter-city">
                    <SelectValue placeholder="Toate orașele" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121212] border-white/10 max-h-60">
                    <SelectItem value="all">Toate orașele</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Preț (€)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                    data-testid="filter-min-price"
                  />
                  <Input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                    data-testid="filter-max-price"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Sortare</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-[#121212] border-white/10 text-white" data-testid="filter-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121212] border-white/10">
                    <SelectItem value="newest">Cele mai noi</SelectItem>
                    <SelectItem value="oldest">Cele mai vechi</SelectItem>
                    <SelectItem value="price_low">Preț: mic-mare</SelectItem>
                    <SelectItem value="price_high">Preț: mare-mic</SelectItem>
                    {categoryId === "escorts" && (
                      <SelectItem value="boosted">Ridicate</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                  onClick={clearFilters}
                  data-testid="clear-filters-btn"
                >
                  <X className="w-4 h-4 mr-2" />
                  Șterge filtrele
                </Button>
              )}

              {/* Apply Filters - Mobile */}
              <Button
                className="w-full lg:hidden bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => {
                  setShowFilters(false);
                  fetchAds();
                }}
              >
                Aplică filtrele
              </Button>
            </div>
          </aside>

          {/* Ads Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-[#0A0A0A] aspect-[4/3] animate-pulse" />
                ))}
              </div>
            ) : ads.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {ads.map((ad) => (
                    <AdCard key={ad.ad_id} ad={ad} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page === 1}
                      onClick={() => handlePageChange(p => p - 1)}
                      className="border-white/10 text-white hover:bg-white/5"
                      data-testid="prev-page-btn"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="icon"
                            onClick={() => handlePageChange(pageNum)}
                            className={page === pageNum 
                              ? "bg-blue-600 text-white" 
                              : "border-white/10 text-white hover:bg-white/5"
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page === totalPages}
                      onClick={() => handlePageChange(p => p + 1)}
                      className="border-white/10 text-white hover:bg-white/5"
                      data-testid="next-page-btn"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 rounded-2xl bg-[#0A0A0A] border border-white/5">
                <p className="text-slate-400 mb-4">Nu există anunțuri în această categorie</p>
                <Link to="/create-ad">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                    Adaugă primul anunț
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
