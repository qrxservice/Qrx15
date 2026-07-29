import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { storageUrl } from "@/lib/storage";

interface SliderItem {
  id: number;
  title: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  description?: string | null;
  position?: string | null;
  autoPlay: boolean;
  slideInterval: number;
  showArrows: boolean;
  showDots: boolean;
  desktopWidth?: number | null;
  desktopHeight?: number | null;
  mobileWidth?: number | null;
  mobileHeight?: number | null;
  tabletWidth?: number | null;
  tabletHeight?: number | null;
  customWidth?: number | null;
  customHeight?: number | null;
}

interface HomepageSliderProps {
  slides: SliderItem[];
  className?: string;
  /** If true, a single slide's settings drive the whole group's controls */
  groupSlide?: SliderItem;
}

function useSlider(count: number, autoPlay: boolean, interval: number) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number) => {
    setCurrent(((idx % count) + count) % count);
  }, [count]);

  const prev = useCallback(() => go(current - 1), [current, go]);
  const next = useCallback(() => go(current + 1), [current, go]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoPlay && count > 1) {
      timerRef.current = setInterval(() => setCurrent(c => (c + 1) % count), interval);
    }
  }, [autoPlay, count, interval]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const handlePrev = useCallback(() => { prev(); resetTimer(); }, [prev, resetTimer]);
  const handleNext = useCallback(() => { next(); resetTimer(); }, [next, resetTimer]);
  const handleGo = useCallback((i: number) => { go(i); resetTimer(); }, [go, resetTimer]);

  return { current, handlePrev, handleNext, handleGo };
}

function SlideFrame({ slide, active }: { slide: SliderItem; active: boolean }) {
  const imgSrc = storageUrl(slide.imageUrl) ?? slide.imageUrl ?? "";
  const content = (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 sm:p-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
      {slide.title && (
        <h2 className="text-white text-xl sm:text-3xl md:text-5xl font-bold drop-shadow-lg max-w-3xl leading-tight">
          {slide.title}
        </h2>
      )}
      {slide.description && (
        <p className="text-white/90 mt-3 text-sm sm:text-base max-w-xl drop-shadow">{slide.description}</p>
      )}
      {slide.buttonText && (
        <Button className="mt-5 sm:mt-6" size="lg">
          {slide.buttonText}
        </Button>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-700",
        active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
      )}
    >
      {imgSrc ? (
        <img src={imgSrc} alt={slide.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30" />
      )}
      {slide.linkUrl ? (
        <a href={slide.linkUrl} target="_blank" rel="noreferrer" className="absolute inset-0">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

export function HomepageSlider({ slides, className, groupSlide }: HomepageSliderProps) {
  const ctrl = groupSlide ?? slides[0];
  if (!ctrl || slides.length === 0) return null;

  const { current, handlePrev, handleNext, handleGo } = useSlider(
    slides.length,
    ctrl.autoPlay,
    ctrl.slideInterval,
  );

  const desktopH = ctrl.customHeight ?? ctrl.desktopHeight ?? 480;
  const mobileH = ctrl.mobileHeight ?? Math.round(desktopH * 0.6);

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-lg", className)}
      style={{ height: `${desktopH}px` }}
    >
      <style>{`
        @media (max-width: 640px) {
          .slider-root-${ctrl.id} { height: ${mobileH}px !important; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
          .slider-root-${ctrl.id} { height: ${ctrl.tabletHeight ?? Math.round(desktopH * 0.8)}px !important; }
        }
      `}</style>
      <div className={`slider-root-${ctrl.id} relative w-full h-full`}>
        {slides.map((slide, i) => (
          <SlideFrame key={slide.id} slide={slide} active={i === current} />
        ))}

        {ctrl.showArrows && slides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 sm:p-2 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 sm:p-2 transition-colors"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}

        {ctrl.showDots && slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => handleGo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "rounded-full transition-all",
                  i === current
                    ? "bg-white w-5 h-2"
                    : "bg-white/50 hover:bg-white/80 w-2 h-2"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SliderGroupProps {
  slides: SliderItem[];
  position: string;
  className?: string;
}

export function SliderGroup({ slides, position, className }: SliderGroupProps) {
  const positionSlides = slides.filter(s => s.position === position);
  if (positionSlides.length === 0) return null;

  const first = positionSlides[0];
  const isFullWidth = position === "full_width";
  const isHero = position === "hero";

  return (
    <div className={cn(
      isFullWidth || isHero ? "w-full" : "container mx-auto px-4",
      className
    )}>
      <HomepageSlider
        slides={positionSlides}
        groupSlide={first}
        className={cn(isFullWidth || isHero ? "rounded-none" : "rounded-lg")}
      />
    </div>
  );
}
