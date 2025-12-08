import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Users, Search, Filter, MapPin, Calendar, Activity, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AudienceFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  plan: string;
  setPlan: (value: string) => void;
  banned: string;
  setBanned: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  lastActiveDays: number;
  setLastActiveDays: (value: number) => void;
  createdAtFrom: string;
  setCreatedAtFrom: (value: string) => void;
  createdAtTo: string;
  setCreatedAtTo: (value: string) => void;
  completionMin: number;
  setCompletionMin: (value: number) => void;
  completionMax: number;
  setCompletionMax: (value: number) => void;
  maxAudience: number;
  setMaxAudience: (value: number) => void;
  sendToAll: boolean;
  setSendToAll: (value: boolean) => void;
  dryRun: boolean;
}

export function AudienceFilters({
  search,
  setSearch,
  plan,
  setPlan,
  banned,
  setBanned,
  city,
  setCity,
  country,
  setCountry,
  page,
  setPage,
  pageSize,
  setPageSize,
  lastActiveDays,
  setLastActiveDays,
  createdAtFrom,
  setCreatedAtFrom,
  createdAtTo,
  setCreatedAtTo,
  completionMin,
  setCompletionMin,
  completionMax,
  setCompletionMax,
  maxAudience,
  setMaxAudience,
  sendToAll,
  setSendToAll,
  dryRun,
}: AudienceFiltersProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4 border-b bg-slate-50/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Audience Targeting
        </CardTitle>
        <CardDescription>
          Define who will receive this campaign. Use filters to narrow down your audience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Safety & Volume Controls */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Send to All Matching Users</Label>
              <p className="text-sm text-muted-foreground">
                If enabled, the "Max Audience Size" limit will be ignored.
              </p>
            </div>
            <Switch
              checked={sendToAll}
              onCheckedChange={setSendToAll}
            />
          </div>
          
          <div className={`transition-opacity duration-200 ${sendToAll ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            <Label htmlFor="max-audience">Max Audience Size (Safety Limit)</Label>
            <Input
              id="max-audience"
              type="number"
              min={1}
              max={10000}
              value={maxAudience}
              onChange={(e) => setMaxAudience(parseInt(e.target.value || "0", 10))}
              className="mt-1.5 max-w-[200px]"
            />
          </div>
        </div>

        {!dryRun && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="space-y-1">
              <div className="font-semibold">Live Mode Active</div>
              <p>Emails will be sent to real users matching these filters. Please double-check your audience settings.</p>
            </div>
          </div>
        )}

        {/* Primary Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              Search Users
            </Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email address..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan" className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              Subscription Plan
            </Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="plan" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="premiumPlus">Premium Plus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="banned" className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-slate-500" />
              Account Status
            </Label>
            <Select value={banned} onValueChange={setBanned}>
              <SelectTrigger id="banned" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="true">Banned Only</SelectItem>
                <SelectItem value="false">Active Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters Accordion */}
        <Accordion type="single" collapsible className="w-full border rounded-lg bg-white">
          <AccordionItem value="advanced" className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 hover:no-underline rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Filter className="h-4 w-4" />
                Advanced Targeting Filters
                {(city || country || Number.isFinite(lastActiveDays) || createdAtFrom || createdAtTo || Number.isFinite(completionMin)) && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Active
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 space-y-6 border-t">
              {/* Location */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-900">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  Location
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs text-slate-500">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. London"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs text-slate-500">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. UK"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Activity & Dates */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-900">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  Activity & Registration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="last-active-days" className="text-xs text-slate-500">Inactive Days (≥)</Label>
                    <Input
                      id="last-active-days"
                      type="number"
                      min={1}
                      max={3650}
                      value={Number.isFinite(lastActiveDays) ? lastActiveDays : ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || "", 10);
                        setLastActiveDays(Number.isFinite(v) ? v : (NaN as any));
                      }}
                      placeholder="e.g. 30"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="created-from" className="text-xs text-slate-500">Registered From</Label>
                    <Input
                      id="created-from"
                      type="date"
                      value={createdAtFrom}
                      onChange={(e) => setCreatedAtFrom(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="created-to" className="text-xs text-slate-500">Registered To</Label>
                    <Input
                      id="created-to"
                      type="date"
                      value={createdAtTo}
                      onChange={(e) => setCreatedAtTo(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Profile Completion */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2 text-slate-900">
                  <Activity className="h-4 w-4 text-slate-500" />
                  Profile Completion
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-slate-500">Min %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={Number.isFinite(completionMin) ? completionMin : ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || "", 10);
                        setCompletionMin(Number.isFinite(v) ? v : (NaN as any));
                      }}
                      className="h-9"
                    />
                  </div>
                  <span className="text-slate-300 mt-6">—</span>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-slate-500">Max %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="100"
                      value={Number.isFinite(completionMax) ? completionMax : ""}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || "", 10);
                        setCompletionMax(Number.isFinite(v) ? v : (NaN as any));
                      }}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Pagination Settings (Collapsed/Subtle) */}
        <div className="pt-4 border-t flex gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Label htmlFor="page" className="whitespace-nowrap">Page:</Label>
            <Input
              id="page"
              type="number"
              min={1}
              value={page}
              onChange={(e) => setPage(parseInt(e.target.value || "1", 10))}
              className="h-8 w-16"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pageSize" className="whitespace-nowrap">Batch Size:</Label>
            <Input
              id="pageSize"
              type="number"
              min={10}
              max={5000}
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value || "500", 10))}
              className="h-8 w-20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
