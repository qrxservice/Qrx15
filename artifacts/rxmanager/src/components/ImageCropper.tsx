import { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn } from "lucide-react";

const BOX = 288;
const OUT = 512;

interface ImageCropperProps {
  open: boolean;
  src: string | null;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

export function ImageCropper({ open, src, onCancel, onCropped }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (open) { setZoom(1); setOffset({ x: 0, y: 0 }); setNatural({ w: 0, h: 0 }); }
  }, [open, src]);

  const baseScale = natural.w && natural.h ? Math.max(BOX / natural.w, BOX / natural.h) : 1;
  const effScale = baseScale * zoom;
  const dispW = natural.w * effScale;
  const dispH = natural.h * effScale;

  const clamp = useCallback((x: number, y: number) => {
    const maxX = Math.max(0, (dispW - BOX) / 2);
    const maxY = Math.max(0, (dispH - BOX) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }, [dispW, dispH]);

  useEffect(() => { setOffset(o => clamp(o.x, o.y)); }, [zoom, natural, clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset(clamp(drag.current.ox + dx, drag.current.oy + dy));
  };
  const onPointerUp = () => { drag.current = null; };

  const handleConfirm = () => {
    if (!imgRef.current || !natural.w) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageLeft = (BOX - dispW) / 2 + offset.x;
    const imageTop = (BOX - dispH) / 2 + offset.y;
    const sx = (0 - imageLeft) / effScale;
    const sy = (0 - imageTop) / effScale;
    const sSize = BOX / effScale;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCropped(new File([blob], "profile.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Adjust your photo</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-full bg-muted touch-none cursor-move select-none"
            style={{ width: BOX, height: BOX }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src && (
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                draggable={false}
                onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                style={{
                  position: "absolute",
                  width: dispW || BOX,
                  height: dispH || BOX,
                  left: (BOX - dispW) / 2 + offset.x,
                  top: (BOX - dispH) / 2 + offset.y,
                  maxWidth: "none",
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70" />
          </div>
          <div className="flex w-full items-center gap-3">
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm}>Save Photo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
