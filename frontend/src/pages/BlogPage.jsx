import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { 
  BookOpen, Clock, Eye, Tag, ArrowLeft, 
  ChevronRight, Search
} from "lucide-react";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Single post view
  if (postId && post) {
    return (
      <div className="min-h-screen bg-[#050505]" data-testid="blog-post">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            Înapoi la Blog
          </Link>
          
          {post.cover_image && (
            <img 
              src={post.cover_image} 
              alt={post.title}
              className="w-full h-64 md:h-96 object-cover rounded-2xl mb-8"
            />
          )}
          
          <div className="flex items-center gap-4 mb-4">
            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
              {categories.find(c => c.id === post.category)?.name || post.category}
            </span>
            <span className="text-slate-500 text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(post.created_at).toLocaleDateString("ro-RO")}
            </span>
            <span className="text-slate-500 text-sm flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views} vizualizări
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">{post.title}</h1>
          
          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {post.author_name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="text-white font-medium">{post.author_name}</p>
              <p className="text-slate-500 text-sm">Autor</p>
            </div>
          </div>
          
          <div 
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          
          {post.tags?.length > 0 && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-slate-400" />
                {post.tags.map((tag, i) => (
                  <span key={i} className="bg-white/5 text-slate-400 px-3 py-1 rounded-full text-sm">
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

  // Posts list view
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="blog-page">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full mb-4">
            <BookOpen className="w-5 h-5" />
            Blog & Ghiduri
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Învață să Vinzi Mai Rapid
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Sfaturi, trucuri și ghiduri complete pentru a-ți vinde produsele mai eficient
          </p>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută articole..."
              className="w-full h-12 pl-12 pr-4 bg-[#0A0A0A] border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? "bg-blue-600" : "border-white/10"}
            >
              Toate
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? "bg-blue-600" : "border-white/10 text-slate-400"}
              >
                {cat.icon} {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nu există articole în această categorie</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Link 
                key={post.post_id} 
                to={`/blog/${post.post_id}`}
                className="group bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all"
              >
                {post.cover_image ? (
                  <img 
                    src={post.cover_image} 
                    alt={post.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-blue-400" />
                  </div>
                )}
                
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                      {categories.find(c => c.id === post.category)?.name || post.category}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {new Date(post.created_at).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center text-blue-400 text-sm font-medium">
                    Citește mai mult
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
