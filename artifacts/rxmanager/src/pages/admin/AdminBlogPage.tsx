import { useRef, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useListBlogPosts, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost,
  getListBlogPostsQueryKey,
} from "@workspace/api-client-react";
import type { BlogPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";
import { storageUrl, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import {
  Newspaper, Loader2, Image as ImageIcon, Pencil, Trash2, Plus, X,
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Link2, Code, Minus, Eye, FileText, Search, Tag,
} from "lucide-react";

// ---- SEO-extended type ----
type BlogPostSeo = {
  seoTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  tags?: string | null;
  category?: string | null;
};
type EnrichedPost = BlogPost & BlogPostSeo;

// ---- Markdown renderer (basic, no dependency, XSS-safe) ----
export function renderMarkdown(md: string): string {
  if (!md.trim()) return "";

  // 1. Extract code blocks first (their content is separately escaped)
  const codeBlocks: string[] = [];
  let text = md.replace(/```([\s\S]*?)```/g, (_, code: string) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    codeBlocks.push(escaped);
    return `\x00CODE${codeBlocks.length - 1}\x00`;
  });

  // 2. HTML-escape the remaining raw text so injected HTML/script tags are inert.
  //    Standard markdown syntax chars (*, _, #, -, [, ]) are NOT HTML-special
  //    and survive this step intact, so markdown transforms work correctly after.
  text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 3. Process lines: headings, lists, hr, and paragraph grouping
  const lines = text.split("\n");
  const output: string[] = [];
  let inUl = false;
  let inOl = false;
  let inP = false;

  const closeList = () => {
    if (inUl) { output.push("</ul>"); inUl = false; }
    if (inOl) { output.push("</ol>"); inOl = false; }
  };
  const closeParagraph = () => {
    if (inP) { output.push("</p>"); inP = false; }
  };

  for (const line of lines) {
    if (/^[-*]\s/.test(line)) {
      closeParagraph(); if (!inUl) { closeList(); output.push('<ul class="list-disc pl-6 my-3 space-y-1">'); inUl = true; }
      output.push(`<li>${line.slice(2)}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      closeParagraph(); if (!inOl) { closeList(); output.push('<ol class="list-decimal pl-6 my-3 space-y-1">'); inOl = true; }
      output.push(`<li>${line.replace(/^\d+\.\s/, "")}</li>`);
    } else if (/^####\s/.test(line)) {
      closeParagraph(); closeList(); output.push(`<h4 class="text-base font-semibold mt-5 mb-1">${line.slice(5)}</h4>`);
    } else if (/^###\s/.test(line)) {
      closeParagraph(); closeList(); output.push(`<h3 class="text-lg font-bold mt-6 mb-2">${line.slice(4)}</h3>`);
    } else if (/^##\s/.test(line)) {
      closeParagraph(); closeList(); output.push(`<h2 class="text-xl font-bold mt-7 mb-2">${line.slice(3)}</h2>`);
    } else if (/^#\s/.test(line)) {
      closeParagraph(); closeList(); output.push(`<h1 class="text-2xl font-bold mt-8 mb-3">${line.slice(2)}</h1>`);
    } else if (/^---$/.test(line.trim())) {
      closeParagraph(); closeList(); output.push('<hr class="my-6 border-border" />');
    } else if (line.trim() === "") {
      // blank line: close any open paragraph (paragraph break)
      closeParagraph(); closeList();
    } else {
      // plain text line — open a paragraph if needed, or add <br> within current one
      closeList();
      if (!inP) { output.push('<p class="mt-4 leading-relaxed">'); inP = true; }
      else output.push("<br>");
      output.push(line);
    }
  }
  closeParagraph();
  closeList();

  text = output.join("");

  // 4. Inline formatting — applied AFTER HTML escaping so these safe tags are trusted
  text = text
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
      // Sanitize href: only allow http/https/mailto schemes
      const safe = /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : "#";
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">${label}</a>`;
    });

  // 5. Restore code blocks
  text = text.replace(/\x00CODE(\d+)\x00/g, (_: string, i: string) =>
    `<pre class="bg-muted rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono whitespace-pre"><code>${codeBlocks[parseInt(i)]}</code></pre>`
  );

  return `<div class="prose-content text-foreground/90">${text}</div>`;
}

// ---- Toolbar insert helper ----
function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  before: string,
  after = "",
  placeholder = "text",
  onChange: (v: string) => void,
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = el.value.slice(start, end) || placeholder;
  const newVal = el.value.slice(0, start) + before + selected + after + el.value.slice(end);
  onChange(newVal);
  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    el.focus();
    const cur = start + before.length + selected.length + after.length;
    el.setSelectionRange(cur, cur);
  });
}

