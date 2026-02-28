import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet";
import { 
  BookOpen, Clock, Eye, Tag, ArrowLeft, 
  ChevronRight, Search, Sparkles, TrendingUp, Shield, Lightbulb, Newspaper
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Category colors and icons mapping
const CATEGORY_STYLES = {
  "Ghiduri": { 
    gradient: "from-emerald-500 to-cyan-500", 
    glow: "shadow-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/20",
    icon: Lightbulb
  },
  "Sfaturi": { 
    gradient: "from-blue-500 to-indigo-500", 
    glow: "shadow-blue-500/30",
    text: "text-blue-400",
    bg: "bg-blue-500/20",
    icon: Shield
  },
  "Noutăți": { 
    gradient: "from-purple-500 to-pink-500", 
    glow: "shadow-purple-500/30",
    text: "text-purple-400",
    bg: "bg-purple-500/20",
    icon: Newspaper
  },
  "Povești de Succes": { 
    gradient: "from-amber-500 to-orange-500", 
    glow: "shadow-amber-500/30",
    text: "text-amber-400",
    bg: "bg-amber-500/20",
    icon: TrendingUp
  }
};

const getCategoryStyle = (category) => {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES["Ghiduri"];
};

export default function BlogPage() {
  const { postId } = useParams();
  const [posts, setPosts] = useState([]);
  const [post, setPost] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [postId, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes] = await Promise.all([
        axios.get(`${API_URL}/api/blog/categories`)
      ]);
      setCategories(catRes.data.categories);

      if (postId) {
        const postRes = await axios.get(`${API_URL}/api/blog/posts/${postId}`);
        setPost(postRes.data);
      } else {
        const params = selectedCategory ? `?category=${selectedCategory}` : "";
        const postsRes = await axios.get(`${API_URL}/api/blog/posts${params}`);
        setPosts(postsRes.data.posts);
      }
    } catch (error) {
      console.error("Error fetching blog data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  // Single post view with SEO
  if (postId && post) {
    const catStyle = getCategoryStyle(post.category);
    
    return (
      <div className="min-h-screen bg-[#050505]" data-testid="blog-post">
        <Helmet>
          <title>{post.title} | X67 Digital Blog</title>
          <meta name="description" content={post.excerpt} />
          <meta property="og:title" content={post.title} />
          <meta property="og:description" content={post.excerpt} />
          <meta property="og:image" content={post.cover_image} />
          <meta property="og:type" content="article" />
          <meta name="twitter:card" content="summary_large_image" />
          <link rel="canonical" href={`https://x67digital.com/blog/${post.post_id}`} />
        </Helmet>
        
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="relative">
              Înapoi la Blog
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </span>
          </Link>
          
          {post.cover_image && (
            <div className="relative rounded-2xl overflow-hidden mb-8 group">
              <img 
                src={post.cover_image} 
                alt={post.title}
                className="w-full h-64 md:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className={`absolute bottom-4 left-4 ${catStyle.bg} backdrop-blur-sm px-4 py-2 rounded-full`}>
                <span className={`${catStyle.text} font-semibold flex items-center gap-2`}>
                  <catStyle.icon className="w-4 h-4" />
                  {post.category}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-slate-500 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {new Date(post.created_at).toLocaleDateString("ro-RO", { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            <span className="text-slate-500 text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="text-emerald-400 font-medium">{post.views}</span> vizualizări
            </span>
          </div>
          
          {/* Neon Title */}
          <h1 className="text-3xl md:text-5xl font-black text-white mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-emerald-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              {post.title}
            </span>
          </h1>
          
          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-white/10">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${catStyle.gradient} flex items-center justify-center text-white font-bold shadow-lg ${catStyle.glow}`}>
              {post.author_name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="text-white font-semibold">{post.author_name}</p>
              <p className="text-slate-500 text-sm">Autor Verificat</p>
            </div>
          </div>
          
          {/* Modern Content with Neon Highlights */}
          <article className="prose prose-invert prose-lg max-w-none 
            prose-headings:bg-gradient-to-r prose-headings:from-emerald-400 prose-headings:to-cyan-400 prose-headings:bg-clip-text prose-headings:text-transparent
            prose-strong:text-emerald-400 prose-strong:font-bold
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-emerald-400
            prose-blockquote:border-l-emerald-500 prose-blockquote:bg-emerald-500/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2
            prose-code:text-cyan-400 prose-code:bg-cyan-500/10 prose-code:px-2 prose-code:py-0.5 prose-code:rounded
            prose-li:marker:text-emerald-400"
          >
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </article>
          
          {post.tags?.length > 0 && (
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3 flex-wrap">
                <Tag className="w-5 h-5 text-emerald-400" />
                {post.tags.map((tag, i) => (
                  <span 
                    key={i} 
                    className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium border border-emerald-500/20 hover:border-emerald-400/50 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>
        
        <Footer />
      </div>
    );
  }

  // Posts list view with SEO
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="blog-page">
      <Helmet>
        <title>Blog & Ghiduri | X67 Digital - Sfaturi pentru Vânzări Online</title>
        <meta name="description" content="Descoperă cele mai bune sfaturi, ghiduri și trucuri pentru a vinde mai rapid pe X67 Digital. Articole despre imobiliare, auto, electronice și multe altele." />
        <meta name="keywords" content="ghid vanzari online, sfaturi anunturi, cum sa vinzi rapid, x67 digital blog, anunturi romania" />
        <meta property="og:title" content="Blog & Ghiduri | X67 Digital" />
        <meta property="og:description" content="Sfaturi și ghiduri pentru vânzări de succes pe X67 Digital" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://x67digital.com/blog" />
      </Helmet>
      
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section with Neon Effects */}
        <div className="relative text-center mb-16 py-12">
          {/* Animated background glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-emerald-500/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-radial from-blue-500/15 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-full mb-6 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-semibold">Blog & Ghiduri Exclusive</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-white via-emerald-300 to-white bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(52,211,153,0.4)]">
                Învață să Vinzi
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(6,182,212,0.4)]">
                Ca un PRO
              </span>
            </h1>
            
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Sfaturi <span className="text-emerald-400 font-semibold">verificate</span>, trucuri 
              <span className="text-cyan-400 font-semibold"> exclusive</span> și ghiduri complete pentru a-ți maximiza vânzările
            </p>
          </div>
        </div>

        {/* Search & Categories with Neon Style */}
        <div className="flex flex-col lg:flex-row gap-4 mb-12">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută articole..."
                className="w-full h-14 pl-14 pr-6 bg-[#0A0A0A] border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all"
              />
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className={`h-14 px-6 rounded-2xl font-semibold transition-all ${
                selectedCategory === null 
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:shadow-[0_0_30px_rgba(52,211,153,0.6)]" 
                  : "border-white/10 hover:border-emerald-500/50"
              }`}
            >
              Toate
            </Button>
            {categories.map((cat) => {
              const style = getCategoryStyle(cat.name);
              const Icon = style.icon;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-14 px-6 rounded-2xl font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id 
                      ? `bg-gradient-to-r ${style.gradient} text-white shadow-lg ${style.glow}` 
                      : `border-white/10 text-slate-400 hover:${style.text} hover:border-current`
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {cat.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Posts Grid with Neon Cards */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block">
              <BookOpen className="w-20 h-20 text-slate-700 mx-auto mb-6" />
              <div className="absolute inset-0 w-20 h-20 bg-emerald-500/20 rounded-full blur-2xl mx-auto"></div>
            </div>
            <p className="text-slate-400 text-lg">Nu există articole în această categorie</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => {
              const catStyle = getCategoryStyle(post.category);
              const Icon = catStyle.icon;
              
              return (
                <Link 
                  key={post.post_id} 
                  to={`/blog/${post.post_id}`}
                  className="group relative"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Card Glow Effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${catStyle.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-all duration-500`}></div>
                  
                  <div className="relative bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden group-hover:border-white/20 transition-all duration-300">
                    {/* Image */}
                    <div className="relative h-52 overflow-hidden">
                      {post.cover_image ? (
                        <img 
                          src={post.cover_image} 
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${catStyle.gradient} opacity-20 flex items-center justify-center`}>
                          <Icon className={`w-16 h-16 ${catStyle.text}`} />
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60"></div>
                      
                      {/* Category Badge */}
                      <div className={`absolute top-4 left-4 ${catStyle.bg} backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10`}>
                        <span className={`${catStyle.text} text-xs font-bold flex items-center gap-1.5`}>
                          <Icon className="w-3.5 h-3.5" />
                          {post.category}
                        </span>
                      </div>
                      
                      {/* Date Badge */}
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
                        <span className="text-slate-300 text-xs font-medium">
                          {new Date(post.created_at).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      {/* Title with Neon Effect on Hover */}
                      <h3 className="text-xl font-bold text-white mb-3 leading-tight line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-emerald-400 group-hover:to-cyan-400 group-hover:bg-clip-text transition-all duration-300">
                        {post.title}
                      </h3>
                      
                      {/* Excerpt */}
                      <p className="text-slate-400 text-sm line-clamp-3 mb-5 leading-relaxed">
                        {post.excerpt}
                      </p>
                      
                      {/* CTA */}
                      <div className={`flex items-center ${catStyle.text} text-sm font-bold group-hover:gap-3 transition-all`}>
                        <span className="relative">
                          Citește Articolul
                          <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r ${catStyle.gradient} group-hover:w-full transition-all duration-300`}></span>
                        </span>
                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        
        {/* SEO Text Section */}
        <div className="mt-20 p-8 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 rounded-3xl border border-emerald-500/10">
          <h2 className="text-2xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Resurse pentru Vânzători și Cumpărători
            </span>
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Pe X67 Digital găsești cele mai complete ghiduri pentru vânzări online în România. 
            Fie că vrei să vinzi o mașină second-hand, un apartament sau produse electronice, 
            articolele noastre te ajută să obții cel mai bun preț. Află cum să creezi anunțuri 
            care atrag atenția, cum să negociezi eficient și cum să eviți înșelătoriile online.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
