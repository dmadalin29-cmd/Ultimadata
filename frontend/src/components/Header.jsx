import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../App";
import { useNotifications } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
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
  BellRing
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { permission, canInstallPWA, installPWA, requestPermission, unreadCount } = useNotifications();
  const { theme, toggleTheme, isDark } = useTheme();
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
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center text-slate-400 hover:text-yellow-400 transition-colors"
              title={isDark ? "Mod luminos" : "Mod întunecat"}
              data-testid="theme-toggle-btn"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
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

            {/* Post Ad Button */}
            <Link to={user ? "/create-ad" : "/auth"}>
              <Button 
                className="hidden sm:flex h-11 px-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300"
                data-testid="post-ad-btn"
              >
                <Plus className="w-5 h-5 mr-2" />
                Adaugă Anunț
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
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                    data-testid="profile-menu-item"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profilul Meu
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/favorites")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Favorite
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/messages")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Mesaje {totalUnread > 0 && `(${totalUnread})`}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate("/price-alerts")}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <BellRing className="w-4 h-4 mr-2" />
                    Alerte de Preț
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
                    onClick={toggleTheme}
                    className="cursor-pointer text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                  >
                    {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    {isDark ? "Mod luminos" : "Mod întunecat"}
                  </DropdownMenuItem>
                  {permission !== 'granted' && (
                    <DropdownMenuItem 
                      onClick={requestPermission}
                      className="cursor-pointer text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Activează notificările
                    </DropdownMenuItem>
                  )}
                  {canInstallPWA && (
                    <DropdownMenuItem 
                      onClick={installPWA}
                      className="cursor-pointer text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Instalează aplicația
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    data-testid="logout-menu-item"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Deconectare
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
                  Autentificare
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
                  placeholder="Caută anunțuri..."
                  className="w-full h-12 pl-12 pr-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  data-testid="mobile-search-input"
                />
              </div>
            </form>
            <Link 
              to={user ? "/create-ad" : "/auth"}
              className="block"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium">
                <Plus className="w-5 h-5 mr-2" />
                Adaugă Anunț
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
