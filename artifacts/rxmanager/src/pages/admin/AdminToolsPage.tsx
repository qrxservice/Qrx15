import { useState, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Edit2, Trash2, Copy, Eye, Upload, Download, MoreHorizontal,
  Globe, EyeOff, Tag, FolderPlus, X, FileJson, FileCode, Archive, Wrench
} from "lucide-react";
import JSZip from "jszip";
import {
  useAdminTools, useCreateTool, useUpdateTool, useDeleteTool,
  useDuplicateTool, usePublishTool, useImportTool,
  useToolCategories, useCreateToolCategory, useDeleteToolCategory,
  type Tool,
} from "@/lib/tools-api";
import { useListDepartments } from "@workspace/api-client-react";

const TOOL_TYPES = [
  { value: "medical-calculator", label: "Medical Calculator" },
  { value: "html-tool", label: "HTML Tool" },
  { value: "css-tool", label: "CSS Tool" },
  { value: "js-tool", label: "JavaScript Tool" },
  { value: "medical-widget", label: "Medical Widget" },
  { value: "interactive-form", label: "Interactive Medical Form" },
  { value: "mini-app", label: "Mini Medical Web App" },
];

const EMPTY_FORM: Partial<Tool> = {
  name: "", slug: "", type: "html-tool", categoryId: null, department: "all",
  shortDescription: "", icon: "", version: "1.0", status: "draft",
  htmlCode: "", cssCode: "", jsCode: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildSrcdoc(html: string, css: string, js: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:8px;font-family:system-ui,sans-serif}${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}

function CodeEditor({ label, value, onChange, language }: {
  label: string; value: string; onChange: (v: string) => void; language: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <Badge variant="outline" className="text-xs font-mono">{language}</Badge>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        className="w-full h-64 p-3 rounded-md border bg-zinc-950 text-green-400 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
        placeholder={`// ${language} code here...`}
      />
    </div>
  );
}

export default function AdminToolsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("_all");
  const [filterDepartment, setFilterDepartment] = useState("_all");
  const [filterStatus, setFilterStatus] = useState("_all");
  const [filterType, setFilterType] = useState("_all");

  const { data, refetch } = useAdminTools({
    search,
    category: filterCategory !== "_all" ? filterCategory : undefined,
    department: filterDepartment !== "_all" ? filterDepartment : undefined,
    status: filterStatus !== "_all" ? filterStatus : undefined,
    type: filterType !== "_all" ? filterType : undefined,
  });
  const { data: categories } = useToolCategories();
  const { data: departments } = useListDepartments();
  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const deleteTool = useDeleteTool();
  const duplicateTool = useDuplicateTool();
  const publishTool = usePublishTool();
  const importTool = useImportTool();
  const createCategory = useCreateToolCategory();
  const deleteCategory = useDeleteToolCategory();

  const [editOpen, setEditOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Partial<Tool> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTool, setPreviewTool] = useState<Partial<Tool> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = data?.tools ?? [];

  // ---- Edit / Create ----
  const openCreate = () => { setEditingTool({ ...EMPTY_FORM }); setEditOpen(true); };
  const openEdit = (t: Tool) => { setEditingTool({ ...t }); setEditOpen(true); };

  const handleSave = async () => {
    if (!editingTool?.name || !editingTool?.slug) {
      toast({ title: "Name and slug are required", variant: "destructive" }); return;
    }
    try {
      if (editingTool.id) {
        await updateTool.mutateAsync({ id: editingTool.id, data: editingTool });
        toast({ title: "Tool updated" });
      } else {
        await createTool.mutateAsync(editingTool);
        toast({ title: "Tool created" });
      }
      setEditOpen(false); setEditingTool(null); refetch();
    } catch (e: unknown) {
      toast({ title: (e as Error).message || "Error saving tool", variant: "destructive" });
    }
  };

  // ---- Delete ----
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await deleteTool.mutateAsync(id); toast({ title: "Deleted" }); refetch(); }
    catch { toast({ title: "Error deleting tool", variant: "destructive" }); }
  };

  // ---- Duplicate ----
  const handleDuplicate = async (id: number) => {
    try { await duplicateTool.mutateAsync(id); toast({ title: "Duplicated as draft" }); refetch(); }
    catch { toast({ title: "Error duplicating", variant: "destructive" }); }
  };

  // ---- Publish ----
  const handlePublish = async (id: number, name: string, status: string) => {
    try {
      await publishTool.mutateAsync(id);
      toast({ title: status === "published" ? `"${name}" unpublished` : `"${name}" published` });
      refetch();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  // ---- Preview ----
  const openPreview = (t: Partial<Tool>) => { setPreviewTool(t); setPreviewOpen(true); };

  // ---- Export ----
  const exportJson = (t: Tool) => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${t.slug}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportHtml = (t: Tool) => {
    const src = buildSrcdoc(t.htmlCode ?? "", t.cssCode ?? "", t.jsCode ?? "");
    const blob = new Blob([src], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${t.slug}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportZip = async (t: Tool) => {
    const zip = new JSZip();
    zip.file("index.html", t.htmlCode ?? "");
    zip.file("style.css", t.cssCode ?? "");
    zip.file("script.js", t.jsCode ?? "");
    zip.file("meta.json", JSON.stringify({ name: t.name, slug: t.slug, type: t.type, version: t.version, shortDescription: t.shortDescription }, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${t.slug}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Import ----
  const handleImportFile = useCallback(async (file: File) => {
    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const pkg = JSON.parse(text);
        await importTool.mutateAsync(pkg);
        toast({ title: "Tool imported from JSON" }); refetch(); setImportOpen(false);
      } else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        const text = await file.text();
        // Extract CSS, JS, body from HTML
        const cssMatch = text.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const jsMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const pkg = {
          name: file.name.replace(/\.(html|htm)$/, ""),
          slug: slugify(file.name.replace(/\.(html|htm)$/, "")),
          htmlCode: bodyMatch?.[1]?.trim() ?? text,
          cssCode: cssMatch?.[1]?.trim() ?? "",
          jsCode: jsMatch?.[1]?.trim() ?? "",
          type: "html-tool",
        };
        await importTool.mutateAsync(pkg);
        toast({ title: "Tool imported from HTML" }); refetch(); setImportOpen(false);
      } else if (file.name.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        const htmlFile = zip.file("index.html");
        const cssFile = zip.file("style.css");
        const jsFile = zip.file("script.js");
        const metaFile = zip.file("meta.json");
        const html = htmlFile ? await htmlFile.async("text") : "";
        const css = cssFile ? await cssFile.async("text") : "";
        const js = jsFile ? await jsFile.async("text") : "";
        let meta: Record<string, unknown> = {};
        if (metaFile) { try { meta = JSON.parse(await metaFile.async("text")); } catch {} }
        const baseName = file.name.replace(/\.zip$/, "");
        const pkg = {
          name: (meta.name as string) || baseName,
          slug: (meta.slug as string) || slugify(baseName),
          type: (meta.type as string) || "html-tool",
          version: (meta.version as string) || "1.0",
          shortDescription: (meta.shortDescription as string) || "",
          htmlCode: html, cssCode: css, jsCode: js,
        };
        await importTool.mutateAsync(pkg);
        toast({ title: "Tool imported from ZIP" }); refetch(); setImportOpen(false);
      } else {
        toast({ title: "Unsupported format. Use .json, .html, or .zip", variant: "destructive" });
      }
    } catch (e: unknown) {
      toast({ title: (e as Error).message || "Import failed", variant: "destructive" });
    }
  }, [importTool, refetch, toast]);

  // ---- Category ----
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newCatName.trim(), slug: slugify(newCatName) });
      toast({ title: "Category created" }); setNewCatName("");
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" /> Tools Management
            </h1>
            <p className="text-muted-foreground mt-1">Create and publish interactive medical tools for doctors</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCatOpen(true)}><Tag className="mr-2 h-4 w-4" />Categories</Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import Tool</Button>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Tool</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Tools", value: tools.length },
            { label: "Published", value: tools.filter(t => t.status === "published").length },
            { label: "Drafts", value: tools.filter(t => t.status === "draft").length },
            { label: "Categories", value: categories?.length ?? 0 },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="sm:col-span-2 xl:col-span-2 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search by name, slug, description..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Categories</SelectItem>
                  {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Departments</SelectItem>
                  {(Array.isArray(departments) ? departments : []).map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Types</SelectItem>
                  {TOOL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tools ({data?.total ?? 0})</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map(tool => (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{tool.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{tool.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{TOOL_TYPES.find(t => t.value === tool.type)?.label ?? tool.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{tool.categoryName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{tool.department === "all" ? "All" : tool.department}</TableCell>
                    <TableCell>
                      <Badge variant={tool.status === "published" ? "default" : "secondary"}>
                        {tool.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tool.version}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(tool)} title="Edit">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openPreview(tool)} title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => handlePublish(tool.id, tool.name, tool.status)}
                          title={tool.status === "published" ? "Unpublish" : "Publish"}>
                          {tool.status === "published"
                            ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            : <Globe className="h-3.5 w-3.5 text-green-600" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDuplicate(tool.id)}><Copy className="mr-2 h-3.5 w-3.5" />Duplicate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportJson(tool)}><FileJson className="mr-2 h-3.5 w-3.5" />Export JSON</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportHtml(tool)}><FileCode className="mr-2 h-3.5 w-3.5" />Export HTML</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportZip(tool)}><Archive className="mr-2 h-3.5 w-3.5" />Export ZIP</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tool.id, tool.name)}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tools.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tools yet. Create your first tool to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hidden file input for import */}
        <input ref={fileInputRef} type="file" className="hidden" accept=".json,.html,.htm,.zip"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }} />

        {/* ---- EDIT / CREATE DIALOG ---- */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTool?.id ? "Edit Tool" : "Create New Tool"}</DialogTitle>
            </DialogHeader>
            {editingTool && (
              <Tabs defaultValue="info">
                <TabsList className="w-full">
                  <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
                  <TabsTrigger value="html" className="flex-1">HTML</TabsTrigger>
                  <TabsTrigger value="css" className="flex-1">CSS</TabsTrigger>
                  <TabsTrigger value="js" className="flex-1">JavaScript</TabsTrigger>
                  <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Tool Name *</Label>
                      <Input value={editingTool.name ?? ""} onChange={e => {
                        const name = e.target.value;
                        setEditingTool(p => ({ ...p!, name, slug: p?.id ? p.slug : slugify(name) }));
                      }} placeholder="BMI Calculator" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Slug *</Label>
                      <Input value={editingTool.slug ?? ""} onChange={e => setEditingTool(p => ({ ...p!, slug: e.target.value }))} placeholder="bmi-calculator" className="font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={editingTool.type ?? "html-tool"} onValueChange={v => setEditingTool(p => ({ ...p!, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TOOL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select value={editingTool.categoryId ? String(editingTool.categoryId) : "none"}
                        onValueChange={v => setEditingTool(p => ({ ...p!, categoryId: v === "none" ? null : parseInt(v) }))}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department</Label>
                      <Select value={editingTool.department ?? "all"} onValueChange={v => setEditingTool(p => ({ ...p!, department: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Doctors</SelectItem>
                          {(Array.isArray(departments) ? departments : []).map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Icon (emoji or URL)</Label>
                      <Input value={editingTool.icon ?? ""} onChange={e => setEditingTool(p => ({ ...p!, icon: e.target.value }))} placeholder="⚕️" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Version</Label>
                      <Input value={editingTool.version ?? "1.0"} onChange={e => setEditingTool(p => ({ ...p!, version: e.target.value }))} placeholder="1.0" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Short Description</Label>
                    <Textarea value={editingTool.shortDescription ?? ""} onChange={e => setEditingTool(p => ({ ...p!, shortDescription: e.target.value }))} rows={2} placeholder="Brief description of what this tool does..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Featured Image URL</Label>
                    <Input value={editingTool.featuredImageUrl ?? ""} onChange={e => setEditingTool(p => ({ ...p!, featuredImageUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={editingTool.status ?? "draft"} onValueChange={v => setEditingTool(p => ({ ...p!, status: v as "draft" | "published" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="html" className="mt-4">
                  <CodeEditor label="HTML Body" value={editingTool.htmlCode ?? ""} onChange={v => setEditingTool(p => ({ ...p!, htmlCode: v }))} language="HTML" />
                </TabsContent>

                <TabsContent value="css" className="mt-4">
                  <CodeEditor label="CSS Styles" value={editingTool.cssCode ?? ""} onChange={v => setEditingTool(p => ({ ...p!, cssCode: v }))} language="CSS" />
                </TabsContent>

                <TabsContent value="js" className="mt-4">
                  <CodeEditor label="JavaScript" value={editingTool.jsCode ?? ""} onChange={v => setEditingTool(p => ({ ...p!, jsCode: v }))} language="JavaScript" />
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Live preview — runs in a sandboxed iframe.</p>
                    <div className="rounded-lg border overflow-hidden bg-white" style={{ height: 480 }}>
                      <iframe
                        srcDoc={buildSrcdoc(editingTool.htmlCode ?? "", editingTool.cssCode ?? "", editingTool.jsCode ?? "")}
                        sandbox="allow-scripts allow-forms allow-modals"
                        className="w-full h-full border-0"
                        title="Tool Preview"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createTool.isPending || updateTool.isPending}>
                {(createTool.isPending || updateTool.isPending) ? "Saving..." : "Save Tool"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- PREVIEW DIALOG ---- */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewTool?.icon && <span>{previewTool.icon}</span>}
                {previewTool?.name}
                <Badge variant="outline" className="ml-2 text-xs">{previewTool?.type}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-lg border overflow-hidden bg-white" style={{ height: 500 }}>
              <iframe
                srcDoc={buildSrcdoc(previewTool?.htmlCode ?? "", previewTool?.cssCode ?? "", previewTool?.jsCode ?? "")}
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full h-full border-0"
                title="Tool Preview"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* ---- IMPORT DIALOG ---- */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Import Tool Package</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Import an existing tool from a file. Supported formats:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: <FileJson className="h-6 w-6 text-blue-500" />, label: "JSON Package", ext: ".json" },
                  { icon: <FileCode className="h-6 w-6 text-orange-500" />, label: "HTML File", ext: ".html" },
                  { icon: <Archive className="h-6 w-6 text-purple-500" />, label: "ZIP Package", ext: ".zip" },
                ].map(f => (
                  <button key={f.ext} type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:border-primary/60 hover:bg-muted/50 transition-colors text-center">
                    {f.icon}
                    <span className="text-xs font-medium">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.ext}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                ZIP format: <code className="bg-muted px-1 rounded">index.html</code>, <code className="bg-muted px-1 rounded">style.css</code>, <code className="bg-muted px-1 rounded">script.js</code>, <code className="bg-muted px-1 rounded">meta.json</code>
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* ---- CATEGORY DIALOG ---- */}
        <Dialog open={catOpen} onOpenChange={setCatOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="New category name..." onKeyDown={e => e.key === "Enter" && handleCreateCategory()} />
                <Button onClick={handleCreateCategory} disabled={createCategory.isPending}>
                  <FolderPlus className="mr-2 h-4 w-4" />Add
                </Button>
              </div>
              <Separator />
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories?.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">{c.slug}</span>
                      {c.isDefault && <Badge variant="outline" className="ml-2 text-xs">default</Badge>}
                    </div>
                    {!c.isDefault && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => deleteCategory.mutateAsync(c.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
