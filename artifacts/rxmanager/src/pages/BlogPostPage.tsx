import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useGetBlogPostBySlug } from "@workspace/api-client-react";
import type { BlogPost } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { storageUrl } from "@/lib/storage";
import { AdsenseSlot } from "@/components/PromoSlots";
import { ArrowLeft, Calendar, Newspaper, Tag } from "lucide-react";
import { renderMarkdown } from "./admin/AdminBlogPage";

type EnrichedPost = BlogPost & {
  seoTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  tags?: string | null;
  category?: string | null;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Inject / update a <meta> tag by name or property
function setMeta(nameOrProp: string, content: string, isProp = false) {
  const attr = isProp ? "property" : "name";
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(nameOrProp: string, isProp = false) {
  const attr = isProp ? "property" : "name";
  document.querySelector(`meta[${attr}="${nameOrProp}"]`)?.remove();
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function removeLink(rel: string) {
  document.querySelector(`link[rel="${rel}"]`)?.remove();
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const { data: rawPost, isLoading, isError } = useGetBlogPostBySlug(slug);
  const post = rawPost as EnrichedPost;

  // Inject SEO meta tags into <head>, restoring prior values on unmount
  useEffect(() => {
    if (!post) return;

    // Track cleanup actions so we restore—not unconditionally remove—pre-existing tags
    const cleanups: Array<() => void> = [];

    const applyMeta = (nameOrProp: string, content: string, isProp = false) => {
      const attr = isProp ? "property" : "name";
      const existing = document.querySelector<HTMLMetaElement>(`meta[${attr}="${nameOrProp}"]`);
      if (existing) {
        const prev = existing.getAttribute("content") ?? "";
        existing.setAttribute("content", content);
        cleanups.push(() => existing.setAttribute("content", prev));
      } else {
        const el = document.createElement("meta");
        el.setAttribute(attr, nameOrProp);
        el.setAttribute("content", content);
        document.head.appendChild(el);
        cleanups.push(() => el.remove());
      }
    };

    const applyLink = (rel: string, href: string) => {
      const existing = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (existing) {
        const prev = existing.getAttribute("href") ?? "";
        existing.setAttribute("href", href);
        cleanups.push(() => existing.setAttribute("href", prev));
      } else {
        const el = document.createElement("link");
        el.setAttribute("rel", rel);
        el.setAttribute("href", href);
        document.head.appendChild(el);
        cleanups.push(() => el.remove());
      }
    };

    const prevTitle = document.title;
    cleanups.push(() => { document.title = prevTitle; });

    const effectiveTitle = post.seoTitle || post.title || "Blog";
    const effectiveDesc = post.metaDescription || post.excerpt || "";
    const coverImg = storageUrl(post.coverImageUrl) ?? "";

    document.title = effectiveTitle;
    applyMeta("og:title", effectiveTitle, true);
    applyMeta("og:type", "article", true);
    applyMeta("twitter:card", "summary_large_image");
    applyMeta("twitter:title", effectiveTitle);
    if (effectiveDesc) {
      applyMeta("description", effectiveDesc);
      applyMeta("og:description", effectiveDesc, true);
      applyMeta("twitter:description", effectiveDesc);
    }
    if (coverImg) {
      applyMeta("og:image", coverImg, true);
      applyMeta("twitter:image", coverImg);
    }
    if (post.canonicalUrl) applyLink("canonical", post.canonicalUrl);
    if (post.focusKeyword) applyMeta("keywords", post.focusKeyword);

    return () => cleanups.forEach(fn => fn());
  }, [post]);

  const tags = post?.tags ? post.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="mb-6 gap-1.5"><ArrowLeft className="h-4 w-4" />Back to Blog</Button>
        </Link>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Loading…</p>
        ) : isError || !post ? (
          <div className="text-center py-16">
            <Newspaper className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Article not found.</p>
          </div>
        ) : (
          <article>
            {/* Category */}
            {post.category && (
              <Badge variant="outline" className="mb-4">{post.category}</Badge>
            )}

            <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
              {post.authorName && <span>· By {post.authorName}</span>}
            </div>

            {/* Excerpt / description */}
            {post.excerpt && (
              <p className="mt-4 text-muted-foreground italic border-l-4 border-primary/30 pl-3 text-base">
                {post.excerpt}
              </p>
            )}

            {/* Cover image */}
            {storageUrl(post.coverImageUrl) && (
              <img
                src={storageUrl(post.coverImageUrl)}
                alt={post.title}
                className="w-full rounded-xl mt-6 object-cover max-h-96"
              />
            )}

            {/* Content — rendered as Markdown */}
            <div
              className="mt-8 text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content ?? "") }}
            />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-10 pt-6 border-t">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                {tags.map((t: string) => (
                  <Badge key={t} variant="secondary">#{t}</Badge>
                ))}
              </div>
            )}

            <AdsenseSlot position="blog_detail" className="mt-8" />
          </article>
        )}
      </div>
    </PublicLayout>
  );
}
