import { useQuery } from "@tanstack/react-query";
import { adminContactAPI, Contact } from "@/lib/api/admin/contact";

interface UseAdminContactsOptions {
  page: number;
  pageSize: number;
  source: "aroosi" | "vip";
}

export function useAdminContacts({ page, pageSize, source }: UseAdminContactsOptions) {
  const queryKey = ["admin-contacts", source, { page, pageSize }];
  
  const queryFn = () => adminContactAPI.list({ page, pageSize, source });

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
    contacts: (contacts || []) as Contact[],
    isLoading,
    isError,
    error,
    refetch,
  };
}
