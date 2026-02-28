import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { useState, useEffect, createContext, useContext } from "react";
import axios from "axios";

// Pages
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import AdDetailPage from "./pages/AdDetailPage";
import CreateAdPage from "./pages/CreateAdPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import PaymentCallback from "./pages/PaymentCallback";
import AdminPage from "./pages/AdminPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import FAQPage from "./pages/FAQPage";
import FavoritesPage from "./pages/FavoritesPage";
import MessagesPage from "./pages/MessagesPage";
import DashboardPage from "./pages/DashboardPage";
import SellerProfilePage from "./pages/SellerProfilePage";
import PriceAlertsPage from "./pages/PriceAlertsPage";
import SavedSearchesPage from "./pages/SavedSearchesPage";
import VerificationPage from "./pages/VerificationPage";
import ComparePage from "./pages/ComparePage";
import OffersPage from "./pages/OffersPage";
import SellerDashboardPage from "./pages/SellerDashboardPage";
import LoyaltyPage from "./pages/LoyaltyPage";
import ReferralPage from "./pages/ReferralPage";
import PromotePage from "./pages/PromotePage";
import BlogPage from "./pages/BlogPage";
import StoriesPage from "./pages/StoriesPage";
import ForumPage from "./pages/ForumPage";
import EscrowPage from "./pages/EscrowPage";
import SettingsPage from "./pages/SettingsPage";
import MapPage from "./pages/MapPage";

// PWA & Notifications
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import PWAPrompt from "./components/PWAPrompt";
import ChatbotWidget from "./components/ChatbotWidget";
import CookieConsent from "./components/CookieConsent";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  
  return null;
}

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

// Admin Route
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

// App Router with session_id detection
function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id - MUST be synchronous during render
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/category/:categoryId" element={<CategoryPage />} />
      <Route path="/ad/:adId" element={<AdDetailPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/payment/callback" element={<PaymentCallback />} />
      <Route
        path="/create-ad"
        element={
          <ProtectedRoute>
            <CreateAdPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="/termeni-si-conditii" element={<TermsPage />} />
      <Route path="/politica-confidentialitate" element={<PrivacyPage />} />
      <Route path="/intrebari-frecvente" element={<FAQPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages/:conversationId"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/seller/:sellerId" element={<SellerProfilePage />} />
      <Route
        path="/price-alerts"
        element={
          <ProtectedRoute>
            <PriceAlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved-searches"
        element={
          <ProtectedRoute>
            <SavedSearchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved-searches/:searchId"
        element={
          <ProtectedRoute>
            <SavedSearchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verification"
        element={
          <ProtectedRoute>
            <VerificationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compare"
        element={<ComparePage />}
      />
      <Route
        path="/offers"
        element={
          <ProtectedRoute>
            <OffersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller-dashboard"
        element={
          <ProtectedRoute>
            <SellerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty"
        element={
          <ProtectedRoute>
            <LoyaltyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referral"
        element={
          <ProtectedRoute>
            <ReferralPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/promote"
        element={
          <ProtectedRoute>
            <PromotePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/escrow"
        element={
          <ProtectedRoute>
            <EscrowPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:postId" element={<BlogPage />} />
      <Route path="/stories" element={<StoriesPage />} />
      <Route path="/forum" element={<ForumPage />} />
      <Route path="/forum/:threadId" element={<ForumPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <ScrollToTop />
              <div className="min-h-screen bg-[#050505]">
                <AppRouter />
                <Toaster position="top-right" richColors />
                <PWAPrompt />
                <ChatbotWidget />
                <CookieConsent />
              </div>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