function insertLinePrefix(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  prefix: string,
  onChange: (v: string) => void,
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
  const newVal = el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart);
  onChange(newVal);
  requestAnimationFrame(() => {
    el.focus();
    const cur = start + prefix.length;
    el.setSelectionRange(cur, cur);
  });
}

// ---- Tag input ----
function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder="Type a tag and press Enter…"
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <Badge key={t} variant="secondary" className="gap-1 pl-2 pr-1">
              <Tag className="h-3 w-3" />{t}
              <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- SEO score ----
function seoScore(form: FormState): { score: number; hints: string[] } {
  let score = 0;
  const hints: string[] = [];
  const kw = form.focusKeyword.trim().toLowerCase();

  if (form.seoTitle.trim()) {
    score += 15;
    if (form.seoTitle.length <= 60) score += 10;
    else hints.push("SEO title is over 60 characters");
    if (kw && form.seoTitle.toLowerCase().includes(kw)) score += 10;
    else if (kw) hints.push("Focus keyword missing from SEO title");
  } else hints.push("Add an SEO title");

  if (form.metaDescription.trim()) {
    score += 15;
    if (form.metaDescription.length <= 160) score += 5;
    else hints.push("Meta description is over 160 characters");
    if (kw && form.metaDescription.toLowerCase().includes(kw)) score += 5;
    else if (kw) hints.push("Focus keyword missing from meta description");
  } else hints.push("Add a meta description");

  if (kw) score += 10; else hints.push("Set a focus keyword");
  if (form.tags.length > 0) score += 5; else hints.push("Add tags");
  if (form.category.trim()) score += 5; else hints.push("Set a category");
  if (form.excerpt.trim()) score += 5; else hints.push("Add an excerpt");
  if (form.slug.trim()) score += 5;
  if (kw && form.content.toLowerCase().includes(kw)) score += 10; else if (kw) hints.push("Focus keyword not found in content");

  return { score: Math.min(score, 100), hints };
}

function SeoScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-500";
  const label = score >= 70 ? "Good" : score >= 40 ? "Needs work" : "Poor";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">SEO Score</span>
        <span className={`font-bold ${color}`}>{score}/100 — {label}</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

// ---- SERP Preview ----
function SerpPreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  const displayTitle = title || "Article title";
  const displayDesc = description || "No meta description set.";
  const displayUrl = `qrx.com.bd/blog/${slug || "article-slug"}`;
  const titleOver = displayTitle.length > 60;
  const descOver = displayDesc.length > 160;
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm space-y-1 text-sm max-w-xl">
      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Google Preview</p>
      <p className="text-green-700 text-xs truncate">{displayUrl}</p>
      <p className={`text-[#1a0dab] text-lg font-normal leading-snug truncate ${titleOver ? "text-amber-700" : ""}`}>{displayTitle.slice(0, 70)}</p>
      {titleOver && <p className="text-xs text-amber-600">Title truncated — keep under 60 characters</p>}
      <p className={`text-[#4d5156] text-sm leading-relaxed line-clamp-2 ${descOver ? "text-amber-700" : ""}`}>{displayDesc.slice(0, 180)}</p>
      {descOver && <p className="text-xs text-amber-600">Description truncated — keep under 160 characters</p>}
    </div>
  );
}

