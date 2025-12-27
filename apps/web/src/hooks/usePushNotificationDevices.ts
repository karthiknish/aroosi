import { useState, useEffect, useCallback } from "react";
import { DeviceItem, PushNotificationAnalytics } from "../app/(authenticated)/admin/push-notification/types";
import { showErrorToast } from "@/lib/ui/toast";

export function usePushNotificationDevices() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [devicePage, setDevicePage] = useState(1);
  const [deviceTotal, setDeviceTotal] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  const [analytics, setAnalytics] = useState<PushNotificationAnalytics>({
    totalDevices: 0,
    activeDevices: 0,
    iosDevices: 0,
    androidDevices: 0,
    webDevices: 0,
    recentNotifications: 0,
  });

  const [confirmSendUsersOpen, setConfirmSendUsersOpen] = useState(false);
  const [confirmSendDevicesOpen, setConfirmSendDevicesOpen] = useState(false);
  const [pendingExternalIds, setPendingExternalIds] = useState<string[]>([]);
  const [pendingPlayerIds, setPendingPlayerIds] = useState<string[]>([]);

  const devicePageSize = 20;

  const fetchDevices = useCallback(async (override?: {
    search?: string;
    page?: number;
  }) => {
    setDevicesLoading(true);
    try {
      const params = new URLSearchParams();
      const s = override?.search ?? deviceSearch;
      const p = override?.page ?? devicePage;
      if (s.trim()) params.set("search", s.trim());
      params.set("page", String(p));
      params.set("pageSize", String(devicePageSize));

      const res = await fetch(
        `/api/admin/push-notification/devices?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch devices");

      const data = await res.json();
      const items = data?.data?.items ?? [];
      setDevices(items);
      setDeviceTotal(data?.data?.total ?? 0);

      setAnalytics((prev) => ({
        ...prev,
        totalDevices: data?.data?.total ?? 0,
        activeDevices: items.filter((d: DeviceItem) => d.isActive).length,
        iosDevices: items.filter((d: DeviceItem) => d.deviceType === "ios").length,
        androidDevices: items.filter((d: DeviceItem) => d.deviceType === "android").length,
        webDevices: items.filter((d: DeviceItem) => d.deviceType === "web").length,
      }));
    } catch (_e) {
      console.error(_e);
      showErrorToast(null, "Failed to fetch devices");
    } finally {
      setDevicesLoading(false);
    }
  }, [deviceSearch, devicePage]);

  useEffect(() => {
    fetchDevices();
  }, [devicePage, fetchDevices]);

  return {
    devices,
    setDevices,
    deviceSearch,
    setDeviceSearch,
    devicePage,
    setDevicePage,
    deviceTotal,
    devicesLoading,
    selectedDevices,
    setSelectedDevices,
    analytics,
    setAnalytics,
    devicePageSize,
    fetchDevices,
    confirmSendUsersOpen,
    setConfirmSendUsersOpen,
    confirmSendDevicesOpen,
    setConfirmSendDevicesOpen,
    pendingExternalIds,
    setPendingExternalIds,
    pendingPlayerIds,
    setPendingPlayerIds,
  };
}
