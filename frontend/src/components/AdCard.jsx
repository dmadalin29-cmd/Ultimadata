import { Link } from "react-router-dom";
import { MapPin, Eye, Clock, Zap, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

export default function AdCard({ ad }) {
  const {
    ad_id,
    title,
    price,
    price_type,
    city_name,
    category_name,
    category_color,
    images = [],
    views = 0,
    created_at,
    is_boosted,
    is_promoted,
    user_rating,
    user_reviews
  } = ad;

  const formatPrice = () => {
    if (price_type === "free") return "Gratuit";
    if (price_type === "negotiable") return price ? `${price.toLocaleString("ro-RO")} € (neg.)` : "Negociabil";
    return price ? `${price.toLocaleString("ro-RO")} €` : "Preț la cerere";
  };

  const timeAgo = created_at 
    ? formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: ro })
    : "";

  const defaultImage = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop";

  return (
    <Link
      to={`/ad/${ad_id}`}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#0A0A0A] border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
        is_boosted 
          ? "border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.15)]" 
          : "border-white/5 hover:border-white/10"
      }`}
      data-testid={`ad-card-${ad_id}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={images[0] || defaultImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.target.src = defaultImage;
          }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-wrap gap-1 sm:gap-2">
          {is_promoted && (
            <span className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-blue-600 text-white text-[10px] sm:text-xs font-medium shadow-lg">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Promovat</span>
            </span>
          )}
          {is_boosted && (
            <span className="flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-fuchsia-600 text-white text-[10px] sm:text-xs font-medium shadow-lg">
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Ridicat</span>
            </span>
          )}
        </div>

        {/* Category badge */}
        {category_name && (
          <span 
            className="absolute top-2 sm:top-3 right-2 sm:right-3 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium backdrop-blur-sm hidden sm:block"
            style={{ 
              backgroundColor: `${category_color}20`,
              color: category_color,
              border: `1px solid ${category_color}40`
            }}
          >
            {category_name}
          </span>
        )}

        {/* Price */}
        <div className="absolute bottom-3 left-3">
          <span className={`text-xl font-bold ${price_type === "free" ? "text-emerald-400" : "text-white"}`}>
            {formatPrice()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-medium line-clamp-2 mb-3 group-hover:text-blue-400 transition-colors">
          {title}
        </h3>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-4 h-4" />
            <span>{city_name || "România"}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            {user_rating > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                <span className="text-xs">{user_rating.toFixed(1)}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {views}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
