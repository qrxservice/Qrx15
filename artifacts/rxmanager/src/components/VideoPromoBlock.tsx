import { useListVideoPromotions } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { useState } from "react";

interface VideoPromotion {
  id: number;
  title: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  position: string;
  isActive: boolean;
  desktopWidth?: number | null;
  desktopHeight?: number | null;
  mobileWidth?: number | null;
  mobileHeight?: number | null;
}

function getEmbedInfo(url: string): { kind: "youtube" | "vimeo" | "direct" | "iframe"; src: string } {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}?dnt=1` };
  if (/\.(mp4|webm|ogg)([?#]|$)/i.test(url)) return { kind: "direct", src: url };
  return { kind: "iframe", src: url };
}

/** Safely append a query param regardless of whether URL already has `?` */
function withParam(url: string, param: string) {
  return url.includes("?") ? `${url}&${param}` : `${url}?${param}`;
}

function VideoPlayer({ promo }: { promo: VideoPromotion }) {
  const [playing, setPlaying] = useState(false);

  const desktopH = promo.desktopHeight ?? 400;
  const mobileH = promo.mobileHeight ?? 220;
  const desktopW = promo.desktopWidth ? `${promo.desktopWidth}px` : "100%";
  const mobileW = promo.mobileWidth ? `${promo.mobileWidth}px` : "100%";

  if (!promo.videoUrl) return null;

  const { kind, src } = getEmbedInfo(promo.videoUrl);

  const ytId = kind === "youtube"
    ? promo.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
    : null;

  const thumbnailSrc =
    promo.thumbnailUrl ||
    (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);

  // Scoped responsive styles via a unique element id
  const uid = `vp-${promo.id}`;

  const responsiveStyle = (
    <style>{`
      #${uid}-wrap { height: ${mobileH}px; max-width: ${mobileW}; }
      @media (min-width: 768px) { #${uid}-wrap { height: ${desktopH}px; max-width: ${desktopW}; } }
    `}</style>
  );

  if (kind === "direct") {
    return (
      <>
        {responsiveStyle}
        <div id={`${uid}-wrap`} className="w-full overflow-hidden rounded-xl shadow-md mx-auto">
          <video
            src={src}
            poster={promo.thumbnailUrl ?? undefined}
            controls
            className="w-full h-full object-cover"
            title={promo.title}
          />
        </div>
      </>
    );
  }

  if (!playing && thumbnailSrc) {
    return (
      <>
        {responsiveStyle}
        <div
          id={`${uid}-wrap`}
          className="relative w-full overflow-hidden rounded-xl shadow-md cursor-pointer group mx-auto"
          onClick={() => setPlaying(true)}
          role="button"
          aria-label={`Play ${promo.title}`}
        >
          <img
            src={thumbnailSrc}
            alt={promo.title}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Play className="h-7 w-7 text-gray-900 fill-gray-900 ml-1" />
            </div>
          </div>
        </div>
      </>
    );
  }

  const autoplaySrc = playing ? withParam(src, "autoplay=1") : src;

  return (
    <>
      {responsiveStyle}
      <div id={`${uid}-wrap`} className="w-full overflow-hidden rounded-xl shadow-md mx-auto">
        <iframe
          src={autoplaySrc}
          title={promo.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </>
  );
}

interface VideoPromoBlockProps {
  position: string;
  className?: string;
}

export function VideoPromoBlock({ position, className }: VideoPromoBlockProps) {
  const { data } = useListVideoPromotions({ position });
  const promos: VideoPromotion[] = Array.isArray(data) ? (data as VideoPromotion[]) : [];
  if (promos.length === 0) return null;

  return (
    <div className={cn("w-full", className)}>
      {promos.map(promo => (
        <div key={promo.id} className="container mx-auto px-4 py-4">
          <VideoPlayer promo={promo} />
          {promo.title && (
            <p className="text-center text-sm text-muted-foreground mt-2 font-medium">{promo.title}</p>
          )}
        </div>
      ))}
    </div>
  );
}
