import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Cookie, X, Settings } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user already accepted cookies
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show banner after a small delay
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie_consent', JSON.stringify(allAccepted));
    setShowBanner(false);
  };

  const acceptSelected = () => {
    const selected = {
      ...preferences,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie_consent', JSON.stringify(selected));
    setShowBanner(false);
  };

  const declineAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie_consent', JSON.stringify(onlyNecessary));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {!showSettings ? (
          // Main Banner
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl">
                <Cookie className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  🍪 Folosim cookie-uri
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Utilizăm cookie-uri pentru a-ți oferi cea mai bună experiență pe site-ul nostru. 
                  Cookie-urile ne ajută să înțelegem cum folosești site-ul și să îl îmbunătățim continuu.
                  <Link to="/cookies" className="text-blue-400 hover:text-blue-300 ml-1">
                    Află mai multe
                  </Link>
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={acceptAll}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6"
                  >
                    Acceptă toate
                  </Button>
                  <Button
                    onClick={declineAll}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/5"
                  >
                    Doar esențiale
                  </Button>
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Personalizează
                  </Button>
                </div>
              </div>
              <button
                onClick={declineAll}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          // Settings Panel
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Setări Cookie-uri</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="font-medium text-white">Cookie-uri esențiale</h4>
                  <p className="text-sm text-slate-400">Necesare pentru funcționarea site-ului</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
                  Întotdeauna active
                </div>
              </div>
              
              {/* Analytics Cookies */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="font-medium text-white">Cookie-uri analitice</h4>
                  <p className="text-sm text-slate-400">Ne ajută să înțelegem cum folosești site-ul</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {/* Marketing Cookies */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <h4 className="font-medium text-white">Cookie-uri de marketing</h4>
                  <p className="text-sm text-slate-400">Pentru reclame personalizate</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={acceptSelected}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white flex-1"
              >
                Salvează preferințele
              </Button>
              <Button
                onClick={acceptAll}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5"
              >
                Acceptă toate
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
