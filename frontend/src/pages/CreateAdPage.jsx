import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  CreditCard,
  Image as ImageIcon,
  Sparkles,
  Loader2
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { id: 1, name: "Categorie", icon: "1" },
  { id: 2, name: "Detalii", icon: "2" },
  { id: 3, name: "Poze", icon: "3" },
  { id: 4, name: "Confirmare", icon: "4" }
];

export default function CreateAdPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [carBrands, setCarBrands] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    category_id: "",
    subcategory_id: "",
    city_id: "",
    title: "",
    description: "",
    price: "",
    price_type: "fixed",
    contact_phone: "",
    contact_email: user?.email || "",
    images: [],
    details: {}
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, citiesRes, brandsRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`),
        axios.get(`${API_URL}/api/cities`),
        axios.get(`${API_URL}/api/car-brands`)
      ]);
      setCategories(categoriesRes.data);
      setCities(citiesRes.data);
      setCarBrands(brandsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const selectedCategory = categories.find(c => c.id === formData.category_id);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDetailChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, [key]: value }
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (formData.images.length + files.length > 10) {
      toast.error("Maximum 10 imagini permise");
      return;
    }

    setUploading(true);
    
    for (const file of files) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        
        const response = await axios.post(
          `${API_URL}/api/upload`,
          formDataUpload,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" }
          }
        );
        
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, `${API_URL}${response.data.url}`]
        }));
      } catch (error) {
        toast.error(`Eroare la încărcarea imaginii: ${file.name}`);
      }
    }
    
    setUploading(false);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const generateAIDescription = async () => {
    if (!formData.title.trim()) {
      toast.error("Introdu mai întâi un titlu pentru a genera descrierea");
      return;
    }
    
    setGeneratingAI(true);
    try {
      const category = categories.find(c => c.id === formData.category_id);
      const city = cities.find(c => c.id === formData.city_id);
      
      const response = await axios.post(`${API_URL}/api/generate-description`, {
        title: formData.title,
        category: category?.name || "",
        city: city?.name || "",
        price: formData.price || null,
        details: formData.details
      }, { withCredentials: true });
      
      setFormData(prev => ({
        ...prev,
        description: response.data.description
      }));
      
      toast.success("Descriere generată cu AI!");
    } catch (error) {
      toast.error("Eroare la generarea descrierii");
    } finally {
      setGeneratingAI(false);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.category_id) {
          toast.error("Selectează o categorie");
          return false;
        }
        if (!formData.city_id) {
          toast.error("Selectează un oraș");
          return false;
        }
        return true;
      case 2:
        if (!formData.title.trim()) {
          toast.error("Introdu un titlu");
          return false;
        }
        if (!formData.description.trim()) {
          toast.error("Introdu o descriere");
          return false;
        }
        return true;
      case 3:
        return true; // Images are optional
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Create ad directly without payment
      const adResponse = await axios.post(
        `${API_URL}/api/ads`,
        {
          ...formData,
          price: formData.price ? parseFloat(formData.price) : null
        },
        { withCredentials: true }
      );
      
      toast.success("Anunț creat cu succes! Va fi activ după aprobare.");
      
      // Redirect to profile
      setTimeout(() => {
        window.location.href = "/profile";
      }, 1500);
      
    } catch (error) {
      console.error("Error creating ad:", error);
      toast.error("Eroare la crearea anunțului");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="create-ad-page">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-medium transition-all ${
                      currentStep >= step.id 
                        ? "bg-blue-600 text-white" 
                        : "bg-[#121212] text-slate-500 border border-white/10"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className={`mt-2 text-sm ${
                    currentStep >= step.id ? "text-white" : "text-slate-500"
                  }`}>
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 sm:w-24 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-blue-600" : "bg-white/10"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-6 md:p-8">
          {/* Step 1: Category */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Alege categoria</h2>
                <p className="text-slate-400">Selectează categoria și locația anunțului</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Categorie *</label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(value) => {
                      handleInputChange("category_id", value);
                      handleInputChange("subcategory_id", "");
                    }}
                  >
                    <SelectTrigger className="h-12 bg-[#121212] border-white/10 text-white" data-testid="category-select">
                      <SelectValue placeholder="Selectează categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-white/10">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory?.subcategories && (
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Subcategorie</label>
                    <Select 
                      value={formData.subcategory_id} 
                      onValueChange={(value) => handleInputChange("subcategory_id", value)}
                    >
                      <SelectTrigger className="h-12 bg-[#121212] border-white/10 text-white" data-testid="subcategory-select">
                        <SelectValue placeholder="Selectează subcategoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-white/10">
                        {selectedCategory.subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Oraș *</label>
                  <Select 
                    value={formData.city_id} 
                    onValueChange={(value) => handleInputChange("city_id", value)}
                  >
                    <SelectTrigger className="h-12 bg-[#121212] border-white/10 text-white" data-testid="city-select">
                      <SelectValue placeholder="Selectează orașul" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] border-white/10 max-h-60">
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Detalii anunț</h2>
                <p className="text-slate-400">Completează informațiile despre anunț</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Titlu *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Ex: Apartament 3 camere central"
                    className="h-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                    maxLength={100}
                    data-testid="title-input"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-slate-400">Descriere *</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateAIDescription}
                      disabled={generatingAI || !formData.title.trim()}
                      className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                      data-testid="generate-ai-btn"
                    >
                      {generatingAI ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      {generatingAI ? "Se generează..." : "Generează cu AI"}
                    </Button>
                  </div>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descrie în detaliu produsul sau serviciul..."
                    className="min-h-[150px] bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                    maxLength={5000}
                    data-testid="description-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Preț (€)</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                      placeholder="0"
                      className="h-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                      data-testid="price-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Tip preț</label>
                    <Select 
                      value={formData.price_type} 
                      onValueChange={(value) => handleInputChange("price_type", value)}
                    >
                      <SelectTrigger className="h-12 bg-[#121212] border-white/10 text-white" data-testid="price-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-white/10">
                        <SelectItem value="fixed">Preț fix</SelectItem>
                        <SelectItem value="negotiable">Negociabil</SelectItem>
                        <SelectItem value="free">Gratuit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Telefon contact</label>
                    <Input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                      placeholder="+40 7XX XXX XXX"
                      className="h-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                      data-testid="phone-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Email contact</label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange("contact_email", e.target.value)}
                      placeholder="email@exemplu.com"
                      className="h-12 bg-[#121212] border-white/10 text-white placeholder:text-slate-600"
                      data-testid="email-input"
                    />
                  </div>
                </div>

                {/* Car specific fields */}
                {formData.category_id === "cars" && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Marcă</label>
                      <Select 
                        value={formData.details.brand || ""} 
                        onValueChange={(value) => {
                          handleDetailChange("brand", value);
                          handleDetailChange("model", "");
                        }}
                      >
                        <SelectTrigger className="h-12 bg-[#121212] border-white/10 text-white">
                          <SelectValue placeholder="Selectează marca" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121212] border-white/10 max-h-60">
                          {Object.entries(carBrands).map(([key, brand]) => (
                            <SelectItem key={key} value={key}>{brand.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.details.brand && carBrands[formData.details.brand] && (
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">Model</label>
                        <Select 
                          value={formData.details.model || ""} 
                          onValueChange={(value) => handleDetailChange("model", value)}
                        >
                          <SelectTrigger className="h-12 bg-[#121212] border-white/10 text-white">
                            <SelectValue placeholder="Selectează modelul" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#121212] border-white/10 max-h-60">
                            {carBrands[formData.details.brand].models.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">An fabricație</label>
                      <Input
                        type="number"
                        value={formData.details.year || ""}
                        onChange={(e) => handleDetailChange("year", e.target.value)}
                        placeholder="2024"
                        className="h-12 bg-[#121212] border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Km parcurși</label>
                      <Input
                        type="number"
                        value={formData.details.km || ""}
                        onChange={(e) => handleDetailChange("km", e.target.value)}
                        placeholder="50000"
                        className="h-12 bg-[#121212] border-white/10 text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Real estate specific fields */}
                {formData.category_id === "real_estate" && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Suprafață (mp)</label>
                      <Input
                        type="number"
                        value={formData.details.surface || ""}
                        onChange={(e) => handleDetailChange("surface", e.target.value)}
                        placeholder="80"
                        className="h-12 bg-[#121212] border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Camere</label>
                      <Input
                        type="number"
                        value={formData.details.rooms || ""}
                        onChange={(e) => handleDetailChange("rooms", e.target.value)}
                        placeholder="3"
                        className="h-12 bg-[#121212] border-white/10 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Adaugă fotografii</h2>
                <p className="text-slate-400">Încarcă până la 10 imagini pentru anunțul tău</p>
              </div>

              <div className="space-y-4">
                {/* Upload Area */}
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/50 transition-colors bg-[#121212]">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploading ? (
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-500 mb-3" />
                        <p className="text-sm text-slate-400">
                          <span className="text-blue-500">Click pentru a încărca</span> sau trage fișierele aici
                        </p>
                        <p className="text-xs text-slate-600 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                    data-testid="image-upload-input"
                  />
                </label>

                {/* Image Preview Grid */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {formData.images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`remove-image-${index}`}
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 px-2 py-1 rounded bg-blue-600 text-white text-xs">
                            Principală
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Finalizare</h2>
                <p className="text-slate-400">Revizuiește anunțul și publică-l gratuit</p>
              </div>

              {/* Summary */}
              <div className="space-y-4 p-4 rounded-xl bg-[#121212]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Categorie</span>
                  <span className="text-white">{selectedCategory?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Oraș</span>
                  <span className="text-white">{cities.find(c => c.id === formData.city_id)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Titlu</span>
                  <span className="text-white truncate max-w-[200px]">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fotografii</span>
                  <span className="text-white">{formData.images.length} imagini</span>
                </div>
              </div>

              {/* Free Info */}
              <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <Check className="w-6 h-6 text-emerald-500" />
                  <h3 className="text-lg font-semibold text-white">Publicare Gratuită!</h3>
                </div>
                <p className="text-slate-400 text-sm">
                  Anunțul tău va fi publicat gratuit. După trimitere, va fi verificat de echipa noastră și activat în maxim 24 de ore.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={prevStep}
                className="border-white/10 text-white hover:bg-white/5"
                data-testid="prev-step-btn"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Înapoi
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                className="bg-blue-600 hover:bg-blue-500 text-white"
                data-testid="next-step-btn"
              >
                Continuă
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[160px]"
                data-testid="submit-ad-btn"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Publică Gratuit
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
