import { useState, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from './ui/button';
import { X, Download, Bell, Smartphone } from 'lucide-react';

export default function PWAPrompt() {
  const { 
    isSupported, 
    permission, 
    canInstallPWA, 
    isPWAInstalled,
    requestPermission, 
    installPWA 
  } = useNotifications();
  
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed banner before
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      setBannerDismissed(true);
      return;
    }

    // Show banner after 3 seconds if PWA can be installed or notifications not enabled
    const timer = setTimeout(() => {
      if ((canInstallPWA || (isSupported && permission !== 'granted')) && !isPWAInstalled) {
        setShowBanner(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [canInstallPWA, isSupported, permission, isPWAInstalled]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
    setBannerDismissed(true);
  };

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      setShowBanner(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted && !canInstallPWA) {
      setShowBanner(false);
    }
  };

  if (!showBanner || bannerDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 shadow-2xl border border-white/10">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/60 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg mb-1">
              Instalează X67
            </h3>
            <p className="text-white/80 text-sm mb-3">
              Adaugă aplicația pe telefon pentru acces rapid și notificări instant!
            </p>
            
            <div className="flex flex-wrap gap-2">
              {canInstallPWA && (
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-white text-blue-600 hover:bg-white/90 font-medium"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Instalează
                </Button>
              )}
              
              {isSupported && permission !== 'granted' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnableNotifications}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  Notificări
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
