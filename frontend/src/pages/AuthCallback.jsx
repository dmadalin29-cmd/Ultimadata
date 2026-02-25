import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    processAuth();
  }, []);

  const processAuth = async () => {
    // Extract session_id from URL hash
    const hash = window.location.hash;
    const sessionIdMatch = hash.match(/session_id=([^&]+)/);
    
    if (!sessionIdMatch) {
      toast.error("Autentificare eșuată");
      navigate("/auth");
      return;
    }

    const sessionId = sessionIdMatch[1];

    try {
      // Send session_id to backend to process
      const response = await axios.post(
        `${API_URL}/api/auth/google-session`,
        { session_id: sessionId },
        { withCredentials: true }
      );

      // Update auth context
      login(response.data);
      
      toast.success("Autentificare reușită!");
      
      // Navigate to profile with user data
      navigate("/profile", { 
        replace: true,
        state: { user: response.data }
      });
    } catch (error) {
      console.error("Auth callback error:", error);
      toast.error("Eroare la autentificare");
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Se procesează autentificarea...</p>
      </div>
    </div>
  );
}
