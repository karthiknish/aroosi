import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { History, CheckCircle2, Clock, AlertCircle, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CampaignHistoryProps {
  campaigns: any[];
  showCampaignHistory: boolean;
  setShowCampaignHistory: (val: boolean) => void;
  loadCampaignHistory: () => void;
}

export function CampaignHistory({
  campaigns,
  showCampaignHistory,
  setShowCampaignHistory,
  loadCampaignHistory,
}: CampaignHistoryProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            Campaign History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextState = !showCampaignHistory;
              setShowCampaignHistory(nextState);
              if (nextState) {
                loadCampaignHistory();
              }
            }}
            className="text-slate-500 hover:text-slate-900"
          >
            {showCampaignHistory ? "Hide" : "Show"}
          </Button>
        </div>
      </CardHeader>

      {showCampaignHistory && (
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="bg-slate-100 p-3 rounded-full mb-3">
                  <History className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">No campaigns yet</p>
                <p className="text-xs text-slate-500 mt-1">Your sent campaigns will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate text-slate-900">
                          {campaign.templateKey || campaign.subject || "Custom Campaign"}
                        </span>
                        {campaign.dryRun && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-200 text-amber-700 bg-amber-50">
                            Dry Run
                          </Badge>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs flex items-center gap-2">
                        <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                        <span className="text-slate-300">•</span>
                        <span>{campaign.totalSent} recipients</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {campaign.status === "completed" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 pl-1.5">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </Badge>
                        ) : campaign.status === "processing" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 pl-1.5">
                            <Clock className="h-3 w-3 animate-pulse" /> Processing
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 pl-1.5">
                            <AlertCircle className="h-3 w-3" /> {campaign.status}
                          </Badge>
                        )}
                      </div>
                      
                      <Link
                        href={`/admin/marketing-email/campaign/${campaign.id}`}
                        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                        title="View Report"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
