import { ShieldCheck, Star, Zap, Award, Clock, Crown } from "lucide-react";

const BADGE_CONFIG = {
  verified_identity: {
    icon: ShieldCheck,
    label: "Verificat",
    color: "text-green-400",
    bg: "bg-green-500/20",
    description: "Identitate verificată cu act"
  },
  top_seller: {
    icon: Crown,
    label: "Top Seller",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    description: "Rating 4.5+ cu 10+ recenzii"
  },
  trusted_seller: {
    icon: Award,
    label: "De Încredere",
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    description: "Rating 4.0+ cu 5+ recenzii"
  },
  fast_responder: {
    icon: Zap,
    label: "Răspunde Rapid",
    color: "text-purple-400",
    bg: "bg-purple-500/20",
    description: "Răspunde în medie în 2 ore"
  },
  power_seller: {
    icon: Star,
    label: "Power Seller",
    color: "text-orange-400",
    bg: "bg-orange-500/20",
    description: "20+ anunțuri și rating 4.0+"
  },
  new_seller: {
    icon: Clock,
    label: "Nou",
    color: "text-slate-400",
    bg: "bg-slate-500/20",
    description: "Vânzător nou pe platformă"
  },
  premium_member: {
    icon: Crown,
    label: "Premium",
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    description: "Membru premium activ"
  }
};

// Single badge component
export function Badge({ badgeId, size = "sm", showLabel = true }) {
  const config = BADGE_CONFIG[badgeId];
  if (!config) return null;
  
  const Icon = config.icon;
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };
  
  if (!showLabel) {
    return (
      <div 
        className={`${config.bg} p-1 rounded-full`} 
        title={config.description}
      >
        <Icon className={`${sizeClasses[size]} ${config.color}`} />
      </div>
    );
  }
  
  return (
    <div 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.color} text-xs font-medium`}
      title={config.description}
    >
      <Icon className={sizeClasses[size]} />
      <span>{config.label}</span>
    </div>
  );
}

// Badge list component
export function BadgeList({ badges = [], size = "sm", showLabel = true, maxDisplay = 3 }) {
  if (!badges || badges.length === 0) return null;
  
  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;
  
  return (
    <div className="flex flex-wrap items-center gap-1">
      {displayBadges.map(badgeId => (
        <Badge key={badgeId} badgeId={badgeId} size={size} showLabel={showLabel} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-slate-500">+{remaining}</span>
      )}
    </div>
  );
}

// Seller info with badges
export function SellerBadges({ seller, size = "sm" }) {
  if (!seller) return null;
  
  const badges = seller.badges || [];
  
  // Always show verified first if present
  const sortedBadges = [...badges].sort((a, b) => {
    if (a === "verified_identity") return -1;
    if (b === "verified_identity") return 1;
    if (a === "top_seller") return -1;
    if (b === "top_seller") return 1;
    return 0;
  });
  
  return <BadgeList badges={sortedBadges} size={size} />;
}

// Compact badge display for ad cards
export function CompactBadges({ badges = [] }) {
  if (!badges || badges.length === 0) return null;
  
  // Priority badges to show
  const priorityBadges = ["verified_identity", "top_seller", "trusted_seller"];
  const displayBadge = priorityBadges.find(b => badges.includes(b));
  
  if (!displayBadge) return null;
  
  return <Badge badgeId={displayBadge} size="xs" showLabel={false} />;
}

export default Badge;
