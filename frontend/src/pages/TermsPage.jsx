import Header from "../components/Header";
import Footer from "../components/Footer";
import { FileText, CheckCircle, AlertCircle, Gift, Ban, Scale } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="terms-page">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Termeni și Condiții</h1>
          <p className="text-slate-400">Ultima actualizare: Februarie 2026</p>
        </div>

        <div className="space-y-8">
          {/* Section 1 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-semibold text-white">1. Acceptarea Termenilor</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                Prin accesarea și utilizarea platformei X67 Digital Media Groupe ("Platforma"), acceptați să respectați acești Termeni și Condiții. Dacă nu sunteți de acord cu oricare dintre aceste condiții, vă rugăm să nu utilizați Platforma.
              </p>
              <p>
                Ne rezervăm dreptul de a modifica acești termeni în orice moment. Modificările intră în vigoare imediat după publicarea lor pe Platformă.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-white">2. Descrierea Serviciilor</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                X67 Digital Media Groupe oferă o platformă de anunțuri online care permite utilizatorilor să publice și să vizualizeze anunțuri în diverse categorii, inclusiv:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong className="text-white">Escorte / Însoțitori</strong> - servicii de însoțire la evenimente sociale (mese, petreceri, gale, evenimente de afaceri)</li>
                <li>Imobiliare (apartamente, case, terenuri)</li>
                <li>Auto și moto (autoturisme, motociclete, piese)</li>
                <li>Locuri de muncă</li>
                <li>Electronice și IT</li>
                <li>Servicii profesionale</li>
                <li>Animale de companie</li>
              </ul>
              <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 text-sm">
                  <strong>Clarificare importantă:</strong> Categoria "Escorte" se referă exclusiv la servicii de <strong>însoțire socială</strong> la evenimente precum mese, petreceri, gale, conferințe sau alte evenimente sociale și de afaceri. Această categorie NU promovează și NU permite anunțuri pentru servicii sexuale sau ilegale de orice fel.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 - UPDATED FOR FREE */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-semibold text-white">3. Publicare Gratuită</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                <strong className="text-emerald-400">Publicarea anunțurilor pe Platformă este complet GRATUITĂ!</strong>
              </p>
              <p>
                Beneficii incluse gratuit:
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <strong className="text-white">Publicare anunț:</strong> GRATUIT
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <strong className="text-white">TopUp anunț:</strong> GRATUIT (ridică anunțul în top la fiecare oră)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
                  <strong className="text-white">Auto-TopUp:</strong> GRATUIT (anunțul se ridică automat)
                </li>
              </ul>
              <p className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <strong className="text-emerald-400">🎁 Bonus:</strong> Distribuie site-ul prietenilor folosind link-ul tău de referral și vei putea face TopUp la fiecare 40 de minute în loc de 60!
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-white">4. Conținut Interzis</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                Este strict interzisă publicarea de anunțuri care conțin:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Conținut ilegal sau care încalcă legislația în vigoare</li>
                <li>Produse contrafăcute sau furate</li>
                <li>Materiale care incită la violență, ură sau discriminare</li>
                <li>Informații false sau înșelătoare</li>
                <li>Droguri sau substanțe interzise</li>
                <li>Arme sau muniție fără autorizație</li>
                <li>Conținut care implică minori</li>
                <li>Conținut care încalcă drepturile de proprietate intelectuală</li>
                <li><strong className="text-red-400">Servicii sexuale sau conținut explicit de orice fel</strong></li>
              </ul>
              <p>
                Ne rezervăm dreptul de a șterge orice anunț care încalcă aceste reguli și de a bloca contul utilizatorului.
              </p>
              <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-400 text-sm">
                  <strong>Notă pentru categoria Escorte:</strong> Toate anunțurile din această categorie sunt verificate manual de echipa noastră înainte de aprobare. Anunțurile care sugerează servicii sexuale sau ilegale vor fi respinse și utilizatorii pot fi blocați permanent.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 - Premium Services */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-semibold text-white">5. Servicii Premium și Promovare</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                Platforma oferă următoarele servicii opționale plătite:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></span>
                  <div>
                    <strong className="text-white">TOP în Categorie (15 RON/săptămână):</strong>
                    <span className="block text-sm">Anunțul tău apare primul în categoria sa timp de 7 zile</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                  <div>
                    <strong className="text-white">Featured Homepage (40 RON/săptămână):</strong>
                    <span className="block text-sm">Anunțul tău apare pe pagina principală timp de 7 zile</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mt-2"></span>
                  <div>
                    <strong className="text-white">Vânzător Pro (99 RON/lună):</strong>
                    <span className="block text-sm">Anunțuri nelimitate, statistici avansate, suport prioritar, badge verificat</span>
                  </div>
                </li>
              </ul>
              <p className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <strong className="text-purple-400">Plăți securizate:</strong> Toate plățile sunt procesate prin Viva Wallet, un furnizor de plăți autorizat în UE.
              </p>
            </div>
          </section>

          {/* Section 6 - Escrow */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-semibold text-white">6. Sistem Escrow (Plată Sigură)</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                Platforma oferă un sistem de plată sigură (escrow) pentru tranzacții între utilizatori:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Banii cumpărătorului sunt păstrați în siguranță până la confirmarea livrării</li>
                <li>Vânzătorul primește banii doar după ce cumpărătorul confirmă primirea</li>
                <li>În caz de dispută, echipa noastră analizează cazul</li>
                <li><strong className="text-white">Comision:</strong> 3% din valoarea tranzacției</li>
              </ul>
              <p className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <strong className="text-green-400">Notă:</strong> Sistemul escrow este opțional. Utilizatorii pot alege să tranzacționeze direct între ei, dar în acest caz platforma nu oferă protecție pentru tranzacție.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-semibold text-white">7. Responsabilitate</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                X67 Digital Media Groupe:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nu verifică identitatea utilizatorilor sau veridicitatea anunțurilor</li>
                <li>Nu este parte în tranzacțiile dintre utilizatori</li>
                <li>Nu garantează calitatea produselor sau serviciilor anunțate</li>
                <li>Nu este responsabilă pentru eventualele dispute între utilizatori</li>
              </ul>
              <p>
                Utilizatorii sunt încurajați să verifice cu atenție informațiile și să ia măsuri de precauție înainte de orice tranzacție.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-[#0A0A0A] rounded-2xl p-8 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-cyan-500" />
              <h2 className="text-xl font-semibold text-white">6. Legea Aplicabilă</h2>
            </div>
            <div className="text-slate-400 space-y-4">
              <p>
                Acești Termeni și Condiții sunt guvernați de legile din România. Orice dispută va fi soluționată de instanțele competente din București.
              </p>
              <p>
                Pentru întrebări sau reclamații, ne puteți contacta la:
              </p>
              <ul className="space-y-2 mt-4">
                <li><strong className="text-white">Email:</strong> contact@x67digital.com</li>
                <li><strong className="text-white">Telefon:</strong> 0730 268 067</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
