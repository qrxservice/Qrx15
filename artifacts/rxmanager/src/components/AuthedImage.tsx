import { useEffect, useState } from "react";
import { fetchObjectBlobUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface AuthedImageProps {
  path?: string | null;
  alt?: string;
  className?: string;
}

/**
 * Renders a PRIVATE stored object (e.g. chat media) by fetching it with the
 * doctor's bearer token and showing the resulting blob URL. Plain `<img src>`
 * can't be used for private objects because the browser won't attach the
 * localStorage auth token to image requests.
 */
export function AuthedImage({ path, alt, className }: AuthedImageProps) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | undefined;
    setSrc(undefined);
    fetchObjectBlobUrl(path)
      .then((url) => {
        objectUrl = url;
        if (revoked) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!src) return <div className={cn("animate-pulse bg-muted", className)} />;
  return <img src={src} alt={alt} className={className} />;
}
