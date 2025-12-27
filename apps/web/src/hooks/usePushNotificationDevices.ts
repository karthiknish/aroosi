import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminPushAPI } from "@/lib/api/admin/push";
import { DeviceItem, PushNotificationAnalytics } from "../app/(authenticated)/admin/push-notification/types";

export function usePushNotificationDevices() {
  const [deviceSearch, setDeviceSearch] = useState("");
  const [devicePage, setDevicePage] = useState(1);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  const [confirmSendUsersOpen, setConfirmSendUsersOpen] = useState(false);
  const [confirmSendDevicesOpen, setConfirmSendDevicesOpen] = useState(false);
  const [pendingExternalIds, setPendingExternalIds] = useState<string[]>([]);
  const [pendingPlayerIds, setPendingPlayerIds] = useState<string[]>([]);

  const devicePageSize = 20;

  const {
    data: devicesData,
    isLoading: devicesLoading,
    refetch: fetchDevices,
  } = useQuery({
    queryKey: ["admin", "push", "devices", { search: deviceSearch, page: devicePage }],
    queryFn: () => adminPushAPI.getDevices({ search: deviceSearch, page: devicePage, pageSize: devicePageSize }),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["admin", "push", "analytics"],
    queryFn: () => adminPushAPI.getAnalytics(),
  });

  const devices = (devicesData?.devices || []) as DeviceItem[];
  const deviceTotal = devicesData?.total || 0;

  const analytics = useMemo<PushNotificationAnalytics>(() => {
    if (analyticsData) return analyticsData;
    
    // Fallback to calculating from current page if analytics endpoint fails or is loading
    return {
      totalDevices: deviceTotal,
      activeDevices: devices.filter((d) => d.isActive).length,
      iosDevices: devices.filter((d) => d.deviceType === "ios").length,
      androidDevices: devices.filter((d) => d.deviceType === "android").length,
      webDevices: devices.filter((d) => d.deviceType === "web").length,
      recentNotifications: 0,
    };
  }, [analyticsData, devices, deviceTotal]);

  return {
    devices,
    deviceSearch,
    setDeviceSearch,
    devicePage,
    setDevicePage,
    deviceTotal,
    devicesLoading,
    selectedDevices,
    setSelectedDevices,
    analytics,
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
