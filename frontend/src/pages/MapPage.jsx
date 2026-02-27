import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  MapPin, 
  Search, 
  Filter, 
  X, 
  ChevronRight,
  Loader2,
  Eye,
  Euro
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fix default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons by category
const createCategoryIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color}; 
      width: 32px; 
      height: 32px; 
      border-radius: 50% 50% 50% 0; 
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const CATEGORY_COLORS = {
  escorts: "#D946EF",
  real_estate: "#10B981",
  cars: "#3B82F6",
  jobs: "#F59E0B",
  electronics: "#8B5CF6",
  fashion: "#EC4899",
  services: "#06B6D4",
  animals: "#84CC16",
  default: "#6B7280"
};

// Component to recenter map
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [judete, setJudete] = useState([]);
  const [localitati, setLocalitati] = useState([]);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedJudet, setSelectedJudet] = useState(searchParams.get("judet") || "");
  const [selectedLocalitate, setSelectedLocalitate] = useState("");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [showFilters, setShowFilters] = useState(false);
  
  // Map state
  const [mapCenter, setMapCenter] = useState([45.9432, 24.9668]); // Romania center
  const [mapZoom, setMapZoom] = useState(7);
  const [selectedAd, setSelectedAd] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAds();
  }, [selectedCategory, selectedJudet, searchQuery]);

  useEffect(() => {
    if (selectedJudet) {
      fetchLocalitati(selectedJudet);
      // Center map on selected county
      const judet = judete.find(j => j.code === selectedJudet);
      if (judet) {
        setMapCenter([judet.lat, judet.lng]);
        setMapZoom(9);
      }
    } else {
      setLocalitati([]);
      setMapCenter([45.9432, 24.9668]);
      setMapZoom(7);
    }
  }, [selectedJudet, judete]);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, judeteRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/judete`)
      ]);
      setCategories(categoriesRes.data);
      setJudete(judeteRes.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchLocalitati = async (judetCode) => {
    try {
      const res = await axios.get(`${API_URL}/api/localitati?judet_code=${judetCode}&limit=500`);
      setLocalitati(res.data);
    } catch (error) {
      console.error("Error fetching localitati:", error);
    }
  };

  const fetchAds = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedJudet) params.append("judet_code", selectedJudet);
      if (searchQuery) params.append("q", searchQuery);
      params.append("status", "active");
      params.append("has_location", "true");
      
      const res = await axios.get(`${API_URL}/api/ads?${params.toString()}`);
      
      // Filter only ads with location data
      const adsWithLocation = res.data.ads.filter(ad => 
        ad.location_lat && ad.location_lng
      );
      
      setAds(adsWithLocation);
    } catch (error) {
      console.error("Error fetching ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedJudet("");
    setSelectedLocalitate("");
    setSearchQuery("");
    setSearchParams({});
  };

  const getCategoryColor = (categoryId) => {
    return CATEGORY_COLORS[categoryId] || CATEGORY_COLORS.default;
  };

  const formatPrice = (price, priceType) => {
    if (!price) return "Preț la cerere";
    if (priceType === "negotiable") return `${price.toLocaleString()} € (neg.)`;
    return `${price.toLocaleString()} €`;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col" data-testid="map-page">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Search & Filters Bar */}
        <div className="bg-[#0A0A0A] border-b border-white/5 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută pe hartă..."
                className="pl-10 h-10 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                data-testid="map-search"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40 h-10 bg-[#121212] border-white/10 text-white" data-testid="category-filter">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent className="bg-[#121212] border-white/10">
                <SelectItem value="all">Toate categoriile</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* County Filter */}
            <Select value={selectedJudet} onValueChange={setSelectedJudet}>
              <SelectTrigger className="w-40 h-10 bg-[#121212] border-white/10 text-white" data-testid="judet-filter">
                <SelectValue placeholder="Județ" />
              </SelectTrigger>
              <SelectContent className="bg-[#121212] border-white/10 max-h-60">
                <SelectItem value="all">Toate județele</SelectItem>
                {judete.map((judet) => (
                  <SelectItem key={judet.code} value={judet.code}>{judet.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(selectedCategory || selectedJudet || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-1" />
                Șterge filtrele
              </Button>
            )}

            {/* Results Count */}
            <div className="text-sm text-slate-400">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                `${ads.length} anunțuri pe hartă`
              )}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            style={{ minHeight: "calc(100vh - 180px)" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecenter center={mapCenter} zoom={mapZoom} />
            
            {/* Ad Markers */}
            {ads.map((ad) => (
              <Marker
                key={ad.ad_id}
                position={[ad.location_lat, ad.location_lng]}
                icon={createCategoryIcon(getCategoryColor(ad.category_id))}
                eventHandlers={{
                  click: () => setSelectedAd(ad)
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    {ad.images?.[0] && (
                      <img 
                        src={ad.images[0]} 
                        alt={ad.title}
                        className="w-full h-24 object-cover rounded-t-lg"
                      />
                    )}
                    <div className="p-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{ad.title}</h3>
                      <p className="text-emerald-600 font-bold mt-1">
                        {formatPrice(ad.price, ad.price_type)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {ad.localitate}
                      </p>
                      <Link
                        to={`/ad/${ad.ad_id}`}
                        className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Vezi anunțul <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-[#0A0A0A]/90 backdrop-blur-sm rounded-lg p-3 border border-white/10 z-[1000]">
            <h4 className="text-xs font-semibold text-white mb-2">Legendă</h4>
            <div className="space-y-1">
              {categories.slice(0, 5).map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CATEGORY_COLORS[cat.id] || CATEGORY_COLORS.default }}
                  />
                  <span className="text-xs text-slate-400">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Ad Panel */}
          {selectedAd && (
            <div className="absolute top-4 right-4 w-80 bg-[#0A0A0A]/95 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden z-[1000]">
              <button
                onClick={() => setSelectedAd(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
              >
                <X className="w-4 h-4" />
              </button>
              
              {selectedAd.images?.[0] && (
                <img 
                  src={selectedAd.images[0]} 
                  alt={selectedAd.title}
                  className="w-full h-40 object-cover"
                />
              )}
              
              <div className="p-4">
                <h3 className="font-semibold text-white line-clamp-2">{selectedAd.title}</h3>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-emerald-500 font-bold text-lg">
                    {formatPrice(selectedAd.price, selectedAd.price_type)}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {selectedAd.views} vizualizări
                  </span>
                </div>
                
                <div className="mt-3 flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {selectedAd.localitate}, {judete.find(j => j.code === selectedAd.judet_code)?.name}
                </div>
                
                <p className="mt-3 text-sm text-slate-400 line-clamp-3">
                  {selectedAd.description}
                </p>
                
                <Link
                  to={`/ad/${selectedAd.ad_id}`}
                  className="mt-4 block"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Vezi anunțul complet
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* No Results Message */}
          {!loading && ads.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[1000]">
              <div className="bg-[#0A0A0A] rounded-xl p-6 text-center max-w-sm">
                <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white">Nu am găsit anunțuri</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Nu există anunțuri cu locație pentru filtrele selectate. Încearcă să modifici criteriile de căutare.
                </p>
                <Button 
                  onClick={clearFilters}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Șterge filtrele
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
