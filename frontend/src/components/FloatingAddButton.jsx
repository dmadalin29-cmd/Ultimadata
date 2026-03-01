import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

export default function FloatingAddButton() {
  const location = useLocation();
  const [bottomOffset, setBottomOffset] = useState(24); // default 24px (bottom-6)

  // Hide FAB on certain pages
  const hiddenPaths = ['/auth', '/create-ad', '/admin', '/messages', '/settings'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    // Check for cookie/PWA banners and adjust position
    const checkOverlaps = () => {
      const hasCookieBanner = !localStorage.getItem('cookie_consent');
      const hasPwaBanner = !localStorage.getItem('pwa-banner-dismissed') && 
                          !window.matchMedia('(display-mode: standalone)').matches;
      
      // If banners are visible, move FAB higher (above banners ~420px for cookie banner)
      // Otherwise, position it at a comfortable height above chatbot
      if (hasCookieBanner) {
        setBottomOffset(420); // Cookie banner is tall, need more space
      } else if (hasPwaBanner) {
        setBottomOffset(180); // PWA banner is shorter
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

  // Don't render on hidden pages
  if (shouldHide) return null;

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
