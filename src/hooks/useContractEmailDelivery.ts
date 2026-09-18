import { useQuery } from "@tanstack/react-query";
import { invokeAuthenticatedFunction } from "@/lib/authenticated-function";

export type ContractEmailDeliveryState = "delivered" | "rejected" | "processing" | "unknown";

export interface ContractEmailDelivery {
  state: ContractEmailDeliveryState;
  recipient?: string | null;
  event_at?: string | null;
  reason?: string | null;
  checked_at: string;
}

export function useContractEmailDelivery(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["contract-email-delivery", documentId],
    queryFn: async () => {
      const { data } = await invokeAuthenticatedFunction<ContractEmailDelivery>(
        "check-contract-email-delivery",
        { document_id: documentId },
      );
      return data;
    },
    enabled: enabled && !!documentId,
    staleTime: 60_000,
    retry: false,
  });
}