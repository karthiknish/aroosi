"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Kind = "passwordChanged" | "emailChanged" | "newDevice" | "subscriptionReceipt";

export default function TxPreviewPage() {
  const [html, setHtml] = useState<string>("");
  const [kind, setKind] = useState<Kind>("passwordChanged");
  const [vars, setVars] = useState<any>({
    loginUrl: "https://aroosi.app/sign-in",
    oldEmail: "old@example.com",
    newEmail: "new@example.com",
    device: "Chrome on macOS",
    location: "San Francisco, US",
    time: new Date().toLocaleString(),
    plan: "Premium",
    amount: "9.99",
    currency: "USD",
    periodStart: new Date().toLocaleDateString(),
    periodEnd: new Date(Date.now() + 30*24*3600*1000).toLocaleDateString(),
    invoiceUrl: "https://billing.example.com/invoice/123",
  });

  const doPreview = async () => {
    const res = await fetch(`/api/admin/transactional-email/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, vars }),
    });
    const data = await res.json();
    if (res.ok && data?.data?.html) setHtml(data.data.html);
  };

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle>Transactional Email Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-sm" htmlFor="kind">Template</label>
          <select id="kind" className="border rounded px-2 py-1 text-sm" value={kind} onChange={(e)=> setKind(e.target.value as Kind)}>
            <option value="passwordChanged">Password Changed</option>
            <option value="emailChanged">Email Changed</option>
            <option value="newDevice">New Device Login</option>
            <option value="subscriptionReceipt">Subscription Receipt</option>
          </select>
          <Button onClick={doPreview}>Preview</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Variables</div>
            {Object.keys(vars).map((k)=> (
              <div key={k} className="flex items-center gap-2">
                <label className="text-xs w-36">{k}</label>
                <Input value={String(vars[k] ?? '')} onChange={(e)=> setVars({ ...vars, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Preview</div>
            {html ? (
              <iframe title="tx-preview" className="w-full h-[600px] bg-white rounded border" sandbox="allow-same-origin" srcDoc={html} />
            ) : (
              <div className="text-sm text-muted-foreground">Click Preview to render selected template.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


