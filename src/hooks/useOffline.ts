import { useEffect, useState } from "react";

export function useOffline(): boolean {
  const getOnlineStatus = () =>
    typeof window !== "undefined" && typeof navigator !== "undefined"
      ? !navigator.onLine
      : false;

  const [isOffline, setIsOffline] = useState(getOnlineStatus);

  useEffect(() => {
    function update() {
      setIsOffline(getOnlineStatus());
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return isOffline;
}
