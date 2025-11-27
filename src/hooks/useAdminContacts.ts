import { useQuery } from "@tanstack/react-query";
import { fetchAllContactsAdmin, fetchAllVipContactsAdmin, Contact } from "@/lib/contactUtil";

interface UseAdminContactsOptions {
  page: number;
  pageSize: number;
  source: "aroosi" | "vip";
}

export function useAdminContacts({ page, pageSize, source }: UseAdminContactsOptions) {
  const queryKey = ["admin-contacts", source, { page, pageSize }];
  
  const queryFn = () => {
    if (source === "vip") {
      return fetchAllVipContactsAdmin("", { page, pageSize });
    }
    return fetchAllContactsAdmin("", { page, pageSize });
  };

  const {
    data: contacts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    contacts,
    isLoading,
    isError,
    error,
    refetch,
  };
}
