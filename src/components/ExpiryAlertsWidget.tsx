import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ChevronRight, Shield, CreditCard, FileText, User } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ExpiryItem {
  id: string;
  label: string;
  type: "visa" | "medical" | "safety" | "contract";
  expiryDate: string;
  entity: string;
  daysLeft: number;
}

function getUrgency(days: number): { color: string; label: string } {
  if (days < 0) return { color: "bg-destructive text-destructive-foreground", label: "Expired" };
  if (days <= 7) return { color: "bg-destructive text-destructive-foreground", label: "Critical" };
  if (days <= 30) return { color: "bg-warning text-warning-foreground", label: "Urgent" };
  if (days <= 60) return { color: "bg-info text-info-foreground", label: "Soon" };
  return { color: "bg-muted text-muted-foreground", label: "OK" };
}

const typeIcons = {
  visa: User,
  medical: Shield,
  safety: CreditCard,
  contract: FileText,
};

export function ExpiryAlertsWidget() {
  const navigate = useNavigate();

  const { data: expiryItems = [], isLoading } = useQuery({
    queryKey: ["expiry-alerts"],
    queryFn: async () => {
      const today = new Date();
      const items: ExpiryItem[] = [];

      // Fetch employees with expiring visas
      const { data: employees } = await supabase
        .from("employees")
        .select("id, name, visa_expiry")
        .not("visa_expiry", "is", null)
        .eq("status", "active")
        .order("visa_expiry", { ascending: true })
        .limit(100);

      employees?.forEach((e) => {
        if (e.visa_expiry) {
          const days = differenceInDays(parseISO(e.visa_expiry), today);
          if (days <= 90) {
            items.push({
              id: `visa-${e.id}`,
              label: "Visa Expiry",
              type: "visa",
              expiryDate: e.visa_expiry,
              entity: e.name,
              daysLeft: days,
            });
          }
        }
      });

      // Fetch workers with expiring medical/safety cards
      const { data: workers } = await supabase
        .from("workers")
        .select("id, name, medical_expiry, safety_card_expiry")
        .eq("status", "active")
        .limit(100);

      workers?.forEach((w) => {
        if (w.medical_expiry) {
          const days = differenceInDays(parseISO(w.medical_expiry), today);
          if (days <= 90) {
            items.push({
              id: `med-${w.id}`,
              label: "Medical Card",
              type: "medical",
              expiryDate: w.medical_expiry,
              entity: w.name,
              daysLeft: days,
            });
          }
        }
        if (w.safety_card_expiry) {
          const days = differenceInDays(parseISO(w.safety_card_expiry), today);
          if (days <= 90) {
            items.push({
              id: `safety-${w.id}`,
              label: "Safety Card",
              type: "safety",
              expiryDate: w.safety_card_expiry,
              entity: w.name,
              daysLeft: days,
            });
          }
        }
      });

      // Fetch expiring contracts
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, contract_no, end_date")
        .eq("status", "active")
        .not("end_date", "is", null)
        .order("end_date", { ascending: true })
        .limit(50);

      contracts?.forEach((c) => {
        if (c.end_date) {
          const days = differenceInDays(parseISO(c.end_date), today);
          if (days <= 90) {
            items.push({
              id: `contract-${c.id}`,
              label: "Contract End",
              type: "contract",
              expiryDate: c.end_date,
              entity: c.contract_no || "Unnamed",
              daysLeft: days,
            });
          }
        }
      });

      return items.sort((a, b) => a.daysLeft - b.daysLeft);
    },
    refetchInterval: 300000,
  });

  const criticalCount = expiryItems.filter((i) => i.daysLeft <= 7).length;
  const urgentCount = expiryItems.filter((i) => i.daysLeft > 7 && i.daysLeft <= 30).length;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-warning/15 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Expiry Alerts</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {criticalCount > 0 && <span className="text-destructive font-semibold">{criticalCount} critical</span>}
                {criticalCount > 0 && urgentCount > 0 && " · "}
                {urgentCount > 0 && <span className="text-warning font-semibold">{urgentCount} urgent</span>}
                {criticalCount === 0 && urgentCount === 0 && "All clear ✓"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {expiryItems.length} item{expiryItems.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : expiryItems.length > 0 ? (
          <>
            {expiryItems.slice(0, 8).map((item) => {
              const urgency = getUrgency(item.daysLeft);
              const Icon = typeIcons[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-2 -mx-2 rounded border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.entity}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.label} · {format(parseISO(item.expiryDate), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge className={`text-[9px] h-5 px-1.5 shrink-0 ${urgency.color}`}>
                    {item.daysLeft < 0
                      ? `${Math.abs(item.daysLeft)}d overdue`
                      : item.daysLeft === 0
                        ? "Today"
                        : `${item.daysLeft}d left`}
                  </Badge>
                </div>
              );
            })}
            {expiryItems.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground mt-1"
                onClick={() => navigate("/employees")}
              >
                +{expiryItems.length - 8} more items <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-8 gap-2">
            <Clock className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No upcoming expiries</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
