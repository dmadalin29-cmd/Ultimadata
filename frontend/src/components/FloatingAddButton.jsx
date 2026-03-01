import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function FloatingAddButton() {
  return (
    <Link 
      to="/create-ad"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden"
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
