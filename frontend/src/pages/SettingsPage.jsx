import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Settings, Bell, MessageCircle, Phone, Mail,
  Save, User, Shield, Smartphone
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    phone: "",
    notification_settings: {
      email_messages: true,
      email_offers: true,
      whatsapp_messages: true,
      whatsapp_offers: true
    }
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
      setUser(res.data);
      setForm({
        name: res.data.name || "",
        phone: res.data.phone || "",
        notification_settings: res.data.notification_settings || {
          email_messages: true,
          email_offers: true,
          whatsapp_messages: true,
          whatsapp_offers: true
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/auth/profile`, form, { withCredentials: true });
      toast.success("Setările au fost salvate!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = (key) => {
    setForm({
      ...form,
      notification_settings: {
        ...form.notification_settings,
        [key]: !form.notification_settings[key]
      }
    });
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
    <div className="min-h-screen bg-[#050505]" data-testid="settings-page">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Settings className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Setări</h1>
            <p className="text-slate-400">Gestionează-ți profilul și notificările</p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-400" />
            Profil
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Nume</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                placeholder="Numele tău"
              />
            </div>
            
            <div>
              <label className="text-slate-400 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-slate-500 cursor-not-allowed"
              />
              <p className="text-slate-600 text-xs mt-1">Email-ul nu poate fi schimbat</p>
            </div>
            
            <div>
              <label className="text-slate-400 text-sm mb-1 block flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Număr de Telefon (pentru WhatsApp)
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                placeholder="+40 7XX XXX XXX"
              />
              <p className="text-slate-600 text-xs mt-1">Folosit pentru notificări WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-yellow-400" />
            Notificări
          </h2>
          
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="pb-4 border-b border-white/5">
              <h3 className="text-slate-300 text-sm font-medium flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4" />
                Email
              </h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-400">Mesaje noi</span>
                  <button
                    onClick={() => toggleNotification("email_messages")}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      form.notification_settings.email_messages ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      form.notification_settings.email_messages ? "translate-x-6" : "translate-x-0.5"
                    }`} />
                  </button>
                </label>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-400">Oferte noi</span>
                  <button
                    onClick={() => toggleNotification("email_offers")}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      form.notification_settings.email_offers ? "bg-blue-600" : "bg-slate-700"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      form.notification_settings.email_offers ? "translate-x-6" : "translate-x-0.5"
                    }`} />
                  </button>
                </label>
              </div>
            </div>
            
            {/* WhatsApp Notifications */}
            <div>
              <h3 className="text-slate-300 text-sm font-medium flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4" />
                WhatsApp
              </h3>
              
              {!form.phone && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                  <p className="text-yellow-400 text-sm">
                    Adaugă numărul de telefon pentru a primi notificări WhatsApp
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-400">Mesaje noi</span>
                  <button
                    onClick={() => toggleNotification("whatsapp_messages")}
                    disabled={!form.phone}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      form.notification_settings.whatsapp_messages && form.phone ? "bg-green-600" : "bg-slate-700"
                    } ${!form.phone ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      form.notification_settings.whatsapp_messages && form.phone ? "translate-x-6" : "translate-x-0.5"
                    }`} />
                  </button>
                </label>
                
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-400">Oferte noi</span>
                  <button
                    onClick={() => toggleNotification("whatsapp_offers")}
                    disabled={!form.phone}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      form.notification_settings.whatsapp_offers && form.phone ? "bg-green-600" : "bg-slate-700"
                    } ${!form.phone ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      form.notification_settings.whatsapp_offers && form.phone ? "translate-x-6" : "translate-x-0.5"
                    }`} />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 h-12"
        >
          {saving ? "Se salvează..." : "Salvează Modificările"}
          <Save className="w-5 h-5 ml-2" />
        </Button>
      </main>
      
      <Footer />
    </div>
  );
}
