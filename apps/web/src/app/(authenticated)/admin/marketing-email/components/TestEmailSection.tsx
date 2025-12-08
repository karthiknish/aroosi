import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beaker, Send, ChevronDown, ChevronUp } from "lucide-react";

interface TestEmailSectionProps {
  testEmail: string;
  setTestEmail: (val: string) => void;
  sendingTest: boolean;
  onSendTest: () => void;
  showTestSection: boolean;
  setShowTestSection: (val: boolean) => void;
}

export function TestEmailSection({
  testEmail,
  setTestEmail,
  sendingTest,
  onSendTest,
  showTestSection,
  setShowTestSection,
}: TestEmailSectionProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Beaker className="h-5 w-5 text-slate-500" />
            Test Campaign
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTestSection(!showTestSection)}
            className="text-slate-500 hover:text-slate-900"
          >
            {showTestSection ? (
              <>Hide <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Show <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {showTestSection && (
        <CardContent className="pt-4">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Send a test email to verify your content, layout, and personalization before sending to your real audience.
            </p>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  type="email"
                  placeholder="Enter test email address..."
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="pl-9"
                />
                <Send className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <Button
                onClick={onSendTest}
                disabled={sendingTest || !testEmail.trim()}
                variant="secondary"
                className="min-w-[140px] bg-slate-100 hover:bg-slate-200 text-slate-900"
              >
                {sendingTest ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
