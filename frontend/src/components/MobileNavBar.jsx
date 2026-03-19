import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { useNotifications } from "../contexts/NotificationContext";
import { 
  Home, 
  Search, 
  PlusCircle, 
  MessageCircle, 
  User,
  Heart,
  Map,
  Menu,
  X,
  Settings,
  LogOut,
  BarChart3,
  Award,
  Users,
  Bell,
  TrendingUp,
  Scale,
  Gift,
  Globe
} from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export default function MobileNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { language, setLanguage, languages, t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Hide on certain pages
  const hiddenPaths = ['/auth', '/admin', '/create-ad'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  const totalUnread = unreadMessages + (unreadCount || 0);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/all?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
    navigate("/");
  };

  if (shouldHide) return null;

  return (
    <>
      {/* Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-xl sm:hidden animate-in fade-in duration-200">
          <div className="flex flex-col h-full p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Caută</h2>
              <button 
                onClick={() => setShowSearch(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ce cauți azi?"
                  autoFocus
                  className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              
              {/* Quick Categories */}
              <div className="mt-6">
                <p className="text-slate-500 text-sm mb-3">Categorii populare</p>
                <div className="flex flex-wrap gap-2">
                  {['Auto', 'Imobiliare', 'Electronice', 'Locuri de muncă'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSearchQuery(cat);
                      }}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-slate-300 text-sm hover:bg-white/10 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-[90] bg-black/98 backdrop-blur-xl sm:hidden animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col h-full">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-blue-500" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">{user.name?.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold">{user.name}</p>
                      <p className="text-slate-500 text-sm">{user.email}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Vizitator</p>
                      <Link to="/auth" onClick={() => setShowMenu(false)} className="text-blue-400 text-sm">
                        Conectează-te →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowMenu(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {user && (
                <>
                  <MenuLink to="/dashboard" icon={BarChart3} label="Dashboard" onClick={() => setShowMenu(false)} />
                  <MenuLink to="/profile" icon={User} label="Profilul meu" onClick={() => setShowMenu(false)} />
                  <MenuLink to="/favorites" icon={Heart} label="Favorite" onClick={() => setShowMenu(false)} />
                  <MenuLink to="/messages" icon={MessageCircle} label="Mesaje" badge={totalUnread} onClick={() => setShowMenu(false)} />
                  <MenuLink to="/offers" icon={Gift} label="Oferte" onClick={() => setShowMenu(false)} />
                  <MenuLink to="/compare" icon={Scale} label="Compară" onClick={() => setShowMenu(false)} />
                  
                  <div className="h-px bg-white/10 my-4" />
                  
                  <MenuLink to="/seller-dashboard" icon={TrendingUp} label="Statistici vânzător" onClick={() => setShowMenu(false)} />
                  <MenuLink to="/loyalty" icon={Award} label="Puncte fidelitate" onClick={() => setShowMenu(false)} />
                  <MenuLink to="/referral" icon={Users} label="Program referral" onClick={() => setShowMenu(false)} />
                  
                  {user.role === "admin" && (
                    <>
                      <div className="h-px bg-white/10 my-4" />
                      <MenuLink to="/admin" icon={Settings} label="Admin Panel" onClick={() => setShowMenu(false)} />
                    </>
                  )}
                </>
              )}
              
              <div className="h-px bg-white/10 my-4" />
              
              <MenuLink to="/map" icon={Map} label="Hartă" onClick={() => setShowMenu(false)} />
              <MenuLink to="/blog" icon={Bell} label="Blog" onClick={() => setShowMenu(false)} />
              
              {/* Language Selector */}
              <div className="mt-4 p-4 bg-white/5 rounded-2xl">
                <p className="text-slate-500 text-sm mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Limbă
                </p>
                <div className="flex gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        language === lang.code 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-sm">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu Footer */}
            {user && (
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Deconectare
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[80] sm:hidden" data-testid="mobile-nav-bar">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/10" />
        
        {/* Safe area padding for iOS */}
        <div className="relative px-2 pb-safe">
          <div className="flex items-center justify-around h-16">
            {/* Home */}
            <NavItem 
              to="/" 
              icon={Home} 
              label="Acasă" 
              isActive={isActive('/')} 
            />
            
            {/* Search */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all"
              data-testid="nav-search-btn"
            >
              <Search className="w-6 h-6 text-slate-400" />
              <span className="text-[10px] mt-1 text-slate-500">Caută</span>
            </button>
            
            {/* Add - Center button */}
            <Link
              to={user ? "/create-ad" : "/auth"}
              className="relative -mt-6"
              data-testid="nav-add-btn"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-50" />
                {/* Button */}
                <div className="relative w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                  <PlusCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
            
            {/* Messages */}
            <NavItem 
              to={user ? "/messages" : "/auth"} 
              icon={MessageCircle} 
              label="Mesaje" 
              isActive={isActive('/messages')}
              badge={totalUnread}
            />
            
            {/* Menu */}
            <button
              onClick={() => setShowMenu(true)}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all"
              data-testid="nav-menu-btn"
            >
              <Menu className="w-6 h-6 text-slate-400" />
              <span className="text-[10px] mt-1 text-slate-500">Meniu</span>
            </button>
          </div>
        </div>
      </nav>
      
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-20 sm:hidden" />
    </>
  );
}

// Navigation Item Component
function NavItem({ to, icon: Icon, label, isActive, badge }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
        isActive ? 'bg-white/10' : ''
      }`}
    >
      <div className="relative">
        <Icon className={`w-6 h-6 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] mt-1 ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
        {label}
      </span>
    </Link>
  );
}

// Menu Link Component  
function MenuLink({ to, icon: Icon, label, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-300" />
      </div>
      <span className="text-white font-medium flex-1">{label}</span>
      {badge > 0 && (
        <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs">
          {badge}
        </span>
      )}
    </Link>
  );
}
