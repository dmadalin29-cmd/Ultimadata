import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Bell, BellRing, Plus, Search, Trash2, Edit2, 
  MapPin, Tag, DollarSign, Clock, ChevronRight,
  Filter, Zap, Eye, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Categories data
const CATEGORIES = [
  { id: "escorts", name: "Escorte" },
  { id: "real_estate", name: "Imobiliare" },
  { id: "auto", name: "Auto" },
  { id: "jobs", name: "Locuri de muncă" },
  { id: "electronics", name: "Electronice" },
  { id: "fashion", name: "Modă" },
  { id: "services", name: "Servicii" },
  { id: "animals", name: "Animale" },
];

export default function SavedSearchesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // New search form
  const [newSearch, setNewSearch] = useState({
    name: "",
    category_id: "",
    city_id: "",
    search_query: "",
    min_price: "",
    max_price: "",
    alert_frequency: "daily"
  });

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

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/cities`);
        setCities(response.data);
      } catch (error) {
        console.error("Error fetching cities:", error);
      }
    };
    fetchCities();
  }, []);

  // Fetch saved searches
  useEffect(() => {
    const fetchSavedSearches = async () => {
      if (!user) return;
      try {
        const response = await axios.get(`${API_URL}/api/saved-searches`, { withCredentials: true });
        setSavedSearches(response.data.saved_searches);
      } catch (error) {
        console.error("Error fetching saved searches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedSearches();
  }, [user]);

  // Create new saved search
  const handleCreateSearch = async () => {
    if (!newSearch.name.trim()) {
      toast.error("Te rog introdu un nume pentru căutare");
      return;
    }
    
    setCreating(true);
    try {
      const data = {
        name: newSearch.name,
        category_id: newSearch.category_id || null,
        city_id: newSearch.city_id || null,
        search_query: newSearch.search_query || null,
        min_price: newSearch.min_price ? parseFloat(newSearch.min_price) : null,
        max_price: newSearch.max_price ? parseFloat(newSearch.max_price) : null,
        alert_frequency: newSearch.alert_frequency
      };
      
      const response = await axios.post(`${API_URL}/api/saved-searches`, data, { withCredentials: true });
      toast.success("Căutarea a fost salvată!");
      setShowCreateDialog(false);
      setNewSearch({
        name: "",
        category_id: "",
        city_id: "",
        search_query: "",
        min_price: "",
        max_price: "",
        alert_frequency: "daily"
      });
      
      // Refresh list
      const listResponse = await axios.get(`${API_URL}/api/saved-searches`, { withCredentials: true });
      setSavedSearches(listResponse.data.saved_searches);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la salvarea căutării");
    } finally {
      setCreating(false);
    }
  };

  // Delete saved search
  const handleDelete = async (searchId) => {
    if (!window.confirm("Sigur vrei să ștergi această căutare salvată?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/saved-searches/${searchId}`, { withCredentials: true });
      toast.success("Căutarea a fost ștearsă");
      setSavedSearches(prev => prev.filter(s => s.search_id !== searchId));
    } catch (error) {
      toast.error("Eroare la ștergerea căutării");
    }
  };

  // Toggle alert
  const handleToggleAlert = async (search) => {
    try {
      await axios.put(
        `${API_URL}/api/saved-searches/${search.search_id}`,
        { is_active: !search.is_active },
        { withCredentials: true }
      );
      setSavedSearches(prev => prev.map(s => 
        s.search_id === search.search_id ? { ...s, is_active: !s.is_active } : s
      ));
      toast.success(search.is_active ? "Alertele au fost dezactivate" : "Alertele au fost activate");
    } catch (error) {
      toast.error("Eroare la actualizarea alertelor");
    }
  };

  // Get frequency label
  const getFrequencyLabel = (freq) => {
    switch (freq) {
      case "instant": return "Instant";
      case "daily": return "Zilnic";
      case "weekly": return "Săptămânal";
      default: return freq;
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
    <div className="min-h-screen bg-[#050505]" data-testid="saved-searches-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Căutări Salvate</h1>
            <p className="text-slate-400">Primește alerte când apar anunțuri noi care se potrivesc criteriilor tale</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500" data-testid="create-search-btn">
                <Plus className="w-4 h-4 mr-2" />
                Căutare nouă
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle>Creează o căutare salvată</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Vei primi notificări când apar anunțuri noi care se potrivesc criteriilor tale.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Nume căutare *</label>
                  <Input
                    placeholder="ex: BMW sub 10.000€ în București"
                    value={newSearch.name}
                    onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                    className="bg-[#121212] border-white/10 text-white"
                    data-testid="search-name-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Categorie</label>
                    <Select
                      value={newSearch.category_id}
                      onValueChange={(value) => setNewSearch({ ...newSearch, category_id: value })}
                    >
                      <SelectTrigger className="bg-[#121212] border-white/10 text-white">
                        <SelectValue placeholder="Toate categoriile" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-white/10">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Oraș</label>
                    <Select
                      value={newSearch.city_id}
                      onValueChange={(value) => setNewSearch({ ...newSearch, city_id: value })}
                    >
                      <SelectTrigger className="bg-[#121212] border-white/10 text-white">
                        <SelectValue placeholder="Toate orașele" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-white/10 max-h-60">
                        {cities.map(city => (
                          <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Cuvinte cheie</label>
                  <Input
                    placeholder="ex: BMW, seria 5, diesel..."
                    value={newSearch.search_query}
                    onChange={(e) => setNewSearch({ ...newSearch, search_query: e.target.value })}
                    className="bg-[#121212] border-white/10 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Preț minim (RON)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newSearch.min_price}
                      onChange={(e) => setNewSearch({ ...newSearch, min_price: e.target.value })}
                      className="bg-[#121212] border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Preț maxim (RON)</label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={newSearch.max_price}
                      onChange={(e) => setNewSearch({ ...newSearch, max_price: e.target.value })}
                      className="bg-[#121212] border-white/10 text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Frecvență alerte</label>
                  <Select
                    value={newSearch.alert_frequency}
                    onValueChange={(value) => setNewSearch({ ...newSearch, alert_frequency: value })}
                  >
                    <SelectTrigger className="bg-[#121212] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-white/10">
                      <SelectItem value="instant">Instant (la fiecare anunț nou)</SelectItem>
                      <SelectItem value="daily">Zilnic (rezumat)</SelectItem>
                      <SelectItem value="weekly">Săptămânal (rezumat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Anulează</Button>
                <Button 
                  onClick={handleCreateSearch} 
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  {creating ? "Se salvează..." : "Salvează căutarea"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Saved Searches List */}
        {savedSearches.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#0A0A0A] border border-white/5">
            <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Nicio căutare salvată</h2>
            <p className="text-slate-400 mb-6">
              Creează o căutare salvată pentru a primi alerte când apar anunțuri noi
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Creează prima căutare
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedSearches.map((search) => (
              <div 
                key={search.search_id}
                className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
                data-testid={`saved-search-${search.search_id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white">{search.name}</h3>
                      {search.new_ads_count > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {search.new_ads_count} noi
                        </span>
                      )}
                      {search.is_active ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                          <BellRing className="w-3 h-3" />
                          Activ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                          Inactiv
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      {search.category_id && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {CATEGORIES.find(c => c.id === search.category_id)?.name || search.category_id}
                        </span>
                      )}
                      {search.city_id && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {cities.find(c => c.id === search.city_id)?.name || search.city_id}
                        </span>
                      )}
                      {search.search_query && (
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          "{search.search_query}"
                        </span>
                      )}
                      {(search.min_price || search.max_price) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {search.min_price ? `${search.min_price.toLocaleString()} RON` : "0"} - {search.max_price ? `${search.max_price.toLocaleString()} RON` : "∞"}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getFrequencyLabel(search.alert_frequency)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/saved-searches/${search.search_id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <Eye className="w-4 h-4 mr-1" />
                        Vezi rezultate
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={search.is_active ? "text-green-400 hover:text-green-300" : "text-slate-400 hover:text-white"}
                      onClick={() => handleToggleAlert(search)}
                    >
                      {search.is_active ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(search.search_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Info Box */}
        <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-white mb-1">Cum funcționează alertele?</h4>
              <p className="text-sm text-slate-400">
                Vei primi email-uri cu anunțuri noi care se potrivesc criteriilor tale. 
                Poți alege să primești notificări instant, zilnic sau săptămânal.
                Dezactivează alertele oricând fără a șterge căutarea.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
