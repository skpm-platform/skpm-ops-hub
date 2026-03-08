import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSystemSetting(key: string) {
  return useQuery({
    queryKey: ["system-setting", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      return data?.value ?? null;
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      const { error } = await supabase.rpc("upsert_system_setting", {
        _key: key,
        _value: value,
        _updated_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["system-setting", key] });
    },
  });
}
