import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Info, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Insight {
  title: string;
  insight: string;
  type: "success" | "warning" | "danger" | "info";
}

const typeConfig = {
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  danger: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10" },
};

interface AIInsightsWidgetProps {
  kpiData: Record<string, any>;
}

export function AIInsightsWidget({ kpiData }: AIInsightsWidgetProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { kpiData },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data.insights || []);
      setGenerated(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  if (!generated) {
    return (
      <Card className="border shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">AI Business Insights</p>
            <p className="text-xs text-muted-foreground mt-1">Get AI-powered analysis of your KPIs</p>
          </div>
          <Button size="sm" className="gap-2 mt-1" onClick={generateInsights} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? "Analyzing..." : "Generate Insights"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Insights
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={generateInsights} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((ins, i) => {
          const cfg = typeConfig[ins.type] || typeConfig.info;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-md ${cfg.bg}`}>
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{ins.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{ins.insight}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
