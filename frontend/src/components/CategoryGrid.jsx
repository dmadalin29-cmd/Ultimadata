import { Link } from "react-router-dom";
import { 
  Heart, 
  Home, 
  Car, 
  Briefcase, 
  Smartphone, 
  Shirt, 
  Wrench, 
  Dog,
  ArrowRight
} from "lucide-react";

const categoryIcons = {
  escorts: Heart,
  real_estate: Home,
  cars: Car,
  jobs: Briefcase,
  electronics: Smartphone,
  fashion: Shirt,
  services: Wrench,
  animals: Dog
};

const categoryImages = {
  escorts: "https://images.unsplash.com/photo-1646510132660-949a5ff59d14?w=600&h=400&fit=crop",
  real_estate: "https://images.unsplash.com/photo-1680503146454-0fe569cef4eb?w=600&h=400&fit=crop",
  cars: "https://images.unsplash.com/photo-1585756511089-4d495bb55a11?w=600&h=400&fit=crop",
  jobs: "https://images.unsplash.com/photo-1745970649957-b4b1f7fde4ea?w=600&h=400&fit=crop",
  electronics: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop",
  fashion: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&h=400&fit=crop",
  services: "https://images.unsplash.com/photo-1760714132377-bfb0f6b3d892?w=600&h=400&fit=crop",
  animals: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop"
};

export default function CategoryGrid({ categories = [] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6" data-testid="category-grid">
      {categories.map((category, index) => {
        const Icon = categoryIcons[category.id] || Briefcase;
        const isLarge = index < 2; // First two categories are larger
        
        return (
          <Link
            key={category.id}
            to={`/category/${category.id}`}
            className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
              isLarge ? "col-span-2 sm:col-span-2 md:col-span-2 md:row-span-2" : ""
            }`}
            style={{ 
              aspectRatio: isLarge ? "16/9" : "4/3",
              minHeight: isLarge ? "180px" : "120px"
            }}
            data-testid={`category-card-${category.id}`}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img
                src={categoryImages[category.id] || categoryImages.services}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              {/* Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 group-hover:opacity-90"
              />
              {/* Color overlay */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{ backgroundColor: category.color }}
              />
            </div>

            {/* Content */}
            <div className="absolute inset-0 p-3 sm:p-4 md:p-6 flex flex-col justify-end">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div 
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${category.color}30` }}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" style={{ color: category.color }} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg md:text-2xl font-bold text-white leading-tight">
                    {category.name}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm hidden sm:block">
                    {category.subcategories?.length || 0} subcategorii
                  </p>
                </div>
              </div>

              {/* Subcategories preview */}
              {isLarge && category.subcategories && (
                <div className="flex flex-wrap gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {category.subcategories.slice(0, 4).map((sub) => (
                    <span 
                      key={sub.id}
                      className="px-3 py-1 rounded-full text-xs text-white/80 bg-white/10 backdrop-blur-sm"
                    >
                      {sub.name}
                    </span>
                  ))}
                  {category.subcategories.length > 4 && (
                    <span className="px-3 py-1 rounded-full text-xs text-white/80 bg-white/10 backdrop-blur-sm">
                      +{category.subcategories.length - 4} altele
                    </span>
                  )}
                </div>
              )}

              {/* Arrow */}
              <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
