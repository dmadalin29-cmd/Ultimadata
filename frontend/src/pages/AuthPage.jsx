import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, ArrowLeft, KeyRound } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    newPassword: "",
    confirmPassword: ""
  });

  const from = location.state?.from?.pathname || "/";
  
  // Check for reset token in URL
  useEffect(() => {
    const token = searchParams.get("reset_token");
    if (token) {
      setResetToken(token);
      setIsResetPassword(true);
      setIsForgotPassword(false);
      setIsLogin(true);
    }
  }, [searchParams]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await axios.post(
        `${API_URL}${endpoint}`,
        isLogin 
          ? { email: formData.email, password: formData.password }
          : formData,
        { withCredentials: true }
      );

      login(response.data);
      toast.success(isLogin ? "Autentificare reușită!" : "Cont creat cu succes!");
      navigate(from, { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || "A apărut o eroare";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/forgot-password`,
        { email: formData.email }
      );
      toast.success(response.data.message);
      setIsForgotPassword(false);
      setFormData(prev => ({ ...prev, email: "" }));
    } catch (error) {
      const message = error.response?.data?.detail || "A apărut o eroare";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Parolele nu coincid");
      return;
    }
    
    if (formData.newPassword.length < 5) {
      toast.error("Parola trebuie să aibă cel puțin 5 caractere");
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/reset-password`,
        { token: resetToken, new_password: formData.newPassword }
      );
      toast.success(response.data.message);
      setIsResetPassword(false);
      setResetToken("");
      setFormData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
      // Remove token from URL
      navigate("/auth", { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || "A apărut o eroare";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/profile";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex" data-testid="auth-page">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">X</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-white">X67</span>
              <span className="text-xs text-slate-500 block -mt-1">Digital Media Groupe</span>
            </div>
          </Link>

          {/* Reset Password Form */}
          {isResetPassword ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Resetează parola</h1>
              <p className="text-slate-400 mb-8">Introdu noua ta parolă</p>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Parolă nouă</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange("newPassword", e.target.value)}
                      placeholder="••••••••"
                      className="h-12 pl-12 pr-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                      required
                      minLength={5}
                      data-testid="new-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Confirmă parola</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      placeholder="••••••••"
                      className="h-12 pl-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                      required
                      minLength={5}
                      data-testid="confirm-password-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  data-testid="reset-password-btn"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Resetează parola
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              
              <button
                onClick={() => {
                  setIsResetPassword(false);
                  setResetToken("");
                  navigate("/auth", { replace: true });
                }}
                className="flex items-center gap-2 text-slate-400 hover:text-white mt-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Înapoi la autentificare
              </button>
            </>
          ) : isForgotPassword ? (
            /* Forgot Password Form */
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Ai uitat parola?</h1>
              <p className="text-slate-400 mb-8">Introdu adresa de email pentru a primi un link de resetare</p>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="email@exemplu.com"
                      className="h-12 pl-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                      required
                      data-testid="forgot-email-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  data-testid="forgot-submit-btn"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Trimite link de resetare
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              
              <button
                onClick={() => setIsForgotPassword(false)}
                className="flex items-center gap-2 text-slate-400 hover:text-white mt-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Înapoi la autentificare
              </button>
            </>
          ) : (
            /* Login/Register Form */
            <>
              {/* Title */}
              <h1 className="text-3xl font-bold text-white mb-2">
                {isLogin ? "Bine ai revenit!" : "Creează un cont"}
              </h1>
              <p className="text-slate-400 mb-8">
                {isLogin 
                  ? "Intră în cont pentru a continua" 
                  : "Înregistrează-te pentru a posta anunțuri"
                }
              </p>

              {/* Google Login */}
              <Button
                variant="outline"
                className="w-full h-12 mb-6 border-white/10 text-white hover:bg-white/5"
                onClick={handleGoogleLogin}
                data-testid="google-login-btn"
              >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuă cu Google
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#050505] text-slate-500">sau</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Nume</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Numele tău"
                    className="h-12 pl-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                    required={!isLogin}
                    data-testid="name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="email@exemplu.com"
                  className="h-12 pl-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-slate-400">Parolă</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-blue-500 hover:text-blue-400"
                    data-testid="forgot-password-link"
                  >
                    Ai uitat parola?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-12 pr-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                  required
                  minLength={5}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              data-testid="submit-auth-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Autentificare" : "Creează cont"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-slate-400 mt-6">
            {isLogin ? "Nu ai cont?" : "Ai deja cont?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-500 hover:text-blue-400 font-medium"
              data-testid="toggle-auth-btn"
            >
              {isLogin ? "Înregistrează-te" : "Autentifică-te"}
            </button>
          </p>
            </>
          )}
        </div>
      </div>

      {/* Right side - Hero Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1585756511089-4d495bb55a11?w=1200&h=1600&fit=crop"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 p-12 z-20">
          <h2 className="text-4xl font-bold text-white mb-4">
            Cea mai modernă platformă de anunțuri
          </h2>
          <p className="text-slate-300 text-lg">
            Vinde rapid, cumpără sigur. Alătură-te comunității X67.
          </p>
        </div>
      </div>
    </div>
  );
}
