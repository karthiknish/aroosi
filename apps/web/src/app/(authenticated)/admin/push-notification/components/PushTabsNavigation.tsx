import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Smartphone, TestTube, Copy } from "lucide-react";

export function PushTabsNavigation() {
  return (
    <div className="border-b border-neutral/20 bg-neutral/5">
      <TabsList className="grid w-full grid-cols-4 bg-transparent h-14 p-1">
        <TabsTrigger
          value="compose"
          className="gap-2 data-[state=active]:bg-base-light data-[state=active]:shadow-md data-[state=active]:text-neutral-dark data-[state=active]:border data-[state=active]:border-neutral/20 rounded-lg transition-all"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Compose</span>
        </TabsTrigger>
        <TabsTrigger
          value="devices"
          className="gap-2 data-[state=active]:bg-base-light data-[state=active]:shadow-md data-[state=active]:text-neutral-dark data-[state=active]:border data-[state=active]:border-neutral/20 rounded-lg transition-all"
        >
          <Smartphone className="h-4 w-4" />
          <span className="hidden sm:inline">Devices</span>
        </TabsTrigger>
        <TabsTrigger
          value="test"
          className="gap-2 data-[state=active]:bg-base-light data-[state=active]:shadow-md data-[state=active]:text-neutral-dark data-[state=active]:border data-[state=active]:border-neutral/20 rounded-lg transition-all"
        >
          <TestTube className="h-4 w-4" />
          <span className="hidden sm:inline">Test</span>
        </TabsTrigger>
        <TabsTrigger
          value="templates"
          className="gap-2 data-[state=active]:bg-base-light data-[state=active]:shadow-md data-[state=active]:text-neutral-dark data-[state=active]:border data-[state=active]:border-neutral/20 rounded-lg transition-all"
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Templates</span>
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