// ---- Formatting toolbar ----
function FormatToolbar({ contentRef, onChange }: {
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (v: string) => void;
}) {
  const btn = (icon: React.ReactNode, title: string, action: () => void) => (
    <button type="button" title={title} onClick={action}
      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      {icon}
    </button>
  );
  const ins = (b: string, a = "", ph = "text") => () => insertAtCursor(contentRef, b, a, ph, onChange);
  const pfx = (p: string) => () => insertLinePrefix(contentRef, p, onChange);

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b bg-muted/30 rounded-t-md">
      {btn(<Bold className="h-3.5 w-3.5" />, "Bold (Ctrl+B)", ins("**", "**"))}
      {btn(<Italic className="h-3.5 w-3.5" />, "Italic (Ctrl+I)", ins("*", "*"))}
      <div className="w-px h-4 bg-border mx-0.5" />
      {btn(<Heading1 className="h-3.5 w-3.5" />, "Heading 1", pfx("# "))}
      {btn(<Heading2 className="h-3.5 w-3.5" />, "Heading 2", pfx("## "))}
      {btn(<Heading3 className="h-3.5 w-3.5" />, "Heading 3", pfx("### "))}
      <div className="w-px h-4 bg-border mx-0.5" />
      {btn(<List className="h-3.5 w-3.5" />, "Bullet list", () => insertAtCursor(contentRef, "\n- ", "", "item", onChange))}
      {btn(<ListOrdered className="h-3.5 w-3.5" />, "Numbered list", () => insertAtCursor(contentRef, "\n1. ", "", "item", onChange))}
      <div className="w-px h-4 bg-border mx-0.5" />
      {btn(<Code className="h-3.5 w-3.5" />, "Inline code", ins("`", "`", "code"))}
      {btn(<span className="text-xs font-mono font-bold leading-none">{"<>"}</span>, "Code block", ins("```\n", "\n```", "code"))}
      {btn(<Link2 className="h-3.5 w-3.5" />, "Link", () => {
        const url = prompt("URL:") ?? "https://";
        insertAtCursor(contentRef, "[", `](${url})`, "link text", onChange);
      })}
      {btn(<Minus className="h-3.5 w-3.5" />, "Horizontal rule", () => insertAtCursor(contentRef, "\n\n---\n\n", "", "", onChange))}
    </div>
  );
}

// ---- Form state ----
type FormState = {
  title: string; slug: string; excerpt: string; content: string;
  coverImageUrl: string; authorName: string; status: "draft" | "published";
  category: string; tags: string[];
  seoTitle: string; metaDescription: string; focusKeyword: string; canonicalUrl: string;
};

const EMPTY: FormState = {
  title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", authorName: "",
  status: "draft", category: "", tags: [],
  seoTitle: "", metaDescription: "", focusKeyword: "", canonicalUrl: "",
};

function tagsToArray(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(t => t.trim()).filter(Boolean);
}
function tagsToString(arr: string[]): string { return arr.join(","); }

