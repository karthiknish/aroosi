import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Smartphone,
  Send,
  Users,
  RefreshCw,
  Copy,
  TestTube,
  Search,
  Monitor,
  Apple,
} from "lucide-react";

interface DeviceItem {
  userId: string;
  email: string | null;
  playerId: string;
  deviceType: string;
  deviceToken: string | null;
  isActive: boolean;
  registeredAt: number | null;
}

interface DeviceManagerProps {
  devices: DeviceItem[];
  deviceSearch: string;
  setDeviceSearch: (value: string) => void;
  devicePage: number;
  setDevicePage: (value: number | ((prev: number) => number)) => void;
  deviceTotal: number;
  devicesLoading: boolean;
  selectedDevices: Set<string>;
  setSelectedDevices: (value: Set<string>) => void;
  setTestPlayerId: (value: string) => void;
  setPendingExternalIds: (value: string[]) => void;
  setPendingPlayerIds: (value: string[]) => void;
  setConfirmSendUsersOpen: (value: boolean) => void;
  setConfirmSendDevicesOpen: (value: boolean) => void;
  setActiveTab: (value: "compose") => void;
  copyToClipboard: (text: string) => void;
  fetchDevices: () => void;
  totalDevicePages: number;
}

export function DeviceManager({
  devices,
  deviceSearch,
  setDeviceSearch,
  devicePage,
  setDevicePage,
  deviceTotal,
  devicesLoading,
  selectedDevices,
  setSelectedDevices,
  setTestPlayerId,
  setPendingExternalIds,
  setPendingPlayerIds,
  setConfirmSendUsersOpen,
  setConfirmSendDevicesOpen,
  setActiveTab,
  copyToClipboard,
  fetchDevices,
  totalDevicePages,
}: DeviceManagerProps) {
  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "ios":
        return <Apple className="h-4 w-4" />;
      case "android":
        return <Smartphone className="h-4 w-4" />;
      case "web":
        return <Monitor className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-500 rounded-xl">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            Device Management
          </CardTitle>
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {deviceTotal.toLocaleString()} devices
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                placeholder="Search by email, player ID..."
                className="pl-9 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <Button
              onClick={() => {
                setDevicePage(1);
                fetchDevices();
              }}
              disabled={devicesLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchDevices()}
              disabled={devicesLoading}
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${devicesLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            <Button
              onClick={() => {
                const ids = Array.from(selectedDevices);
                if (!ids.length) return;
                setPendingPlayerIds(ids);
                setConfirmSendDevicesOpen(true);
              }}
              disabled={selectedDevices.size === 0}
              title="Send to selected devices"
              variant="secondary"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send to Devices</span>
              {selectedDevices.size > 0 && (
                <Badge className="ml-1 bg-slate-900 text-white hover:bg-slate-800">
                  {selectedDevices.size}
                </Badge>
              )}
            </Button>
            <Button
              onClick={() => {
                if (selectedDevices.size === 0) return;
                const selected = new Set(selectedDevices);
                const userIds = Array.from(
                  new Set(
                    devices
                      .filter((d) => selected.has(d.playerId))
                      .map((d) => d.userId)
                      .filter(Boolean)
                  )
                );
                if (userIds.length === 0) return;
                setPendingExternalIds(userIds);
                setConfirmSendUsersOpen(true);
              }}
              disabled={selectedDevices.size === 0}
              title="Send to selected users"
              variant="outline"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Send to Users</span>
            </Button>
          </div>
        </div>

        {/* Device Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDevices(
                          new Set(devices.map((d) => d.playerId))
                        );
                      } else {
                        setSelectedDevices(new Set());
                      }
                    }}
                    checked={
                      selectedDevices.size === devices.length &&
                      devices.length > 0
                    }
                  />
                </TableHead>
                <TableHead>User / Email</TableHead>
                <TableHead>Player ID</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devicesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No devices found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.playerId} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedDevices.has(device.playerId)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedDevices);
                          if (e.target.checked) {
                            newSelected.add(device.playerId);
                          } else {
                            newSelected.delete(device.playerId);
                          }
                          setSelectedDevices(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {device.email ? (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            className="text-left font-medium text-slate-900 hover:text-blue-600 transition-colors"
                            onClick={() => {
                              setDeviceSearch(device.email!);
                              setDevicePage(1);
                              fetchDevices();
                            }}
                          >
                            {device.email}
                          </button>
                          <span className="text-xs text-slate-500 font-mono">{device.userId}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Anonymous User</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 group">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono border border-slate-200">
                          {device.playerId.slice(0, 8)}...
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(device.playerId)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.deviceType)}
                        <span className="capitalize text-sm">{device.deviceType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {device.isActive ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 bg-slate-50">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {device.registeredAt
                        ? new Date(device.registeredAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => setTestPlayerId(device.playerId)}
                        title="Use for test notification"
                      >
                        <TestTube className="h-4 w-4 text-slate-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-slate-500">
            Page {devicePage} of {totalDevicePages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDevicePage((p) => Math.max(1, p - 1))}
              disabled={devicePage <= 1 || devicesLoading}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDevicePage((p) => Math.min(totalDevicePages, p + 1))
              }
              disabled={devicePage >= totalDevicePages || devicesLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
