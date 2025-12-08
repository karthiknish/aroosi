"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, Send, Copy, Trash2, Save, Link2, Link2Off } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DOMPurify from "dompurify";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

export default function AdminEmailPage() {
  useAuthContext();
  const [activeTab, setActiveTab] = useState<"compose" | "templates" | "preview">("compose");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [html, setHtml] = useState("<p>Hello from Aroosi</p>");
  const [text, setText] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [variablesJson, setVariablesJson] = useState("{\n  \"userName\": \"Alice\"\n}");
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  const [schemaHints, setSchemaHints] = useState<{ missing: string[]; extra: string[]; typeMismatches: Array<{ key: string; expected: string; actual: string }>; } | null>(null);

  // Tiptap editor for HTML
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write HTML content…" }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: html,
    onUpdate: ({ editor }: { editor: any }) => {
      setHtml(editor.getHTML());
    },
  });

  useEffect(() => {
    editor?.commands.setContent(html);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load templates on first render
  useEffect(() => {
    (async () => {
      await loadTemplates();
    })();
  }, []);

  const handleSend = async () => {
    if (!subject.trim()) {
      showErrorToast(null, "Subject is required");
      return;
    }
    if (!html.trim() && !text.trim()) {
      showErrorToast(null, "Provide HTML or text content");
      return;
    }
    if (!dryRun && !confirm) {
      showErrorToast(null, "Confirm live send");
      return;
    }
    setLoading(true);
    try {
      const vars = safeParseJSON(variablesJson);
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun,
          confirm: !dryRun && confirm,
          templateId: !dryRun && appliedTemplateId ? appliedTemplateId : undefined,
          to: to
            .split(/[\,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          subject: subject.trim(),
          text: text.trim() || undefined,
          html: preheader.trim()
            ? `<span style=\"display:none;opacity:0;\">${preheader}</span>\n` + mergeVariables(html, vars)
            : mergeVariables(html, vars),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      if (dryRun) {
        setPreview(json?.data?.preview || null);
        showSuccessToast("Email preview generated");
      } else {
        showSuccessToast("Email queued for delivery");
        setConfirm(false);
        setAppliedTemplateId(null);
      }
    } catch (e) {
      showErrorToast(null, (e as Error).message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  // Templates API helpers (component-scoped)
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load templates");
      setTemplates(json?.data?.items || json?.data || json?.items || []);
    } catch (e) {
      showErrorToast(null, (e as Error).message || "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  };

  const applyTemplate = (tpl: any) => {
    try {
      setSubject(tpl?.subject || "");
      const htmlContent = tpl?.html || "";
      setHtml(htmlContent);
      editor?.commands.setContent(htmlContent || "");
      setText(tpl?.text || "");
      if (tpl?.variablesSchema) {
        setVariablesJson(JSON.stringify(tpl.variablesSchema, null, 2));
      }
      // compute schema hints immediately after applying a template
      try {
        const expected = tpl?.variablesSchema || {};
        const current = safeParseJSON(variablesJson);
        setSchemaHints(computeSchemaHints(expected, current));
      } catch {
        setSchemaHints(null);
      }
      setAppliedTemplateId(tpl?.id || null);
      setActiveTab("compose");
      showSuccessToast("Template applied");
    } catch (e) {
      // ignore
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      await loadTemplates();
    } catch (e) {
      showErrorToast(null, (e as Error).message || "Failed to delete template");
    }
  };

  const saveCurrentAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      showErrorToast(null, "Template name required");
      return;
    }
    if (!subject.trim()) {
      showErrorToast(null, "Subject is required to save a template");
      return;
    }
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim() || undefined,
          subject: subject.trim(),
          html: html || undefined,
          text: text || undefined,
          variablesSchema: safeParseJSON(variablesJson),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save template");
      setNewTemplateName("");
      setNewTemplateDesc("");
      await loadTemplates();
      showSuccessToast("Template saved");
    } catch (e) {
      showErrorToast(null, (e as Error).message || "Failed to save template");
    }
  };

  const safeParseJSON = (text: string): any => {
    try {
      const t = (text || "").trim();
      if (!t) return {};
      return JSON.parse(t);
    } catch {
      showErrorToast(null, "Invalid JSON in variables");
      return {};
    }
  };

  const computeSchemaHints = (
    expectedSchema: Record<string, any>,
    currentVars: Record<string, any>
  ) => {
    const expectedKeys = Object.keys(expectedSchema || {});
    const currentKeys = Object.keys(currentVars || {});
    const missing = expectedKeys.filter((k) => !currentKeys.includes(k));
    const extra = currentKeys.filter((k) => !expectedKeys.includes(k));
    const typeMismatches: Array<{ key: string; expected: string; actual: string }> = [];
    for (const key of expectedKeys) {
      const exp = expectedSchema[key];
      const act = currentVars[key];
      if (act === undefined) continue;
      const expType = Array.isArray(exp) ? "array" : exp === null ? "null" : typeof exp;
      const actType = Array.isArray(act) ? "array" : act === null ? "null" : typeof act;
      if (expType !== actType) {
        typeMismatches.push({ key, expected: expType, actual: actType });
      }
    }
    return { missing, extra, typeMismatches };
  };

  const mergeVariables = (htmlStr: string, vars: Record<string, any>) => {
    // simple mustache-style replacement: {{varName}}
    return htmlStr.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const val = key
        .split(".")
        .reduce((acc: any, k: string) => (acc && acc[k] !== undefined ? acc[k] : undefined), vars as any);
      return val === undefined || val === null ? "" : String(val);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email</h1>
        <p className="text-gray-600">Compose and send admin emails</p>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="compose">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>To (comma or space separated)</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="user1@example.com, user2@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Preheader (optional)</Label>
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Short summary in inbox preview" />
            </div>
            <div className="space-y-1">
              <Label>HTML</Label>
              {editor ? (
                <div className="border rounded-md">
                  {/* Toolbar */}
                  <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()}>
                      B
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()}>
                      I
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()}>
                      S
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().chain().focus().toggleUnderline().run()}>
                      U
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().setParagraph().run()}>P</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign("left").run()}>Left</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign("center").run()}>Center</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().setTextAlign("right").run()}>Right</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>Code</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const { state } = editor.view;
                        const hasLink = editor.isActive('link');
                        if (hasLink) {
                          editor.chain().focus().unsetLink().run();
                          return;
                        }
                        const url = prompt("Enter URL (https://...)");
                        if (!url) return;
                        editor.chain().focus().setLink({ href: url, target: "_blank", rel: "noopener noreferrer" }).run();
                      }}
                      title="Toggle link / unlink"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editor.chain().focus().unsetLink().run()}
                      title="Unlink"
                    >
                      <Link2Off className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const url = prompt("Enter image URL");
                      if (!url) return;
                      const alt = prompt("Alt text (optional)") || undefined;
                      editor.chain().focus().setImage({ src: url, alt }).run();
                    }}>Image</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}>2×2 Table</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Insert a basic template snippet using a common variable as example
                        editor.chain().focus().insertContent('<p>Hello {{userName}},</p>').run();
                      }}
                    >
                      Insert Snippet
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addColumnBefore().run()}>+Col</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()}>Col+</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().deleteColumn().run()}>-Col</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addRowBefore().run()}>+Row</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()}>Row+</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().deleteRow().run()}>-Row</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().deleteTable().run()}>Del Tbl</Button>
                  </div>
                  <div className="p-2">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              ) : (
                <Textarea rows={10} value={html} onChange={(e) => setHtml(e.target.value)} />
              )}
              <div className="text-xs text-gray-500">
                Use <code>{"{{variableName}}"}</code> to inject variables (see Variables panel).
              </div>
            </div>
            <div className="space-y-1">
              <Label>Plain Text (optional)</Label>
              <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Variables (JSON)</Label>
              <Textarea
                rows={6}
                value={variablesJson}
                onChange={(e) => {
                  setVariablesJson(e.target.value);
                  try {
                    const expected = (() => {
                      try { return JSON.parse(templates.find(t => t.id === appliedTemplateId)?.variablesSchema ? JSON.stringify(templates.find(t => t.id === appliedTemplateId)?.variablesSchema) : "{}"); } catch { return {}; }
                    })();
                    const current = safeParseJSON(e.target.value);
                    setSchemaHints(computeSchemaHints(expected, current));
                  } catch {
                    setSchemaHints(null);
                  }
                }}
              />
              {schemaHints && (schemaHints.missing.length > 0 || schemaHints.extra.length > 0 || schemaHints.typeMismatches.length > 0) && (
                <div className="text-xs mt-1 p-2 rounded border border-amber-200 bg-amber-50 text-amber-900">
                  <div className="font-medium">Variables validation hints</div>
                  {schemaHints.missing.length > 0 && (
                    <div>Missing keys: {schemaHints.missing.join(", ")}</div>
                  )}
                  {schemaHints.extra.length > 0 && (
                    <div>Extra keys: {schemaHints.extra.join(", ")}</div>
                  )}
                  {schemaHints.typeMismatches.length > 0 && (
                    <div>
                      Type mismatches:
                      <ul className="list-disc ml-4">
                        {schemaHints.typeMismatches.map((m, i) => (
                          <li key={i}>
                            {m.key}: expected {m.expected}, got {m.actual}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                Dry run (preview only)
              </label>
              {!dryRun && (
                <label className="flex items-center gap-2 text-sm text-red-600">
                  <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                  Confirm live send
                </label>
              )}
            </div>
            <Button className="w-full" onClick={handleSend} disabled={loading || (!dryRun && !confirm)}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {dryRun ? "Previewing..." : "Sending..."}
                </>
              ) : (
                <>
                  {dryRun ? <Eye className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  {dryRun ? "Preview Email" : "Send Email"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Preview payload will appear below after a dry run.</div>
            {preview && (
              <pre className="mt-3 text-xs bg-gray-50 border rounded p-3 max-h-80 overflow-auto">{JSON.stringify(preview, null, 2)}</pre>
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>
        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">{templatesLoading ? "Loading..." : `${templates.length} templates`}</div>
                  <Button variant="outline" size="sm" onClick={() => loadTemplates()}>Refresh</Button>
                </div>
                <div className="border rounded-md divide-y">
                  {templates.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">No templates saved yet.</div>
                  )}
                  {templates.map((t) => (
                    <div key={t.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{t.name}</div>
                        {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                        <div className="text-xs text-gray-400">Created {new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => applyTemplate(t)}>Apply</Button>
                        <Button size="sm" variant="outline" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <Save className="h-5 w-5 inline mr-2" /> Save Current as Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Template Name</Label>
                  <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="e.g., Welcome Email" />
                </div>
                <div className="space-y-1">
                  <Label>Description (optional)</Label>
                  <Input value={newTemplateDesc} onChange={(e) => setNewTemplateDesc(e.target.value)} placeholder="Short note about this template" />
                </div>
                <Button onClick={saveCurrentAsTemplate} disabled={!newTemplateName.trim()} className="w-full">
                  Save Template
                </Button>
                <div className="text-xs text-gray-500">The template captures subject, HTML, text, and an optional variables schema.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Rendered HTML</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose max-w-none border rounded-md p-4"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    mergeVariables(html, safeParseJSON(variablesJson))
                  ),
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