// ---- Main page ----
export default function AdminBlogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rawPosts = useListBlogPosts({ all: "true" });
  const posts = (rawPosts.data ?? []) as EnrichedPost[];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBlogPostsQueryKey({ all: "true" }) });

  const createMut = useCreateBlogPost({ mutation: { onSuccess: invalidate } });
  const updateMut = useUpdateBlogPost({ mutation: { onSuccess: invalidate } });
  const deleteMut = useDeleteBlogPost({ mutation: { onSuccess: invalidate } });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const { uploadFile, isUploading } = useUpload({ getAuthToken: () => localStorage.getItem("auth_token") });

  const [editing, setEditing] = useState<EnrichedPost | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v })), []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (p: EnrichedPost) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug,
      excerpt: p.excerpt ?? "", content: p.content ?? "",
      coverImageUrl: p.coverImageUrl ?? "", authorName: p.authorName ?? "",
      status: p.status === "published" ? "published" : "draft",
      category: p.category ?? "", tags: tagsToArray(p.tags),
      seoTitle: p.seoTitle ?? "", metaDescription: p.metaDescription ?? "",
      focusKeyword: p.focusKeyword ?? "", canonicalUrl: p.canonicalUrl ?? "",
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY); };

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast({ title: "Unsupported file", description: "Use JPG, PNG, or WEBP.", variant: "destructive" }); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" }); return; }
    try {
      const res = await uploadFile(file);
      if (!res) throw new Error("upload failed");
      set("coverImageUrl", res.objectPath);
      toast({ title: "Cover image uploaded" });
    } catch { toast({ title: "Failed to upload image", variant: "destructive" }); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const data = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      coverImageUrl: form.coverImageUrl || null,
      authorName: form.authorName.trim() || null,
      status: form.status,
      category: form.category.trim() || null,
      tags: tagsToString(form.tags) || null,
      seoTitle: form.seoTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      focusKeyword: form.focusKeyword.trim() || null,
      canonicalUrl: form.canonicalUrl.trim() || null,
    };
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, data });
      else await createMut.mutateAsync({ data });
      toast({ title: editing ? "Post updated" : "Post created" });
      closeForm();
    } catch { toast({ title: "Failed to save post", variant: "destructive" }); }
  };

  const handleDelete = async (p: EnrichedPost) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try { await deleteMut.mutateAsync({ id: p.id }); toast({ title: "Post deleted" }); }
    catch { toast({ title: "Failed to delete post", variant: "destructive" }); }
  };

  const { score, hints } = seoScore(form);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="h-6 w-6 text-primary" />Blog</h1>
            <p className="text-muted-foreground text-sm mt-1">Write and publish articles with SEO optimization.</p>
          </div>
          {!showForm && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />New Post</Button>}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editing ? "Edit Post" : "New Post"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={closeForm}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title always visible above tabs */}
              <div className="space-y-1.5">
                <Label>Post Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => {
                    const title = e.target.value;
                    setForm(f => ({
                      ...f,
                      title,
                      slug: editing ? f.slug : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                      seoTitle: f.seoTitle || f.title === title.slice(0, -1) ? f.seoTitle : f.seoTitle || "",
                    }));
                  }}
                  placeholder="Article title"
                  className="text-base font-medium"
                />
              </div>

              <Tabs defaultValue="content">
                <TabsList className="w-full">
                  <TabsTrigger value="content" className="flex-1 gap-1.5"><FileText className="h-3.5 w-3.5" />Content</TabsTrigger>
                  <TabsTrigger value="seo" className="flex-1 gap-1.5">
                    <Search className="h-3.5 w-3.5" />SEO &amp; Meta
                    {score >= 70 ? <span className="ml-1 text-green-600 text-xs font-bold">{score}</span> : <span className="ml-1 text-amber-600 text-xs font-bold">{score}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex-1 gap-1.5"><Eye className="h-3.5 w-3.5" />Preview</TabsTrigger>
                </TabsList>

                {/* ===== CONTENT TAB ===== */}
                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Author</Label>
                      <Input value={form.authorName} onChange={e => set("authorName", e.target.value)} placeholder="Dr. Amir" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Input value={form.category} onChange={e => set("category", e.target.value)} placeholder="Health Tips" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={v => set("status", v as "draft" | "published")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Slug <span className="text-xs text-muted-foreground">(auto-generated)</span></Label>
                      <Input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="my-article" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Excerpt <span className="text-xs text-muted-foreground">(shown in listing cards)</span></Label>
                      <Input value={form.excerpt} onChange={e => set("excerpt", e.target.value)} placeholder="Short summary…" />
                    </div>
                  </div>

                  {/* Content editor with toolbar */}
                  <div className="space-y-1.5">
                    <Label>Content <span className="text-xs text-muted-foreground">— supports Markdown</span></Label>
                    <div className="rounded-md border overflow-hidden">
                      <FormatToolbar contentRef={contentRef} onChange={v => set("content", v)} />
                      <Textarea
                        ref={contentRef}
                        rows={18}
                        value={form.content}
                        onChange={e => set("content", e.target.value)}
                        placeholder={"# Start writing…\n\nUse **bold**, *italic*, `code`, [links](url), ## headings, and - lists.\n\nPaste or type your article content here."}
                        className="border-0 rounded-none focus-visible:ring-0 font-mono text-sm resize-y leading-relaxed"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{form.content.length} characters · {form.content.split(/\s+/).filter(Boolean).length} words</p>
                  </div>

                  {/* Cover image */}
                  <div className="space-y-1.5">
                    <Label>Featured Image</Label>
                    {storageUrl(form.coverImageUrl) && (
                      <img src={storageUrl(form.coverImageUrl)} alt="Cover" className="h-40 w-full object-cover rounded-lg border mb-2" />
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => fileRef.current?.click()}>
                        {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1.5" />}
                        {form.coverImageUrl ? "Change Image" : "Upload Image"}
                      </Button>
                      {form.coverImageUrl && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => set("coverImageUrl", "")}>Remove</Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ===== SEO TAB ===== */}
                <TabsContent value="seo" className="space-y-5 mt-4">
                  <SeoScoreBar score={score} />
                  {hints.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-0.5 pl-3 border-l-2 border-amber-300">
                      {hints.map(h => <li key={h}>• {h}</li>)}
                    </ul>
                  )}
                  <Separator />

                  {/* SERP preview */}
                  <SerpPreview
                    title={form.seoTitle || form.title}
                    slug={form.slug}
                    description={form.metaDescription || form.excerpt}
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>SEO Title</Label>
                      <span className={`text-xs ${form.seoTitle.length > 60 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {form.seoTitle.length}/60
                      </span>
                    </div>
                    <Input
                      value={form.seoTitle}
                      onChange={e => set("seoTitle", e.target.value)}
                      placeholder={form.title || "Optimized title for search engines"}
                      maxLength={80}
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to use the post title. Recommended: under 60 characters.</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description</Label>
                      <span className={`text-xs ${form.metaDescription.length > 160 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {form.metaDescription.length}/160
                      </span>
                    </div>
                    <Textarea
                      rows={3}
                      value={form.metaDescription}
                      onChange={e => set("metaDescription", e.target.value)}
                      placeholder={form.excerpt || "Compelling description shown in search results…"}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to use the excerpt. Recommended: under 160 characters.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Focus Keyword</Label>
                      <Input value={form.focusKeyword} onChange={e => set("focusKeyword", e.target.value)} placeholder="e.g. blood pressure management" />
                      <p className="text-xs text-muted-foreground">Primary term this article targets.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Canonical URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
                      <Input value={form.canonicalUrl} onChange={e => set("canonicalUrl", e.target.value)} placeholder="https://example.com/original-article" />
                      <p className="text-xs text-muted-foreground">Set if this is a re-published post.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Tags</Label>
                    <TagInput tags={form.tags} onChange={v => set("tags", v)} />
                    <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag.</p>
                  </div>
                </TabsContent>

                {/* ===== PREVIEW TAB ===== */}
                <TabsContent value="preview" className="mt-4">
                  <div className="rounded-xl border overflow-hidden bg-background">
                    {/* Article header */}
                    <div className="p-6 pb-0 space-y-3">
                      {form.category && <Badge variant="outline" className="text-xs">{form.category}</Badge>}
                      <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{form.title || "Untitled"}</h1>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {form.authorName && <span>By {form.authorName}</span>}
                        <span>Draft</span>
                      </div>
                      {form.excerpt && <p className="text-muted-foreground text-sm italic border-l-4 border-primary/30 pl-3">{form.excerpt}</p>}
                    </div>
                    {storageUrl(form.coverImageUrl) && (
                      <img src={storageUrl(form.coverImageUrl)} alt="Cover" className="w-full object-cover max-h-72 mt-4" />
                    )}
                    <div className="p-6">
                      {form.content ? (
                        <div
                          className="text-base leading-relaxed text-foreground/90"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }}
                        />
                      ) : (
                        <p className="text-muted-foreground text-sm italic">Start writing in the Content tab to see the preview here.</p>
                      )}
                      {form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-8 pt-4 border-t">
                          {form.tags.map(t => <Badge key={t} variant="secondary">#{t}</Badge>)}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                  {editing ? "Update Post" : "Create Post"}
                </Button>
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">All Posts</CardTitle></CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No posts yet. Click "New Post" to write your first article.</p>
            ) : (
              <div className="divide-y">
                {posts.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-3">
                    <div className="h-12 w-16 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {storageUrl(p.coverImageUrl)
                        ? <img src={storageUrl(p.coverImageUrl)} alt="" className="h-full w-full object-cover" />
                        : <Newspaper className="h-5 w-5 text-muted-foreground/40" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
                        {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
                        {p.focusKeyword && <span className="text-xs text-muted-foreground hidden sm:inline">🔑 {p.focusKeyword}</span>}
                      </div>
                    </div>
                    <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
