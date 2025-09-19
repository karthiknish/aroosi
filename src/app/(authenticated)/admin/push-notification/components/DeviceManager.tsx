import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Send,
  Users,
  RefreshCw,
  Copy,
  TestTube,
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
  setDevicePage: (value: number) => void;
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
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Management
          </CardTitle>
          <Badge variant="outline">
            {deviceTotal.toLocaleString()} devices
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <Input
            value={deviceSearch}
            onChange={(e) => setDeviceSearch(e.target.value)}
            placeholder="Search by email, player ID, or device type"
            className="max-w-md"
          />
          <Button
            onClick={() => {
              setDevicePage(1);
              fetchDevices();
            }}
            disabled={devicesLoading}
          >
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchDevices()}
            disabled={devicesLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              const ids = Array.from(selectedDevices);
              if (!ids.length) return;
              setPendingPlayerIds(ids);
              setConfirmSendDevicesOpen(true);
            }}
            disabled={selectedDevices.size === 0}
            title="Prefill Include Player IDs and go to Compose"
          >
            <Send className="h-4 w-4 mr-1" />
            Send to selected devices
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
            title="Prefill Include External User IDs and go to Compose"
            variant="outline"
          >
            <Users className="h-4 w-4 mr-1" />
            Send to selected users
          </Button>
        </div>

        {/* Device Table */}
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">
                  <input
                    type="checkbox"
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
                </th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Player ID</th>
                <th className="text-left p-3">Device</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Registered</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.playerId}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
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
                  </td>
                  <td className="p-3">
                    {device.email ? (
                      <button
                        type="button"
                        className="underline underline-offset-2 text-pink-600 hover:text-pink-700"
                        onClick={() => {
                          setDeviceSearch(device.email!);
                          setDevicePage(1);
                          fetchDevices();
                        }}
                        title={`Filter by ${device.email}`}
                      >
                        {device.email}
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {device.playerId.slice(0, 8)}...
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(device.playerId)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize">
                      {device.deviceType}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {device.isActive ? (
                      <Badge className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">
                    {device.registeredAt
                      ? new Date(device.registeredAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestPlayerId(device.playerId)}
                        title="Use for test notification"
                      >
                        <TestTube className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td
                    className="p-8 text-center text-gray-500"
                    colSpan={7}
                  >
                    {devicesLoading
                      ? "Loading devices..."
                      : "No devices found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {devices.length} of {deviceTotal.toLocaleString()}{" "}
            devices
            {selectedDevices.size > 0 && (
              <span className="ml-4 text-pink-600">
                {selectedDevices.size} selected
              </span>
            )}
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
            <div className="text-sm">
              Page {devicePage} of {totalDevicePages}
            </div>
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
