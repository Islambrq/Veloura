import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export interface HeroSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaTo: string;
  image: string;
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Auto-advance every 5s, pausing is unnecessary for a 2-3 slide banner.
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const next = (active + 1) % slides.length;
      track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(id);
  }, [active, slides.length]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActive(index);
  }

  return (
    <div className="relative">
      <div ref={trackRef} className="carousel" onScroll={handleScroll}>
        {slides.map((slide, i) => (
          <div key={i} className="carousel-slide">
            <div className="relative aspect-[4/5] sm:aspect-[16/7] overflow-hidden">
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10 text-porcelain">
                <p className="font-mono text-[11px] uppercase tracking-widest text-porcelain/70 mb-2">
                  {slide.eyebrow}
                </p>
                <h2 className="font-display text-2xl sm:text-4xl leading-tight mb-2 max-w-md">
                  {slide.title}
                </h2>
                <p className="text-sm text-porcelain/80 mb-4 max-w-sm">{slide.subtitle}</p>
                <Link to={slide.ctaTo} className="btn-accent rounded-full px-5 py-2 text-sm inline-flex">
                  {slide.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={`carousel-dot ${i === active ? 'carousel-dot--active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
