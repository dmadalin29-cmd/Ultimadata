import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function BannerCarousel({ banners = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Default banners if none provided
  const displayBanners = banners.length > 0 ? banners : [
    {
      banner_id: "default1",
      image_url: "https://images.unsplash.com/photo-1585756511089-4d495bb55a11?w=1920&h=600&fit=crop",
      title: "Găsește mașina perfectă",
      link_url: "/category/cars"
    },
    {
      banner_id: "default2",
      image_url: "https://images.unsplash.com/photo-1680503146454-0fe569cef4eb?w=1920&h=600&fit=crop",
      title: "Imobiliare de top",
      link_url: "/category/real_estate"
    },
    {
      banner_id: "default3",
      image_url: "https://images.unsplash.com/photo-1745970649957-b4b1f7fde4ea?w=1920&h=600&fit=crop",
      title: "Locuri de muncă",
      link_url: "/category/jobs"
    }
  ];

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [displayBanners.length, isTransitioning]);

  const goToPrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Auto-rotate every 4-5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      goToNext();
    }, 4500);
    return () => clearInterval(interval);
  }, [goToNext]);

  if (displayBanners.length === 0) return null;

  return (
    <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden rounded-2xl" data-testid="banner-carousel">
      {/* Banners */}
      {displayBanners.map((banner, index) => (
        <a
          key={banner.banner_id}
          href={banner.link_url || "#"}
          className={`absolute inset-0 transition-all duration-500 ease-out ${
            index === currentIndex 
              ? "opacity-100 scale-100" 
              : "opacity-0 scale-105"
          }`}
          data-testid={`banner-${index}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
          <img
            src={banner.image_url}
            alt={banner.title || "Banner"}
            className="w-full h-full object-cover"
          />
          {banner.title && (
            <div className="absolute bottom-8 left-8 z-20">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                {banner.title}
              </h2>
            </div>
          )}
        </a>
      ))}

      {/* Navigation Arrows */}
      {displayBanners.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            data-testid="banner-prev-btn"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            data-testid="banner-next-btn"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots */}
      {displayBanners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          {displayBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isTransitioning) {
                  setIsTransitioning(true);
                  setCurrentIndex(index);
                  setTimeout(() => setIsTransitioning(false), 500);
                }
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? "w-8 bg-white" 
                  : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              data-testid={`banner-dot-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
