import { Star } from "lucide-react";
import { cn } from "../lib/utils";

export function StarRating({ 
  rating, 
  maxStars = 5, 
  size = "md",
  interactive = false,
  onRatingChange = null,
  showValue = false,
  className = ""
}) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-6 h-6"
  };

  const handleClick = (index) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[...Array(maxStars)].map((_, index) => {
        const filled = index < Math.floor(rating);
        const partial = !filled && index < rating;
        
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            disabled={!interactive}
            className={cn(
              "transition-colors",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                filled && "fill-yellow-400 text-yellow-400",
                partial && "fill-yellow-400/50 text-yellow-400",
                !filled && !partial && "text-slate-600",
                interactive && "hover:text-yellow-400"
              )}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1.5 text-sm text-slate-400">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function RatingBadge({ rating, totalReviews, size = "sm" }) {
  if (!rating && !totalReviews) return null;
  
  return (
    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2 py-1 rounded-full">
      <Star className={cn(
        "fill-yellow-400 text-yellow-400",
        size === "sm" ? "w-3 h-3" : "w-4 h-4"
      )} />
      <span className={cn(
        "font-medium text-yellow-400",
        size === "sm" ? "text-xs" : "text-sm"
      )}>
        {rating?.toFixed(1) || "0.0"}
      </span>
      {totalReviews > 0 && (
        <span className={cn(
          "text-slate-500",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          ({totalReviews})
        </span>
      )}
    </div>
  );
}

export function RatingDistribution({ distribution, totalReviews }) {
  const maxCount = Math.max(...Object.values(distribution), 1);
  
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[stars] || 0;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        
        return (
          <div key={stars} className="flex items-center gap-2">
            <span className="text-sm text-slate-400 w-3">{stars}</span>
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
