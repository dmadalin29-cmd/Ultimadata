import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  Shield, ShieldCheck, Upload, Camera, FileText, 
  AlertCircle, CheckCircle, Clock, X, Info
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DOCUMENT_TYPES = [
  { id: "id_card", name: "Carte de Identitate (CI)" },
  { id: "passport", name: "Pașaport" },
  { id: "driving_license", name: "Permis de Conducere" },
];

export default function VerificationPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  
  // Form state
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentImage, setDocumentImage] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch user and verification status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, statusRes] = await Promise.all([
          axios.get(`${API_URL}/api/auth/me`, { withCredentials: true }),
          axios.get(`${API_URL}/api/verification/status`, { withCredentials: true })
        ]);
        setUser(userRes.data);
        setVerificationStatus(statusRes.data);
      } catch (error) {
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // Handle image upload
  const handleImageUpload = async (file, type) => {
    if (!file) return null;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data.url;
    } catch (error) {
      toast.error("Eroare la încărcarea imaginii");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle document file change
  const handleDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Imaginea este prea mare. Maxim 10MB.");
        return;
      }
      setDocumentImage(file);
      setDocumentPreview(URL.createObjectURL(file));
    }
  };

  // Handle selfie file change
  const handleSelfieChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Imaginea este prea mare. Maxim 10MB.");
        return;
      }
      setSelfieImage(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  // Submit verification request
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!documentType) {
      toast.error("Selectează tipul documentului");
      return;
    }
    if (!documentNumber || documentNumber.length < 6) {
      toast.error("Introdu numărul documentului (minim 6 caractere)");
      return;
    }
    if (!documentImage) {
      toast.error("Încarcă o poză cu documentul");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Upload images
      const documentUrl = await handleImageUpload(documentImage, "document");
      if (!documentUrl) {
        setSubmitting(false);
        return;
      }
      
      let selfieUrl = null;
      if (selfieImage) {
        selfieUrl = await handleImageUpload(selfieImage, "selfie");
      }
      
      // Submit verification request
      await axios.post(
        `${API_URL}/api/verification/request`,
        {
          document_type: documentType,
          document_number: documentNumber,
          document_image_url: documentUrl,
          selfie_url: selfieUrl
        },
        { withCredentials: true }
      );
      
      toast.success("Cererea de verificare a fost trimisă!");
      
      // Refresh status
      const statusRes = await axios.get(`${API_URL}/api/verification/status`, { withCredentials: true });
      setVerificationStatus(statusRes.data);
      
      // Reset form
      setDocumentType("");
      setDocumentNumber("");
      setDocumentImage(null);
      setDocumentPreview(null);
      setSelfieImage(null);
      setSelfiePreview(null);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la trimiterea cererii");
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-[#050505]" data-testid="verification-page">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verificare Identitate</h1>
          <p className="text-slate-400">
            Verifică-ți identitatea pentru a obține badge-ul de încredere
          </p>
        </div>

        {/* Already Verified */}
        {verificationStatus?.is_verified && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center mb-8">
            <ShieldCheck className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Identitate Verificată! ✅</h2>
            <p className="text-slate-400">
              Contul tău este verificat. Badge-ul "Identitate Verificată" apare pe profilul tău și pe toate anunțurile tale.
            </p>
          </div>
        )}

        {/* Pending Request */}
        {verificationStatus?.pending_request && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <Clock className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Cerere în Așteptare</h2>
                <p className="text-slate-400 text-sm mb-2">
                  Cererea ta de verificare este în curs de procesare. Vei primi un email când va fi revizuită.
                </p>
                <p className="text-slate-500 text-xs">
                  Trimisă: {new Date(verificationStatus.pending_request.created_at).toLocaleDateString("ro-RO")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Rejection */}
        {verificationStatus?.last_rejection && !verificationStatus.is_verified && !verificationStatus.pending_request && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Ultima cerere respinsă</h2>
                <p className="text-slate-400 text-sm mb-2">
                  <strong>Motiv:</strong> {verificationStatus.last_rejection.rejection_reason}
                </p>
                <p className="text-slate-500 text-xs">
                  Poți trimite o nouă cerere cu documente corecte.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Form */}
        {!verificationStatus?.is_verified && !verificationStatus?.pending_request && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Document de Identitate
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Tip Document *</label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="bg-[#121212] border-white/10 text-white">
                      <SelectValue placeholder="Selectează tipul documentului" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-white/10">
                      {DOCUMENT_TYPES.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Număr Document (CNP/Serie) *</label>
                  <Input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="ex: 1234567890123"
                    className="bg-[#121212] border-white/10 text-white"
                    data-testid="document-number-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Stocăm doar ultimele 4 caractere pentru securitate
                  </p>
                </div>
                
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Poză Document *</label>
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors">
                    {documentPreview ? (
                      <div className="relative">
                        <img 
                          src={documentPreview} 
                          alt="Document" 
                          className="max-h-48 mx-auto rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white"
                          onClick={() => {
                            setDocumentImage(null);
                            setDocumentPreview(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400 mb-1">Click pentru a încărca</p>
                        <p className="text-slate-500 text-xs">JPG, PNG • Max 10MB</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDocumentChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-400" />
                Selfie cu Documentul (Opțional)
              </h3>
              
              <p className="text-slate-400 text-sm mb-4">
                Un selfie ținând documentul lângă față accelerează procesul de verificare.
              </p>
              
              <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors">
                {selfiePreview ? (
                  <div className="relative">
                    <img 
                      src={selfiePreview} 
                      alt="Selfie" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white"
                      onClick={() => {
                        setSelfieImage(null);
                        setSelfiePreview(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Camera className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 mb-1">Adaugă selfie (opțional)</p>
                    <p className="text-slate-500 text-xs">JPG, PNG • Max 10MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelfieChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-white font-medium mb-1">De ce să-ți verifici identitatea?</p>
                  <ul className="text-slate-400 space-y-1">
                    <li>• Badge "Identitate Verificată" pe profil și anunțuri</li>
                    <li>• Creștere încredere din partea cumpărătorilor</li>
                    <li>• Prioritate în rezultatele căutării</li>
                    <li>• Mai multe contactări și vânzări</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || uploading}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-medium"
              data-testid="submit-verification-btn"
            >
              {submitting || uploading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Se procesează...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Trimite Cererea de Verificare
                </span>
              )}
            </Button>
          </form>
        )}

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-white font-medium">Încredere</p>
            <p className="text-slate-500 text-xs">Cumpărătorii preferă vânzători verificați</p>
          </div>
          <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 text-center">
            <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-white font-medium">Securitate</p>
            <p className="text-slate-500 text-xs">Datele tale sunt protejate</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
