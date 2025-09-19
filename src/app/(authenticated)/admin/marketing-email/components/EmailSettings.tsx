"use client";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface EmailSettingsProps {
  subject: string;
  setSubject: (subject: string) => void;
  preheader: string;
  setPreheader: (preheader: string) => void;
}

export function EmailSettings({
  subject,
  setSubject,
  preheader,
  setPreheader,
}: EmailSettingsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Email Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="subject-input" className="text-sm font-medium text-slate-700">
            Subject Line
          </label>
          <Input
            id="subject-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
            className="w-full"
          />
          <p className="text-xs text-slate-500">{subject.length}/100 characters</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="preheader-input" className="text-sm font-medium text-slate-700">
            Preheader Text
          </label>
          <Input
            id="preheader-input"
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            placeholder="Short preview text"
            className="w-full"
          />
          <p className="text-xs text-slate-500">{preheader.length}/150 characters</p>
        </div>
      </CardContent>
    </Card>
  );
}
