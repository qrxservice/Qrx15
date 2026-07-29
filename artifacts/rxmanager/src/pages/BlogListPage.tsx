import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useListBlogPosts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { storageUrl } from "@/lib/storage";
import { Newspaper, Calendar } from "lucide-react";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BlogListPage() {
  const { data: posts, isLoading } = useListBlogPosts();

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Newspaper className="h-7 w-7 text-primary" />Blog
          </h1>
          <p className="text-muted-foreground mt-2">Health tips, platform updates, and medical insights</p>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-16">Loading…</p>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No articles published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  {storageUrl(post.coverImageUrl) ? (
                    <img src={storageUrl(post.coverImageUrl)} alt={post.title} className="h-44 w-full object-cover" />
                  ) : (
                    <div className="h-44 w-full bg-gradient-to-br from-primary/15 via-muted to-secondary/15 flex items-center justify-center">
                      <Newspaper className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h2 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">{post.title}</h2>
                    {post.excerpt && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.excerpt}</p>}
                    <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(post.publishedAt ?? post.createdAt)}</span>
                      {post.authorName && <span>· {post.authorName}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
