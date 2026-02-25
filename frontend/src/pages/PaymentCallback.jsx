import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Check, X, Clock, ArrowRight } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    const orderCode = searchParams.get("s") || searchParams.get("orderCode");
    const transactionId = searchParams.get("t");
    
    if (!orderCode) {
      setStatus("error");
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/payments/verify/${orderCode}`,
        { withCredentials: true }
      );
      
      setPaymentData(response.data);
      
      if (response.data.status === "completed") {
        setStatus("success");
      } else if (response.data.status === "pending") {
        setStatus("pending");
      } else {
        setStatus("failed");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setStatus("error");
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case "success":
        return {
          icon: <Check className="w-16 h-16 text-emerald-500" />,
          title: "Plată reușită!",
          message: "Mulțumim pentru plată. Anunțul tău va fi activat după aprobare.",
          bgColor: "bg-emerald-500/10 border-emerald-500/20"
        };
      case "pending":
        return {
          icon: <Clock className="w-16 h-16 text-yellow-500" />,
          title: "Plată în procesare",
          message: "Plata ta este în curs de procesare. Te vom notifica când va fi confirmată.",
          bgColor: "bg-yellow-500/10 border-yellow-500/20"
        };
      case "failed":
        return {
          icon: <X className="w-16 h-16 text-red-500" />,
          title: "Plată eșuată",
          message: "Din păcate, plata nu a putut fi procesată. Te rugăm să încerci din nou.",
          bgColor: "bg-red-500/10 border-red-500/20"
        };
      case "error":
        return {
          icon: <X className="w-16 h-16 text-red-500" />,
          title: "Eroare",
          message: "A apărut o eroare la verificarea plății.",
          bgColor: "bg-red-500/10 border-red-500/20"
        };
      default:
        return {
          icon: <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />,
          title: "Se verifică plata...",
          message: "Te rugăm să aștepți câteva secunde.",
          bgColor: "bg-blue-500/10 border-blue-500/20"
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4" data-testid="payment-callback-page">
      <div className="max-w-md w-full">
        <div className={`rounded-2xl border p-8 text-center ${content.bgColor}`}>
          <div className="flex justify-center mb-6">
            {content.icon}
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-3">
            {content.title}
          </h1>
          
          <p className="text-slate-400 mb-6">
            {content.message}
          </p>

          {paymentData && (
            <div className="mb-6 p-4 rounded-xl bg-[#050505] text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tip plată:</span>
                <span className="text-white">
                  {paymentData.payment_type === "post_ad" && "Publicare anunț"}
                  {paymentData.payment_type === "boost" && "Ridicare anunț"}
                  {paymentData.payment_type === "promote" && "Promovare anunț"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status:</span>
                <span className={`font-medium ${
                  paymentData.status === "completed" ? "text-emerald-400" :
                  paymentData.status === "pending" ? "text-yellow-400" : "text-red-400"
                }`}>
                  {paymentData.status === "completed" && "Completat"}
                  {paymentData.status === "pending" && "În așteptare"}
                  {paymentData.status === "failed" && "Eșuat"}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link to="/" className="flex-1">
              <Button 
                variant="outline" 
                className="w-full border-white/10 text-white hover:bg-white/5"
              >
                Acasă
              </Button>
            </Link>
            
            {status === "success" && paymentData?.ad_id && (
              <Link to={`/ad/${paymentData.ad_id}`} className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                  Vezi anunțul
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
            
            {(status === "failed" || status === "error") && (
              <Link to="/create-ad" className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                  Încearcă din nou
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
