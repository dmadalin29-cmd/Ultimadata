import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const categories = [
    { id: "escorts", name: "Escorte" },
    { id: "real_estate", name: "Imobiliare" },
    { id: "cars", name: "Auto" },
    { id: "jobs", name: "Locuri de muncă" },
    { id: "electronics", name: "Electronice" },
    { id: "services", name: "Servicii" },
  ];

  return (
    <footer className="bg-[#0A0A0A] border-t border-white/5" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">X</span>
              </div>
              <div>
                <span className="text-xl font-bold text-white">X67</span>
                <span className="text-xs text-slate-500 block -mt-1">Digital Media Groupe</span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Cea mai modernă platformă de anunțuri din România. Găsește tot ce ai nevoie, de la imobiliare la auto și servicii.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600/20 transition-colors">
                <Facebook className="w-5 h-5 text-slate-400" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-pink-600/20 transition-colors">
                <Instagram className="w-5 h-5 text-slate-400" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-400/20 transition-colors">
                <Twitter className="w-5 h-5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-6">Categorii</h3>
            <ul className="space-y-3">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link 
                    to={`/category/${cat.id}`} 
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-6">Link-uri Utile</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/create-ad" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Adaugă Anunț
                </Link>
              </li>
              <li>
                <Link to="/termeni-si-conditii" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Termeni și Condiții
                </Link>
              </li>
              <li>
                <Link to="/politica-confidentialitate" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Politica de Confidențialitate
                </Link>
              </li>
              <li>
                <Link to="/intrebari-frecvente" className="text-slate-400 hover:text-white transition-colors text-sm">
                  Întrebări Frecvente
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-6">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
                <span className="text-slate-400 text-sm">contact@x67digital.com</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-500 mt-0.5" />
                <span className="text-slate-400 text-sm">0730 268 067</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                <span className="text-slate-400 text-sm">București, România</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} X67 Digital Media Groupe. Toate drepturile rezervate.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Plăți securizate prin</span>
            <span className="text-blue-500 font-medium">Viva Wallet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
