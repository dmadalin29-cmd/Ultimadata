import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../App";
import { useNotifications } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { 
  Search, 
  Plus, 
  User, 
  LogOut, 
  Settings, 
  Menu, 
  X,
  ChevronDown,
  Heart,
  MessageCircle,
  BarChart3,
  Bell,
  Download,
  Sun,
  Moon,
  BellRing,
  Award,
  Users,
  TrendingUp,
  Map,
  Globe,
  Scale,
  Gift
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { permission, canInstallPWA, installPWA, requestPermission, unreadCount } = useNotifications();
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, languages, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  // Combine local unread with context unread
  const totalUnread = unreadMessages + (unreadCount || 0);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/unread-count`, {
        withCredentials: true
      });
      setUnreadMessages(response.data.unread_count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/all?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">X</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-white">X67</span>
              <span className="text-xs text-slate-500 block -mt-1">Digital Media</span>
            </div>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută anunțuri..."
                className="w-full h-12 pl-12 pr-4 bg-[#121212] border border-white/10 rounded-full text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                data-testid="search-input"
              />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Quick Links for logged in users */}
            {user && (
              <>
                <Link 
                  to="/favorites" 
                  className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
                  title="Favorite"
                >
                  <Heart className="w-5 h-5" />
                </Link>
                <Link 
                  to="/compare" 
                  className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Compară anunțuri"
                  data-testid="compare-link"
                >
                  <Scale className="w-5 h-5" />
                </Link>
                <Link 
                  to="/offers" 
                  className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-amber-400 transition-colors"
                  title="Ofertele mele"
                  data-testid="offers-link"
                >
                  <Gift className="w-5 h-5" />
                </Link>
                <Link 
                  to="/messages" 
                  className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-blue-400 transition-colors relative"
                  title="Mesaje"
                >
                  <MessageCircle className="w-5 h-5" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/dashboard" 
                  className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors"
                  title="Dashboard"
                >
                  <BarChart3 className="w-5 h-5" />
                </Link>
              </>
            )}

            {/* Map Link - visible for all users on all devices */}
            <Link 
              to="/map" 
              className="flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-purple-400 transition-colors"
              title={t('map')}
              data-testid="map-link"
            >
              <Map className="w-5 h-5" />
            </Link>

            {/* Language Selector - visible on all devices */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-white transition-colors"
                  data-testid="language-selector"
                >
                  <Globe className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0A0A0A] border-white/10 min-w-[120px]">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`cursor-pointer ${language === lang.code ? 'bg-blue-500/20 text-blue-400' : 'text-white'}`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Post Ad Button */}
            <Link to={user ? "/create-ad" : "/auth"}>
              <Button 
                className="hidden sm:flex h-11 px-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300"
                data-testid="post-ad-btn"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('createAd')}
              </Button>
            </Link>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 h-11 px-3 rounded-full hover:bg-white/5"
                    data-testid="user-menu-btn"
                  >
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="hidden md:block text-white text-sm">{user.name}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-[#0A0A0A] border-white/10"
                >
                  <DropdownMenuItem 
                    onClick={() => navigate("/dashboard")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t('dashboard')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                    data-testid="profile-menu-item"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {t('profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/favorites")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    {t('favorites')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/messages")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t('messages')} {totalUnread > 0 && `(${totalUnread})`}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/price-alerts")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <BellRing className="w-4 h-4 mr-2" />
                    {t('priceAlerts')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={() => navigate("/seller-dashboard")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                    data-testid="seller-dashboard-menu-item"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t('sellerStats')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/loyalty")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                    data-testid="loyalty-menu-item"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    {t('loyaltyPoints')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/referral")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                    data-testid="referral-menu-item"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {t('referralProgram')}
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem 
                      onClick={() => navigate("/admin")}
                      className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                      data-testid="admin-menu-item"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={() => navigate("/settings")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                    data-testid="settings-menu-item"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t('settings')}
                  </DropdownMenuItem>
                  {permission !== 'granted' && (
                    <DropdownMenuItem 
                      onClick={requestPermission}
                      className="cursor-pointer text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      {t('enableNotifications')}
                    </DropdownMenuItem>
                  )}
                  {canInstallPWA && (
                    <DropdownMenuItem 
                      onClick={installPWA}
                      className="cursor-pointer text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('installApp')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    data-testid="logout-menu-item"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button 
                  variant="ghost" 
                  className="h-11 px-5 rounded-full hover:bg-white/5 text-slate-300"
                  data-testid="login-btn"
                >
                  {t('login')}
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-full hover:bg-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/5 animate-slideDown">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full h-12 pl-12 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  data-testid="mobile-search-input"
                />
              </div>
            </form>
            
            {/* Mobile Quick Links */}
            <div className="flex items-center gap-2 mb-4">
              <Link 
                to="/map"
                className="flex-1 flex items-center justify-center gap-2 h-12 bg-[#121212] border border-white/10 rounded-xl text-slate-300 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Map className="w-5 h-5" />
                <span>{t('map')}</span>
              </Link>
              
              {/* Language Selector Mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center gap-2 h-12 px-4 bg-[#121212] border border-white/10 rounded-xl text-slate-300 hover:text-white hover:border-white/20 transition-colors">
                    <Globe className="w-5 h-5" />
                    <span>{language === 'ro' ? '🇷🇴' : '🇬🇧'}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#0A0A0A] border-white/10 min-w-[120px]">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`cursor-pointer ${language === lang.code ? 'bg-blue-500/20 text-blue-400' : 'text-white'}`}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <Link 
              to={user ? "/create-ad" : "/auth"}
              className="block"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium">
                <Plus className="w-5 h-5 mr-2" />
                {t('createAd')}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
