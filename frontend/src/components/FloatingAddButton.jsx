import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../App";

export default function FloatingAddButton() {
  const { user } = useAuth();
  
  return (
    <Link 
      to={user ? "/create-ad" : "/auth"}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden"
      data-testid="floating-add-btn"
    >
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity animate-pulse"></div>
        
        {/* Button */}
        <button className="relative w-14 h-14 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110">
          <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
        </button>
      </div>
    </Link>
  );
}
