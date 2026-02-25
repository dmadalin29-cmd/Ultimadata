import Header from "../components/Header";
import Footer from "../components/Footer";
import { Shield, Database, Eye, Lock, UserCheck, Trash2, Globe, Mail } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="privacy-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Politica de Confidențialitate</h1>
          <p className="text-slate-400">Ultima actualizare: Februarie 2026</p>
        </div>

        <div className="space-y-8">
          {/* Intro */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <p className="text-slate-400">
              X67 Digital Media Groupe respectă confidențialitatea utilizatorilor săi și se angajează să protejeze datele personale în conformitate cu Regulamentul General privind Protecția Datelor (GDPR) și legislația română în vigoare.
            </p>
          </section>

          {/* Section 1 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">1. Date Colectate</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>Colectăm următoarele categorii de date personale:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                  <div>
                    <strong className="text-white">Date de identificare:</strong> nume, prenume, adresă de email, număr de telefon
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                  <div>
                    <strong className="text-white">Date de autentificare:</strong> adresă de email, parolă criptată, date Google (dacă folosiți autentificarea Google)
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                  <div>
                    <strong className="text-white">Date despre anunțuri:</strong> titlu, descriere, fotografii, preț, categorie, locație
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                  <div>
                    <strong className="text-white">Date tehnice:</strong> adresă IP, tip de browser, dispozitiv utilizat
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-semibold text-white">2. Scopul Prelucrării</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>Utilizăm datele personale pentru:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Crearea și administrarea contului de utilizator</li>
                <li>Publicarea și gestionarea anunțurilor</li>
                <li>Procesarea plăților prin Viva Wallet</li>
                <li>Trimiterea notificărilor despre starea anunțurilor</li>
                <li>Îmbunătățirea serviciilor și experienței utilizatorilor</li>
                <li>Prevenirea fraudelor și asigurarea securității platformei</li>
                <li>Respectarea obligațiilor legale</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-semibold text-white">3. Securitatea Datelor</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>Implementăm măsuri tehnice și organizatorice pentru protecția datelor:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Criptare SSL/TLS pentru toate transferurile de date</li>
                <li>Parole criptate folosind algoritmi de hashing securizați</li>
                <li>Acces restricționat la bazele de date</li>
                <li>Monitorizare continuă pentru detectarea amenințărilor</li>
                <li>Backup-uri regulate ale datelor</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-cyan-500" />
              <h2 className="text-xl font-semibold text-white">4. Drepturile Utilizatorilor</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>Conform GDPR, aveți următoarele drepturi:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl bg-[#121212]">
                  <strong className="text-white">Dreptul de acces</strong>
                  <p className="text-sm mt-1">Puteți solicita informații despre datele prelucrate</p>
                </div>
                <div className="p-4 rounded-xl bg-[#121212]">
                  <strong className="text-white">Dreptul la rectificare</strong>
                  <p className="text-sm mt-1">Puteți corecta datele incorecte</p>
                </div>
                <div className="p-4 rounded-xl bg-[#121212]">
                  <strong className="text-white">Dreptul la ștergere</strong>
                  <p className="text-sm mt-1">Puteți solicita ștergerea datelor</p>
                </div>
                <div className="p-4 rounded-xl bg-[#121212]">
                  <strong className="text-white">Dreptul la portabilitate</strong>
                  <p className="text-sm mt-1">Puteți primi datele în format structurat</p>
                </div>
                <div className="p-4 rounded-xl bg-[#121212]">
                  <strong className="text-white">Dreptul la opoziție</strong>
                  <p className="text-sm mt-1">Vă puteți opune prelucrării datelor</p>
                </div>
                <div className="p-4 rounded-xl bg-[#121212]">
                  <strong className="text-white">Dreptul la restricționare</strong>
                  <p className="text-sm mt-1">Puteți limita prelucrarea datelor</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-white">5. Perioada de Păstrare</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>Păstrăm datele personale pentru următoarele perioade:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Date de cont:</strong> Pe durata existenței contului + 30 zile după ștergere</li>
                <li><strong className="text-white">Date despre anunțuri:</strong> Pe durata publicării + 90 zile</li>
                <li><strong className="text-white">Date de plată:</strong> 5 ani (conform legislației fiscale)</li>
                <li><strong className="text-white">Date tehnice:</strong> 12 luni</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-semibold text-white">6. Cookie-uri</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>Utilizăm cookie-uri pentru:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Cookie-uri esențiale:</strong> Necesare pentru funcționarea platformei</li>
                <li><strong className="text-white">Cookie-uri de autentificare:</strong> Pentru menținerea sesiunii</li>
                <li><strong className="text-white">Cookie-uri analitice:</strong> Pentru îmbunătățirea serviciilor</li>
              </ul>
              <p>
                Puteți gestiona preferințele cookie din setările browserului.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">Contact DPO</h2>
            </div>
            <div className="text-slate-400">
              <p>Pentru exercitarea drepturilor sau întrebări privind datele personale:</p>
              <ul className="space-y-2 mt-4">
                <li><strong className="text-white">Email:</strong> dpo@x67digital.com</li>
                <li><strong className="text-white">Telefon:</strong> 0730 268 067</li>
                <li><strong className="text-white">Adresă:</strong> București, România</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
