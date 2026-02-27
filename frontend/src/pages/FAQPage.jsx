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
        a: "Apasă pe \"Am uitat parola\" din pagina de autentificare și introdu adresa de email. Vei primi un link de resetare pe email în câteva minute."
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
        a: "Publicarea anunțurilor este GRATUITĂ! Poți publica oricâte anunțuri dorești fără niciun cost."
      },
      {
        q: "Ce categorii de anunțuri sunt disponibile?",
        a: "Oferim categorii variate: Escorte, Imobiliare (apartamente, case, terenuri), Auto & Moto (cu toate mărcile și modelele), Locuri de muncă (20+ subcategorii), Electronice, Modă, Servicii, Animale și multe altele."
      },
      {
        q: "Câte fotografii pot adăuga la un anunț?",
        a: "Poți încărca până la 10 fotografii per anunț. Prima fotografie va fi afișată ca imagine principală."
      },
      {
        q: "Cât timp rămâne activ anunțul meu?",
        a: "Anunțurile rămân active timp de 30 de zile de la aprobare. După expirare, poți republica anunțul gratuit."
      },
      {
        q: "Anunțurile sunt aprobate automat?",
        a: "Da! Anunțurile din toate categoriile (cu excepția Escorte) sunt aprobate automat și publicate instant. Anunțurile din categoria Escorte sunt verificate manual de echipa noastră pentru a asigura calitatea."
      }
    ]
  },
  {
    category: "Promovare și Premium",
    icon: Zap,
    color: "text-fuchsia-500",
    questions: [
      {
        q: "Ce opțiuni de promovare sunt disponibile?",
        a: "Oferim mai multe opțiuni: TOP în Categorie (15 RON/săptămână) - anunțul tău apare primul în categorie; Featured Homepage (40 RON/săptămână) - anunțul apare pe pagina principală; și Vânzător Pro (99 RON/lună) - acces la toate funcționalitățile premium."
      },
      {
        q: "Ce include abonamentul Vânzător Pro?",
        a: "Vânzător Pro include: anunțuri nelimitate, statistici avansate despre vizualizări și engagement, suport prioritar, TopUp fără timp de așteptare, badge verificat pe profil, și profil evidențiat în rezultate."
      },
      {
        q: "Cum funcționează sistemul de loialitate?",
        a: "Câștigi puncte pentru fiecare anunț postat, vânzare finalizată, review primit, și pentru referral-uri. Punctele te ajută să avansezi prin nivele (Bronze → Silver → Gold → Platinum), fiecare nivel oferind beneficii crescute."
      },
      {
        q: "Ce este programul de referral?",
        a: "Primești un cod unic de referral pe care îl poți distribui. Pentru fiecare utilizator nou care se înregistrează cu codul tău, primești 100 puncte. Când acesta postează primul anunț, primești încă 50 puncte bonus!"
      }
    ]
  },
  {
    category: "Plăți și Escrow",
    icon: CreditCard,
    color: "text-purple-500",
    questions: [
      {
        q: "Ce metode de plată acceptați?",
        a: "Plățile se procesează prin Viva Wallet și acceptăm carduri Visa, Mastercard și Maestro."
      },
      {
        q: "Ce este sistemul Escrow (Plată Sigură)?",
        a: "Escrow este un sistem de protecție pentru tranzacții. Când cumperi prin Escrow, banii tăi sunt păstrați în siguranță de platformă până când confirmi că ai primit produsul. Comisionul este de 3%."
      },
      {
        q: "Cum funcționează plata prin Escrow?",
        a: "1) Cumpărătorul plătește în escrow → 2) Vânzătorul livrează produsul → 3) Cumpărătorul confirmă primirea → 4) Banii sunt eliberați către vânzător. În caz de problemă, poți deschide o dispută."
      },
      {
        q: "Este sigură plata online?",
        a: "Da! Folosim Viva Wallet, unul dintre cele mai sigure procesatori de plăți din Europa, cu criptare SSL și conformitate PCI-DSS."
      },
      {
        q: "Primesc confirmare după plată?",
        a: "Da, vei primi automat confirmare pe email după fiecare plată."
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
        q: "Numărul meu de telefon este vizibil?",
        a: "Numărul de telefon este vizibil doar pentru utilizatorii care sunt logați și apasă pe \"Arată contact\". Acest lucru protejează împotriva spam-ului."
      }
    ]
  },
  {
    category: "Comunitate și Suport",
    icon: AlertCircle,
    color: "text-yellow-500",
    questions: [
      {
        q: "Ce este Forumul Comunitate?",
        a: "Forumul este un loc unde poți discuta cu alți utilizatori, cere sfaturi despre vânzări, și împărtăși experiențe. Accesează-l din meniul principal sau de pe /forum."
      },
      {
        q: "Cum pot posta o poveste de succes?",
        a: "Dacă ai vândut ceva cu succes pe platformă, poți împărtăși experiența ta în secțiunea \"Povești de Succes\". Completează formularul și povestea ta va fi publicată după aprobare."
      },
      {
        q: "Unde găsesc ghiduri și sfaturi?",
        a: "Avem o secțiune de Blog & Ghiduri cu articole utile precum \"Cum să vinzi mașina rapid\" sau \"Ghid pentru fotografii de anunț profesioniste\". Accesează /blog."
      },
      {
        q: "Pot instala X67 ca aplicație pe telefon?",
        a: "Da! X67 este o aplicație PWA. Pe Android/iOS, deschide site-ul în Chrome/Safari și apasă \"Adaugă pe ecranul principal\" sau \"Instalează aplicația\" din meniu."
      },
      {
        q: "Cum contactez suportul?",
        a: "Ne poți contacta oricând la contact@x67digital.com sau folosind chatbot-ul nostru AI disponibil în colțul din dreapta-jos al ecranului."
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
