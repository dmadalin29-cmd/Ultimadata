import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function FloatingAddButton() {
  const [bottomOffset, setBottomOffset] = useState(24); // default 24px (bottom-6)

  useEffect(() => {
    // Check for cookie/PWA banners and adjust position
    const checkOverlaps = () => {
      const hasCookieBanner = !localStorage.getItem('cookie_consent');
      const hasPwaBanner = !localStorage.getItem('pwa-banner-dismissed') && 
                          !window.matchMedia('(display-mode: standalone)').matches;
      
      // If banners are visible, move FAB higher (above banners ~200px)
      // Otherwise, position it at a comfortable height above chatbot
      if (hasCookieBanner || hasPwaBanner) {
        setBottomOffset(220); // High enough to clear banners
      } else {
        setBottomOffset(90); // Above chatbot button (which is at bottom-6 = 24px + 56px height)
      }
    };

    checkOverlaps();
    
    // Re-check when localStorage changes
    const handleStorage = () => checkOverlaps();
    window.addEventListener('storage', handleStorage);
    
    // Also check periodically (banners dismiss after timeout)
    const interval = setInterval(checkOverlaps, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <Link 
      to="/create-ad"
      className="fixed left-1/2 -translate-x-1/2 z-[60] sm:hidden transition-all duration-300"
      style={{ bottom: `${bottomOffset}px` }}
      data-testid="floating-add-btn"
    >
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur-lg opacity-60 group-active:opacity-100 transition-opacity"></div>
        
        {/* Button */}
        <button className="relative w-14 h-14 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-all duration-200">
          <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
        </button>
      </div>
    </Link>
  );
}
