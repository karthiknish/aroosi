import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Eye, Download, Play, ShieldCheck, AlertTriangle } from "lucide-react";

interface CampaignActionsProps {
  sending: boolean;
  dryRun: boolean;
  setDryRun: (val: boolean) => void;
  sendToAll: boolean;
  maxAudience: number;
  onSend: () => void;
  onPreviewHtml: () => void;
  onExportCsv: () => void;
  processingOutbox: boolean;
  onProcessOutbox: () => void;
}

export function CampaignActions({
  sending,
  dryRun,
  setDryRun,
  sendToAll,
  maxAudience,
  onSend,
  onPreviewHtml,
  onExportCsv,
  processingOutbox,
  onProcessOutbox,
}: CampaignActionsProps) {
  return (
    <div className="flex flex-col gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-lg sticky bottom-6 z-20 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Switch
            id="dry-run-toggle"
            checked={dryRun}
            onCheckedChange={setDryRun}
          />
          <div className="space-y-0.5">
            <Label htmlFor="dry-run-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-2">
              Dry Run Mode
              {dryRun ? (
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              )}
            </Label>
            <p className="text-xs text-muted-foreground">
              {dryRun
                ? "Safe mode: Generates a report without sending emails."
                : "Live mode: Emails will be sent to real users immediately."}
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onProcessOutbox}
          disabled={processingOutbox}
          title="Process a small batch of queued emails"
          className="text-xs text-slate-500 hover:text-slate-900"
        >
          {processingOutbox ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
          ) : (
            <Play className="h-3 w-3 mr-1.5" />
          )}
          Process Outbox
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button 
          onClick={onSend} 
          disabled={sending}
          size="lg"
          className={`flex-1 md:flex-none min-w-[200px] shadow-sm transition-all ${
            dryRun 
              ? "bg-slate-800 hover:bg-slate-900 text-white" 
              : "bg-pink-600 hover:bg-pink-700 text-white hover:shadow-md"
          }`}
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {dryRun ? "Generating..." : "Sending..."}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {dryRun ? "Generate Preview Report" : sendToAll ? `Send to All Users` : `Send to ${maxAudience} Users`}
            </>
          )}
        </Button>

        <div className="flex gap-2 flex-1 md:flex-none">
          <Button variant="outline" size="lg" onClick={onPreviewHtml} disabled={sending} className="flex-1 md:flex-none">
            <Eye className="mr-2 h-4 w-4 text-slate-500" />
            Preview HTML
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={onExportCsv}
            disabled={sending}
            title="Download CSV of targeted audience (dry run)"
            className="flex-1 md:flex-none"
          >
            <Download className="mr-2 h-4 w-4 text-slate-500" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
