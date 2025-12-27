"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutTemplate, 
  Mail, 
  ArrowRight, 
  Eye, 
  Sparkles, 
  Clock, 
  Gift, 
  UserCheck, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { adminEmailAPI } from "@/lib/api/admin/email";

type TemplateInfo = { key: string; label: string; category?: string; argsDoc?: string };

export default function TemplatesCatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const templates = await adminEmailAPI.getTemplateRegistry();
        setItems(templates);
      } catch (e) {
        console.error("Failed to load templates", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePreview = async (t: TemplateInfo) => {
    setSelectedTemplate(t);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    
    try {
      const payload: any = { templateKey: t.key };
      // provide minimal default args where possible for better preview
      if (t.key === 'premiumPromo') payload.params = { args: [20] };
      if (t.key === 'profileCompletionReminder') payload.params = { args: [70] };
      if (t.key === 'reEngagement') payload.params = { args: [14] };
      
      const html = await adminEmailAPI.previewEmail(payload);
      setPreviewHtml(html);
    } catch (e) {
      console.error("Preview failed", e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getIconForTemplate = (key: string) => {
    if (key.includes('promo') || key.includes('offer')) return <Gift className="w-6 h-6 text-rose-500" />;
    if (key.includes('reminder') || key.includes('time')) return <Clock className="w-6 h-6 text-amber-500" />;
    if (key.includes('welcome')) return <Sparkles className="w-6 h-6 text-purple-500" />;
    if (key.includes('verification') || key.includes('security')) return <UserCheck className="w-6 h-6 text-blue-500" />;
    if (key.includes('alert') || key.includes('warning')) return <AlertCircle className="w-6 h-6 text-red-500" />;
    return <Mail className="w-6 h-6 text-slate-500" />;
  };

  const getGradientForTemplate = (key: string) => {
    if (key.includes('promo')) return "from-rose-50 to-white border-rose-100";
    if (key.includes('reminder')) return "from-amber-50 to-white border-amber-100";
    if (key.includes('welcome')) return "from-purple-50 to-white border-purple-100";
    if (key.includes('verification')) return "from-blue-50 to-white border-blue-100";
    return "from-slate-50 to-white border-slate-100";
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <LayoutTemplate className="w-8 h-8 text-rose-600" />
          Email Templates
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Browse and select from our collection of professionally designed email templates.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No templates found</h3>
          <p className="text-slate-500">Check back later or create a custom campaign.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t) => (
            <Card 
              key={t.key} 
              className={cn(
                "group hover:shadow-lg transition-all duration-300 border overflow-hidden flex flex-col",
                getGradientForTemplate(t.key)
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                    {getIconForTemplate(t.key)}
                  </div>
                  <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
                    {t.category || 'General'}
                  </Badge>
                </div>
                <CardTitle className="text-xl group-hover:text-rose-700 transition-colors">
                  {t.label}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {t.argsDoc || "A standard email template ready for your campaign."}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1">
                <div className="h-32 bg-white/60 rounded-lg border border-slate-100/50 p-4 overflow-hidden relative group-hover:border-rose-100 transition-colors">
                  <div className="space-y-2 opacity-40 scale-90 origin-top-left select-none pointer-events-none">
                    <div className="h-4 w-3/4 bg-slate-300 rounded" />
                    <div className="h-3 w-full bg-slate-200 rounded" />
                    <div className="h-3 w-5/6 bg-slate-200 rounded" />
                    <div className="h-3 w-4/5 bg-slate-200 rounded" />
                    <div className="h-8 w-32 bg-rose-200 rounded mt-4" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                      Click Preview to see full design
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0 gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-white hover:bg-slate-50"
                  onClick={() => handlePreview(t)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow-md transition-all"
                  onClick={() => router.push(`/admin/marketing-email?template=${encodeURIComponent(t.key)}`)}
                >
                  Use Template
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-slate-50/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm border">
                  {selectedTemplate && getIconForTemplate(selectedTemplate.key)}
                </div>
                <div>
                  <DialogTitle className="text-xl">{selectedTemplate?.label}</DialogTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedTemplate?.key} • {selectedTemplate?.category}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  if (selectedTemplate) {
                    router.push(`/admin/marketing-email?template=${encodeURIComponent(selectedTemplate.key)}`);
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Use This Template
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 bg-slate-100 p-6 overflow-hidden relative">
            {previewLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                  <p className="text-sm font-medium text-slate-600">Generating preview...</p>
                </div>
              </div>
            ) : null}
            
            {previewHtml ? (
              <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <iframe
                  title="template-preview"
                  className="w-full h-full"
                  sandbox="allow-same-origin"
                  srcDoc={previewHtml}
                />
              </div>
            ) : !previewLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                <p>Preview unavailable</p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
