import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { StarRating, RatingBadge, RatingDistribution } from "../components/StarRating";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { 
  User, 
  Calendar, 
  MapPin, 
  MessageCircle, 
  Star,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ro } from "date-fns/locale";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SellerProfilePage() {
  const { sellerId } = useParams();
  const { user } = useAuth();
  
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [sellerAds, setSellerAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sellerId) {
      fetchSellerData();
      fetchSellerAds();
    }
  }, [sellerId, page]);

  const fetchSellerData = async () => {
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/reviews/seller/${sellerId}?page=${page}`),
        axios.get(`${API_URL}/api/reviews/user/${sellerId}/stats`)
      ]);
      
      setSeller(reviewsRes.data.seller);
      setReviews(reviewsRes.data.reviews);
      setTotalPages(reviewsRes.data.pages);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching seller data:", error);
      toast.error("Eroare la încărcarea datelor");
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerAds = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ads?user_id=${sellerId}&status=active&limit=6`);
      setSellerAds(response.data.ads || []);
    } catch (error) {
      console.error("Error fetching seller ads:", error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (newRating === 0) {
      toast.error("Te rugăm să selectezi un rating");
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/reviews`,
        {
          seller_id: sellerId,
          rating: newRating,
          comment: newComment || null
        },
        { withCredentials: true }
      );
      
      toast.success("Recenzia a fost adăugată!");
      setShowReviewForm(false);
      setNewRating(0);
      setNewComment("");
      fetchSellerData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Eroare la adăugarea recenziei");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Ești sigur că vrei să ștergi această recenzie?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/reviews/${reviewId}`, {
        withCredentials: true
      });
      toast.success("Recenzia a fost ștearsă");
      fetchSellerData();
    } catch (error) {
      toast.error("Eroare la ștergerea recenziei");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Vânzător negăsit</h1>
          <Link to="/" className="text-blue-500 hover:text-blue-400">
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  const canReview = user && user.user_id !== sellerId;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="seller-profile-page">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seller Header */}
        <div className="bg-[#0A0A0A] rounded-2xl p-6 md:p-8 border border-white/5 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {seller.picture ? (
                <img 
                  src={seller.picture} 
                  alt={seller.name} 
                  className="w-24 h-24 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {seller.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {seller.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <RatingBadge 
                  rating={seller.avg_rating} 
                  totalReviews={seller.total_reviews}
                  size="md"
                />
                
                {seller.member_since && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    Membru din {format(new Date(seller.member_since), "MMMM yyyy", { locale: ro })}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3">
                {seller.total_reviews >= 10 && seller.avg_rating >= 4.5 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm">
                    <Shield className="w-4 h-4" />
                    Vânzător de încredere
                  </div>
                )}
                
                {sellerAds.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm">
                    {sellerAds.length} anunțuri active
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column - Stats & Rating Distribution */}
          <div className="space-y-6">
            {/* Rating Stats */}
            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4">Rating General</h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl font-bold text-white">
                  {stats?.avg_rating?.toFixed(1) || "0.0"}
                </div>
                <div>
                  <StarRating rating={stats?.avg_rating || 0} size="lg" />
                  <p className="text-sm text-slate-400 mt-1">
                    {stats?.total_reviews || 0} recenzii
                  </p>
                </div>
              </div>
              
              {stats?.distribution && (
                <RatingDistribution 
                  distribution={stats.distribution} 
                  totalReviews={stats.total_reviews}
                />
              )}
            </div>

            {/* Write Review Button */}
            {canReview && !showReviewForm && (
              <Button
                onClick={() => setShowReviewForm(true)}
                className="w-full bg-blue-600 hover:bg-blue-500"
                data-testid="write-review-btn"
              >
                <Star className="w-4 h-4 mr-2" />
                Scrie o recenzie
              </Button>
            )}
          </div>

          {/* Right Column - Reviews */}
          <div className="md:col-span-2 space-y-6">
            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Lasă o recenzie
                </h3>
                
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Rating
                    </label>
                    <StarRating
                      rating={newRating}
                      size="xl"
                      interactive
                      onRatingChange={setNewRating}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Comentariu (opțional)
                    </label>
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Descrie experiența ta cu acest vânzător..."
                      className="bg-[#121212] border-white/10 text-white min-h-[100px]"
                      data-testid="review-comment-input"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowReviewForm(false)}
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      Anulează
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || newRating === 0}
                      className="bg-blue-600 hover:bg-blue-500"
                      data-testid="submit-review-btn"
                    >
                      {submitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Trimite recenzia"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Reviews List */}
            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-6">
                Recenzii ({stats?.total_reviews || 0})
              </h2>
              
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">
                    Acest vânzător nu are încă recenzii
                  </p>
                  {canReview && (
                    <p className="text-slate-500 text-sm mt-2">
                      Fii primul care lasă o recenzie!
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div 
                      key={review.review_id}
                      className="pb-6 border-b border-white/5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        {review.reviewer_picture ? (
                          <img 
                            src={review.reviewer_picture} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">
                              {review.reviewer_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                {formatDistanceToNow(new Date(review.created_at), { 
                                  addSuffix: true, 
                                  locale: ro 
                                })}
                              </span>
                              {(user?.user_id === review.reviewer_id || user?.role === "admin") && (
                                <button
                                  onClick={() => handleDeleteReview(review.review_id)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Șterge
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <StarRating rating={review.rating} size="sm" className="mb-2" />
                          
                          {review.comment && (
                            <p className="text-slate-300 text-sm">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="text-sm text-slate-400">
                    Pagina {page} din {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Seller's Active Ads */}
            {sellerAds.length > 0 && (
              <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-white/5">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Anunțuri active
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sellerAds.map((ad) => (
                    <Link
                      key={ad.ad_id}
                      to={`/ad/${ad.ad_id}`}
                      className="group"
                    >
                      <div className="aspect-video rounded-xl bg-slate-800 overflow-hidden mb-2">
                        {ad.images?.[0] ? (
                          <img 
                            src={ad.images[0]} 
                            alt={ad.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-slate-600">Fără imagine</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm text-white group-hover:text-blue-400 truncate">
                        {ad.title}
                      </h3>
                      <p className="text-sm text-emerald-400 font-medium">
                        {ad.price ? `${ad.price} €` : "Preț la cerere"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
