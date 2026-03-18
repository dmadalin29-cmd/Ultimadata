import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Calendar, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

export default function AgeVerificationModal({ isOpen, onConfirm, onCancel }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Save confirmation in localStorage
    localStorage.setItem('age_verified_18plus', 'true');
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
    navigate('/');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md transform transition-all duration-500 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-3xl blur-lg opacity-50 animate-pulse" />
        
        {/* Card */}
        <div className="relative bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden">
          {/* Header with icon */}
          <div className="relative pt-8 pb-4 px-6 text-center">
            {/* Animated shield icon */}
            <div className="relative mx-auto w-20 h-20 mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                <ShieldAlert className="w-10 h-10 text-red-400" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              Conținut pentru Adulți
            </h2>
            <p className="text-slate-400 text-sm">
              Această secțiune conține materiale destinate exclusiv persoanelor cu vârsta de peste 18 ani.
            </p>
          </div>

          {/* Age confirmation */}
          <div className="px-6 py-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Verificare vârstă</p>
                  <p className="text-slate-500 text-xs">Trebuie să ai minim 18 ani</p>
                </div>
              </div>
              
              <p className="text-slate-300 text-sm leading-relaxed">
                Prin continuare, confirm că am împlinit vârsta de <span className="text-red-400 font-bold">18 ani</span> și înțeleg natura conținutului acestei secțiuni.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="px-6 pb-6 pt-2 space-y-3">
            <Button
              onClick={handleConfirm}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25"
              data-testid="age-verify-confirm"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Da, am peste 18 ani
            </Button>
            
            <Button
              onClick={handleCancel}
              variant="ghost"
              className="w-full h-12 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
              data-testid="age-verify-cancel"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Nu, înapoi la pagina principală
            </Button>
          </div>

          {/* Legal disclaimer */}
          <div className="px-6 pb-6">
            <p className="text-[10px] text-slate-600 text-center leading-relaxed">
              Accesarea acestui conținut fără a avea vârsta legală de 18 ani este interzisă. 
              X67 Digital Media nu își asumă responsabilitatea pentru accesul neautorizat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
