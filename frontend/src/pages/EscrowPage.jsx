import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Shield, CheckCircle, Clock, AlertTriangle, 
  ArrowRight, HelpCircle, Ban
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending: { label: "În așteptare", color: "yellow", icon: Clock },
  paid: { label: "Plătit", color: "blue", icon: CheckCircle },
  delivered: { label: "Livrat", color: "purple", icon: CheckCircle },
  completed: { label: "Finalizat", color: "green", icon: CheckCircle },
  disputed: { label: "Dispută", color: "red", icon: AlertTriangle },
  refunded: { label: "Rambursat", color: "gray", icon: Ban }
};

export default function EscrowPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, txRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/me`, { withCredentials: true }),
        axios.get(`${API_URL}/api/escrow/my-transactions`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setTransactions(txRes.data.transactions);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (escrowId) => {
    setProcessing(escrowId);
    try {
      await axios.post(
        `${API_URL}/api/escrow/${escrowId}/confirm-delivery`,
        {},
        { withCredentials: true }
      );
      toast.success("Plata a fost eliberată către vânzător!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare");
    } finally {
      setProcessing(null);
    }
  };

  const handleDispute = async (escrowId) => {
    const reason = prompt("Descrie motivul disputei:");
    if (!reason) return;
    
    setProcessing(escrowId);
    try {
      await axios.post(
        `${API_URL}/api/escrow/${escrowId}/dispute`,
        { reason },
        { withCredentials: true }
      );
      toast.success("Disputa a fost deschisă");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="escrow-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full mb-4">
            <Shield className="w-5 h-5" />
            Plată Sigură
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tranzacții Escrow
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Sistemul nostru de plată sigură protejează atât cumpărătorii cât și vânzătorii. 
            Banii sunt păstrați în siguranță până când tranzacția este finalizată.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            Cum funcționează?
          </h3>
          
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: 1, title: "Plătește", desc: "Cumpărătorul plătește în escrow" },
              { step: 2, title: "Livrare", desc: "Vânzătorul livrează produsul" },
              { step: 3, title: "Confirmare", desc: "Cumpărătorul confirmă primirea" },
              { step: 4, title: "Finalizare", desc: "Banii ajung la vânzător" }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center mx-auto mb-2">
                  {item.step}
                </div>
                <h4 className="text-white font-medium mb-1">{item.title}</h4>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-slate-400 text-sm">
              Comision: <span className="text-white">3%</span> din valoarea tranzacției
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-6">Tranzacțiile Tale</h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nu ai tranzacții escrow</p>
              <p className="text-slate-500 text-sm mt-2">
                Când cumperi sau vinzi folosind plata sigură, tranzacțiile vor apărea aici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => {
                const status = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const isBuyer = tx.buyer_id === user?.user_id;
                
                return (
                  <div 
                    key={tx.escrow_id}
                    className="border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-medium">{tx.ad_title}</h4>
                        <p className="text-slate-500 text-sm">
                          {isBuyer ? "Cumperi de la" : "Vinzi către"}: {isBuyer ? tx.seller_name : tx.buyer_name}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-${status.color}-500/20 text-${status.color}-400`}>
                        <StatusIcon className="w-4 h-4" />
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-slate-400 text-sm">
                        <span className="text-white font-bold text-lg">{tx.amount} €</span>
                        <span className="ml-2">(+{tx.commission} € comision)</span>
                      </div>
                      
                      {/* Actions */}
                      {isBuyer && tx.status === "paid" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleConfirmDelivery(tx.escrow_id)}
                            disabled={processing === tx.escrow_id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-500"
                          >
                            Confirm Primirea
                          </Button>
                          <Button
                            onClick={() => handleDispute(tx.escrow_id)}
                            disabled={processing === tx.escrow_id}
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            Deschide Dispută
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-slate-500 text-xs mt-2">
                      Creat: {new Date(tx.created_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
