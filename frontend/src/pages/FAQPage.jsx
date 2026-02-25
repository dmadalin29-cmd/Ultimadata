import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { HelpCircle, ChevronDown, CreditCard, FileText, User, Shield, Zap, AlertCircle } from "lucide-react";

const faqs = [
  {
    category: "Cont și Autentificare",
    icon: User,
    color: "text-blue-500",
    questions: [
      {
        q: "Cum îmi creez un cont pe X67 Digital Media?",
        a: "Poți crea un cont gratuit folosind adresa de email sau autentificarea cu Google. Accesează pagina de Autentificare, completează formularul de înregistrare sau apasă pe \"Continuă cu Google\"."
      },
      {
        q: "Am uitat parola. Cum o pot recupera?",
        a: "Momentan, te rugăm să ne contactezi la contact@x67digital.com pentru resetarea parolei. Vom implementa în curând funcția de recuperare automată."
      },
      {
        q: "Cum îmi pot șterge contul?",
        a: "Pentru ștergerea contului, te rugăm să ne contactezi la contact@x67digital.com. Vom procesa cererea în maxim 72 de ore."
      }
    ]
  },
  {
    category: "Publicare Anunțuri",
    icon: FileText,
    color: "text-emerald-500",
    questions: [
      {
        q: "Cât costă să public un anunț?",
        a: "Publicarea unui anunț costă 11,40 RON (TVA inclus). Plata se face securizat prin Viva Wallet."
      },
      {
        q: "Ce categorii de anunțuri sunt disponibile?",
        a: "Oferim categorii variate: Imobiliare (apartamente, case, terenuri), Auto & Moto (cu toate mărcile și modelele), Locuri de muncă (20+ subcategorii), Electronice, Modă, Servicii, Animale și multe altele."
      },
      {
        q: "Câte fotografii pot adăuga la un anunț?",
        a: "Poți încărca până la 10 fotografii per anunț. Prima fotografie va fi afișată ca imagine principală."
      },
      {
        q: "Cât timp rămâne activ anunțul meu?",
        a: "Anunțurile rămân active timp de 30 de zile de la aprobare. După expirare, poți republica anunțul."
      },
      {
        q: "De ce anunțul meu nu a fost aprobat?",
        a: "Anunțurile sunt verificate de echipa noastră. Motivele respingerii pot include: informații incomplete, conținut necorespunzător, încălcarea regulamentului sau fotografii de calitate slabă."
      }
    ]
  },
  {
    category: "Plăți și Tarife",
    icon: CreditCard,
    color: "text-purple-500",
    questions: [
      {
        q: "Ce metode de plată acceptați?",
        a: "Plățile se procesează prin Viva Wallet și acceptăm carduri Visa, Mastercard și Maestro."
      },
      {
        q: "Pot primi restituirea banilor?",
        a: "Restituirile sunt posibile doar dacă anunțul nu a fost încă aprobat. După aprobare și publicare, nu oferim restituiri."
      },
      {
        q: "Primesc factură pentru plată?",
        a: "Da, vei primi automat confirmare pe email după fiecare plată. Pentru factură fiscală, contactează-ne la contact@x67digital.com."
      }
    ]
  },
  {
    category: "Promovare și Ridicare",
    icon: Zap,
    color: "text-fuchsia-500",
    questions: [
      {
        q: "Ce înseamnă \"Promovare anunț\"?",
        a: "Promovarea (29,99 RON) face ca anunțul tău să apară pe prima pagină a site-ului, în secțiunea \"Anunțuri Promovate\", timp de 7 zile."
      },
      {
        q: "Ce înseamnă \"Ridicare anunț\"?",
        a: "Ridicarea (7,00 RON) este disponibilă pentru categoria Escorte și face ca anunțul să apară primul în lista categoriei timp de 24 de ore."
      },
      {
        q: "Pot promova anunțul de mai multe ori?",
        a: "Da, poți promova sau ridica anunțul oricând dorești. Fiecare promovare extinde perioada de vizibilitate."
      }
    ]
  },
  {
    category: "Securitate și Confidențialitate",
    icon: Shield,
    color: "text-cyan-500",
    questions: [
      {
        q: "Sunt datele mele în siguranță?",
        a: "Da, folosim criptare SSL/TLS și respectăm GDPR. Parolele sunt criptate și nu le stocăm în text simplu."
      },
      {
        q: "Cum pot raporta un anunț suspect?",
        a: "Pe pagina fiecărui anunț există butonul \"Raportează anunțul\". De asemenea, ne poți contacta direct la contact@x67digital.com."
      },
      {
        q: "Verificați utilizatorii platformei?",
        a: "Nu verificăm identitatea utilizatorilor. Recomandăm prudență în tranzacții și verificarea informațiilor înainte de orice achiziție."
      }
    ]
  },
  {
    category: "Probleme Tehnice",
    icon: AlertCircle,
    color: "text-yellow-500",
    questions: [
      {
        q: "Imaginile nu se încarcă. Ce pot face?",
        a: "Verifică dimensiunea fișierelor (max 5MB) și formatul (JPG, PNG, WebP). Încearcă să ștergi cache-ul browserului sau folosește alt browser."
      },
      {
        q: "Nu pot finaliza plata. Ce fac?",
        a: "Verifică datele cardului și că ai suficiente fonduri. Dacă problema persistă, încearcă alt card sau contactează-ne pentru asistență."
      },
      {
        q: "Site-ul nu funcționează corect pe telefonul meu.",
        a: "Site-ul este optimizat pentru toate dispozitivele. Încearcă să actualizezi browserul sau să ștergi cache-ul. Dacă problema persistă, contactează-ne."
      }
    ]
  }
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="faq-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-8 h-8 text-purple-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Întrebări Frecvente</h1>
          <p className="text-slate-400">Găsește răspunsuri la cele mai comune întrebări</p>
        </div>

        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <section key={categoryIndex} className="bg-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center gap-3 p-6 border-b border-white/5">
                <category.icon className={`w-6 h-6 ${category.color}`} />
                <h2 className="text-xl font-semibold text-white">{category.category}</h2>
              </div>
              
              <div className="divide-y divide-white/5">
                {category.questions.map((item, questionIndex) => {
                  const key = `${categoryIndex}-${questionIndex}`;
                  const isOpen = openItems[key];
                  
                  return (
                    <div key={questionIndex}>
                      <button
                        onClick={() => toggleItem(categoryIndex, questionIndex)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                        data-testid={`faq-${categoryIndex}-${questionIndex}`}
                      >
                        <span className="text-white font-medium pr-4">{item.q}</span>
                        <ChevronDown 
                          className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-6 animate-fadeIn">
                          <p className="text-slate-400 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-white/10 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Nu ai găsit răspunsul?</h3>
          <p className="text-slate-400 mb-6">Echipa noastră este aici să te ajute!</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="mailto:contact@x67digital.com"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              Trimite un email
            </a>
            <a 
              href="tel:0730268067"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Sună: 0730 268 067
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
