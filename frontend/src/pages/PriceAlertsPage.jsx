import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { 
  Bell, 
  Plus, 
  Trash2, 
  Search,
  MapPin,
  Tag,
  Euro,
  ChevronRight,
  BellOff,
  Loader2
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PriceAlertsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [alerts, setAlerts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingMatches, setCheckingMatches] = useState(null);
  const [matches, setMatches] = useState({});
  
  const [formData, setFormData] = useState({
    category_id: "",
    city_id: "",
    max_price: "",
    keywords: ""
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [alertsRes, catsRes, citiesRes] = await Promise.all([
        axios.get(`${API_URL}/api/price-alerts`, { withCredentials: true }),
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/cities`)
      ]);
      setAlerts(alertsRes.data.alerts || []);
      setCategories(catsRes.data || []);
      setCities(citiesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category_id || !formData.max_price) {
      toast.error("Completează categoria și prețul maxim");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/price-alerts`,
        {
          category_id: formData.category_id,
          city_id: formData.city_id || null,
          max_price: parseFloat(formData.max_price),
          keywords: formData.keywords || null
        },
        { withCredentials: true }
      );
      
      toast.success("Alertă creată cu succes!");
      setShowForm(false);
      setFormData({ category_id: "", city_id: "", max_price: "", keywords: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la crearea alertei");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm("Ești sigur că vrei să ștergi această alertă?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/price-alerts/${alertId}`, {
        withCredentials: true
      });
      toast.success("Alertă ștearsă");
      setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
    } catch (error) {
      toast.error("Eroare la ștergere");
    }
  };

  const handleToggle = async (alertId) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/price-alerts/${alertId}/toggle`,
        {},
        { withCredentials: true }
      );
      setAlerts(prev => prev.map(a => 
        a.alert_id === alertId ? { ...a, is_active: response.data.is_active } : a
      ));
    } catch (error) {
      toast.error("Eroare la actualizare");
    }
  };

  const handleCheckMatches = async (alertId) => {
    setCheckingMatches(alertId);
    try {
      const response = await axios.get(
        `${API_URL}/api/price-alerts/check-matches/${alertId}`,
        { withCredentials: true }
      );
      setMatches(prev => ({ ...prev, [alertId]: response.data.matches }));
    } catch (error) {
      toast.error("Eroare la verificare");
    } finally {
      setCheckingMatches(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="price-alerts-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-500" />
              Alertele Mele de Preț
            </h1>
            <p className="text-slate-400 mt-2">
              Primești notificări când apar anunțuri sub prețul dorit
            </p>
          </div>
          
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500"
              data-testid="new-alert-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Alertă nouă
            </Button>
          )}
        </div>

        {/* Create Alert Form */}
        {showForm && (
          <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Creează o alertă nouă</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Categorie *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white"
                    required
                  >
                    <option value="">Selectează categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Oraș (opțional)
                  </label>
                  <select
                    value={formData.city_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, city_id: e.target.value }))}
                    className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white"
                  >
                    <option value="">Toate orașele</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Preț maxim (€) *
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="number"
                      value={formData.max_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_price: e.target.value }))}
                      placeholder="ex: 5000"
                      className="h-12 pl-12 bg-[#121212] border-white/10 text-white"
                      required
                      min="1"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Cuvinte cheie (opțional)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                      placeholder="ex: BMW X5, apartament 2 camere"
                      className="h-12 pl-12 bg-[#121212] border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  Anulează
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Creează alerta
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Alerts List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-[#0A0A0A] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <BellOff className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Nu ai nicio alertă de preț
            </h2>
            <p className="text-slate-400 mb-6">
              Creează o alertă pentru a fi notificat când apar anunțuri potrivite
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Creează prima alertă
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.alert_id}
                className={`bg-[#0A0A0A] rounded-xl p-5 border transition-all ${
                  alert.is_active ? "border-white/5" : "border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ 
                          backgroundColor: `${alert.category_color}20`,
                          color: alert.category_color 
                        }}
                      >
                        {alert.category_name}
                      </span>
                      {alert.city_name && (
                        <span className="flex items-center gap-1 text-sm text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {alert.city_name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Euro className="w-4 h-4" />
                        Max: {alert.max_price.toLocaleString()} €
                      </span>
                      
                      {alert.keywords && (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Tag className="w-4 h-4" />
                          "{alert.keywords}"
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={() => handleToggle(alert.alert_id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(alert.alert_id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Check Matches Button */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCheckMatches(alert.alert_id)}
                    disabled={checkingMatches === alert.alert_id}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    {checkingMatches === alert.alert_id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Vezi anunțuri potrivite
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  
                  {/* Matches */}
                  {matches[alert.alert_id] && (
                    <div className="mt-4">
                      {matches[alert.alert_id].length === 0 ? (
                        <p className="text-slate-500 text-sm">
                          Niciun anunț găsit momentan. Vei fi notificat când apar anunțuri noi.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {matches[alert.alert_id].slice(0, 6).map((ad) => (
                            <a
                              key={ad.ad_id}
                              href={`/ad/${ad.ad_id}`}
                              className="block p-3 bg-[#121212] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                            >
                              <p className="text-white text-sm truncate">{ad.title}</p>
                              <p className="text-emerald-400 text-sm font-medium">
                                {ad.price?.toLocaleString()} €
                              </p>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
