import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSystemSetting(key: string) {
  return useQuery({
    queryKey: ["system-setting", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", key)
        .single();
      return data?.value ?? null;
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ["system-setting", key] });
    },
  });
}
