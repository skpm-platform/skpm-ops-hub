import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSystemSetting, useUpdateSystemSetting } from "@/hooks/use-system-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUserRole } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User, Building2, Palette, Shield, Loader2, Upload, Settings2, Users, Lock,
  Bell, Database, Globe, Clock, FileText, AlertTriangle, Activity, Wrench,
  DollarSign, CalendarDays, HardHat, Truck, Warehouse as WarehouseIcon
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logAudit } from "@/lib/audit";
import { PasswordStrengthMeter, isPasswordStrong } from "@/components/PasswordStrengthMeter";
import { RoleGuard } from "@/components/RoleGuard";

// ─── Reusable setting hook with local state ───
function useSettingField(key: string, fallback = "") {
  const { data, isLoading } = useSystemSetting(key);
  const [value, setValue] = useState(fallback);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && data !== undefined) {
      setValue(data || fallback);
      setInitialized(true);
    }
  }, [data, initialized, fallback]);
  return { value, setValue, isLoading };
}

// ─── Company Settings Tab ───
function CompanySettingsTab() {
  const updateSetting = useUpdateSystemSetting();
  const name = useSettingField("company_name", "SKPM Technical Service");
  const license = useSettingField("company_license");
  const address = useSettingField("company_address");
  const phone = useSettingField("company_phone");
  const email = useSettingField("company_email");
  const website = useSettingField("company_website");
  const trn = useSettingField("company_trn");
  const poBox = useSettingField("company_po_box");

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "company_name", value: name.value }),
        updateSetting.mutateAsync({ key: "company_license", value: license.value }),
        updateSetting.mutateAsync({ key: "company_address", value: address.value }),
        updateSetting.mutateAsync({ key: "company_phone", value: phone.value }),
        updateSetting.mutateAsync({ key: "company_email", value: email.value }),
        updateSetting.mutateAsync({ key: "company_website", value: website.value }),
        updateSetting.mutateAsync({ key: "company_trn", value: trn.value }),
        updateSetting.mutateAsync({ key: "company_po_box", value: poBox.value }),
      ]);
      await logAudit("Updated company settings", "settings");
      toast.success("Company settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Information</CardTitle>
        <CardDescription>Your organization's legal and contact details used across invoices, quotations, and reports.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Company Name</Label><Input value={name.value} onChange={e => name.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Trade License No.</Label><Input placeholder="TL-XXXX-XXXX" value={license.value} onChange={e => license.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>TRN (Tax Registration No.)</Label><Input placeholder="100XXXXXXXXX" value={trn.value} onChange={e => trn.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>P.O. Box</Label><Input placeholder="P.O. Box XXXXX" value={poBox.value} onChange={e => poBox.setValue(e.target.value)} /></div>
          <div className="sm:col-span-2 space-y-2"><Label>Address</Label><Input placeholder="Full company address" value={address.value} onChange={e => address.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input placeholder="+971 XX XXX XXXX" value={phone.value} onChange={e => phone.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input placeholder="info@company.com" value={email.value} onChange={e => email.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Website</Label><Input placeholder="www.company.com" value={website.value} onChange={e => website.setValue(e.target.value)} /></div>
        </div>
        <Button onClick={handleSave} size="sm" className="h-9" disabled={saving}>
          {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Finance Settings Tab (Admin) ───
function FinanceSettingsTab() {
  const updateSetting = useUpdateSystemSetting();
  const currency = useSettingField("default_currency", "AED");
  const vatRate = useSettingField("vat_rate", "5");
  const invoicePrefix = useSettingField("invoice_prefix", "INV-");
  const quotePrefix = useSettingField("quote_prefix", "QT-");
  const poPrefix = useSettingField("po_prefix", "PO-");
  const paymentTerms = useSettingField("payment_terms", "30");
  const bankName = useSettingField("bank_name");
  const bankAccount = useSettingField("bank_account");
  const bankIban = useSettingField("bank_iban");
  const bankSwift = useSettingField("bank_swift");

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "default_currency", value: currency.value }),
        updateSetting.mutateAsync({ key: "vat_rate", value: vatRate.value }),
        updateSetting.mutateAsync({ key: "invoice_prefix", value: invoicePrefix.value }),
        updateSetting.mutateAsync({ key: "quote_prefix", value: quotePrefix.value }),
        updateSetting.mutateAsync({ key: "po_prefix", value: poPrefix.value }),
        updateSetting.mutateAsync({ key: "payment_terms", value: paymentTerms.value }),
        updateSetting.mutateAsync({ key: "bank_name", value: bankName.value }),
        updateSetting.mutateAsync({ key: "bank_account", value: bankAccount.value }),
        updateSetting.mutateAsync({ key: "bank_iban", value: bankIban.value }),
        updateSetting.mutateAsync({ key: "bank_swift", value: bankSwift.value }),
      ]);
      await logAudit("Updated finance settings", "settings");
      toast.success("Finance settings saved");
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financial Configuration</CardTitle>
          <CardDescription>Currency, VAT, document numbering, and payment terms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={currency.value} onValueChange={v => currency.setValue(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                  <SelectItem value="QAR">QAR — Qatari Riyal</SelectItem>
                  <SelectItem value="BHD">BHD — Bahraini Dinar</SelectItem>
                  <SelectItem value="OMR">OMR — Omani Rial</SelectItem>
                  <SelectItem value="KWD">KWD — Kuwaiti Dinar</SelectItem>
                  <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>VAT Rate (%)</Label><Input type="number" min={0} max={25} value={vatRate.value} onChange={e => vatRate.setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>Invoice Prefix</Label><Input value={invoicePrefix.value} onChange={e => invoicePrefix.setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>Quotation Prefix</Label><Input value={quotePrefix.value} onChange={e => quotePrefix.setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>PO Prefix</Label><Input value={poPrefix.value} onChange={e => poPrefix.setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>Payment Terms (days)</Label><Input type="number" min={0} value={paymentTerms.value} onChange={e => paymentTerms.setValue(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Bank Details</CardTitle>
          <CardDescription>Bank details displayed on invoices and payment documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Bank Name</Label><Input value={bankName.value} onChange={e => bankName.setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>Account Number</Label><Input value={bankAccount.value} onChange={e => bankAccount.setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>IBAN</Label><Input value={bankIban.value} onChange={e => bankIban.setValue(e.target.value)} /></div>
            <div className="space-y-2"><Label>SWIFT Code</Label><Input value={bankSwift.value} onChange={e => bankSwift.setValue(e.target.value)} /></div>
          </div>
          <Button onClick={handleSave} size="sm" className="h-9" disabled={saving}>
            {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Finance Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── HR Settings Tab (Admin) ───
function HRSettingsTab() {
  const updateSetting = useUpdateSystemSetting();
  const workStart = useSettingField("work_start_time", "08:00");
  const workEnd = useSettingField("work_end_time", "17:00");
  const lateThreshold = useSettingField("late_threshold_min", "30");
  const workingDays = useSettingField("working_days_month", "26");
  const overtimeMultiplier = useSettingField("overtime_multiplier", "1.5");
  const annualLeave = useSettingField("annual_leave_days", "30");
  const sickLeave = useSettingField("sick_leave_days", "15");
  const probationDays = useSettingField("probation_period_days", "90");
  const autoClockOut = useSettingField("auto_clock_out", "false");
  const requireLeaveApproval = useSettingField("require_leave_approval", "true");

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "work_start_time", value: workStart.value }),
        updateSetting.mutateAsync({ key: "work_end_time", value: workEnd.value }),
        updateSetting.mutateAsync({ key: "late_threshold_min", value: lateThreshold.value }),
        updateSetting.mutateAsync({ key: "working_days_month", value: workingDays.value }),
        updateSetting.mutateAsync({ key: "overtime_multiplier", value: overtimeMultiplier.value }),
        updateSetting.mutateAsync({ key: "annual_leave_days", value: annualLeave.value }),
        updateSetting.mutateAsync({ key: "sick_leave_days", value: sickLeave.value }),
        updateSetting.mutateAsync({ key: "probation_period_days", value: probationDays.value }),
        updateSetting.mutateAsync({ key: "auto_clock_out", value: autoClockOut.value }),
        updateSetting.mutateAsync({ key: "require_leave_approval", value: requireLeaveApproval.value }),
      ]);
      await logAudit("Updated HR settings", "settings");
      toast.success("HR settings saved");
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> HR & Attendance Configuration</CardTitle>
        <CardDescription>Work hours, leave policies, overtime rules, and attendance settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label>Work Start Time</Label><Input type="time" value={workStart.value} onChange={e => workStart.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Work End Time</Label><Input type="time" value={workEnd.value} onChange={e => workEnd.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Late Threshold (min)</Label><Input type="number" min={0} value={lateThreshold.value} onChange={e => lateThreshold.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Working Days/Month</Label><Input type="number" min={1} max={31} value={workingDays.value} onChange={e => workingDays.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Overtime Multiplier</Label><Input type="number" step="0.1" min={1} value={overtimeMultiplier.value} onChange={e => overtimeMultiplier.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Probation Period (days)</Label><Input type="number" min={0} value={probationDays.value} onChange={e => probationDays.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Annual Leave (days/year)</Label><Input type="number" min={0} value={annualLeave.value} onChange={e => annualLeave.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Sick Leave (days/year)</Label><Input type="number" min={0} value={sickLeave.value} onChange={e => sickLeave.setValue(e.target.value)} /></div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Require Leave Approval</p><p className="text-xs text-muted-foreground">Manager/admin must approve leave requests</p></div>
            <Switch checked={requireLeaveApproval.value === "true"} onCheckedChange={v => requireLeaveApproval.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Auto Clock-Out</p><p className="text-xs text-muted-foreground">Automatically clock out at work end time</p></div>
            <Switch checked={autoClockOut.value === "true"} onCheckedChange={v => autoClockOut.setValue(v ? "true" : "false")} />
          </div>
        </div>
        <Button onClick={handleSave} size="sm" className="h-9" disabled={saving}>
          {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save HR Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Operations Settings Tab (Admin) ───
function OperationsSettingsTab() {
  const updateSetting = useUpdateSystemSetting();
  const hseEnabled = useSettingField("hse_reporting_enabled", "true");
  const gatePassExpiry = useSettingField("gate_pass_default_days", "30");
  const maintenanceAlert = useSettingField("maintenance_alert_days", "7");
  const vehicleInspection = useSettingField("vehicle_inspection_days", "30");
  const warehouseMinStock = useSettingField("warehouse_min_stock_alert", "true");
  const reqApprovalChain = useSettingField("requisition_approval_chain", "true");

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "hse_reporting_enabled", value: hseEnabled.value }),
        updateSetting.mutateAsync({ key: "gate_pass_default_days", value: gatePassExpiry.value }),
        updateSetting.mutateAsync({ key: "maintenance_alert_days", value: maintenanceAlert.value }),
        updateSetting.mutateAsync({ key: "vehicle_inspection_days", value: vehicleInspection.value }),
        updateSetting.mutateAsync({ key: "warehouse_min_stock_alert", value: warehouseMinStock.value }),
        updateSetting.mutateAsync({ key: "requisition_approval_chain", value: reqApprovalChain.value }),
      ]);
      await logAudit("Updated operations settings", "settings");
      toast.success("Operations settings saved");
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Operations & Safety</CardTitle>
        <CardDescription>Gate pass policies, maintenance alerts, HSE, warehouse, and transport settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Gate Pass Default Validity (days)</Label><Input type="number" min={1} value={gatePassExpiry.value} onChange={e => gatePassExpiry.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Maintenance Alert (days before due)</Label><Input type="number" min={1} value={maintenanceAlert.value} onChange={e => maintenanceAlert.setValue(e.target.value)} /></div>
          <div className="space-y-2"><Label>Vehicle Inspection Interval (days)</Label><Input type="number" min={1} value={vehicleInspection.value} onChange={e => vehicleInspection.setValue(e.target.value)} /></div>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">HSE Incident Reporting</p><p className="text-xs text-muted-foreground">Enable mandatory HSE incident reporting</p></div>
            <Switch checked={hseEnabled.value === "true"} onCheckedChange={v => hseEnabled.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Low Stock Alerts</p><p className="text-xs text-muted-foreground">Notify when warehouse items fall below minimum</p></div>
            <Switch checked={warehouseMinStock.value === "true"} onCheckedChange={v => warehouseMinStock.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Requisition Approval Chain</p><p className="text-xs text-muted-foreground">Require manager approval for all requisitions</p></div>
            <Switch checked={reqApprovalChain.value === "true"} onCheckedChange={v => reqApprovalChain.setValue(v ? "true" : "false")} />
          </div>
        </div>
        <Button onClick={handleSave} size="sm" className="h-9" disabled={saving}>
          {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Operations Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Notification Settings Tab (Admin) ───
function NotificationSettingsTab() {
  const updateSetting = useUpdateSystemSetting();
  const emailNotifs = useSettingField("email_notifications", "true");
  const leaveNotifs = useSettingField("notify_leave_requests", "true");
  const expenseNotifs = useSettingField("notify_expense_approvals", "true");
  const expiryNotifs = useSettingField("notify_document_expiry", "true");
  const hseNotifs = useSettingField("notify_hse_incidents", "true");
  const maintenanceNotifs = useSettingField("notify_maintenance_due", "true");
  const retentionDays = useSettingField("notification_retention_days", "30");

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "email_notifications", value: emailNotifs.value }),
        updateSetting.mutateAsync({ key: "notify_leave_requests", value: leaveNotifs.value }),
        updateSetting.mutateAsync({ key: "notify_expense_approvals", value: expenseNotifs.value }),
        updateSetting.mutateAsync({ key: "notify_document_expiry", value: expiryNotifs.value }),
        updateSetting.mutateAsync({ key: "notify_hse_incidents", value: hseNotifs.value }),
        updateSetting.mutateAsync({ key: "notify_maintenance_due", value: maintenanceNotifs.value }),
        updateSetting.mutateAsync({ key: "notification_retention_days", value: retentionDays.value }),
      ]);
      await logAudit("Updated notification settings", "settings");
      toast.success("Notification settings saved");
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Preferences</CardTitle>
        <CardDescription>Configure what notifications are sent across the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Email Notifications</p><p className="text-xs text-muted-foreground">Send email alerts for approvals and critical events</p></div>
            <Switch checked={emailNotifs.value === "true"} onCheckedChange={v => emailNotifs.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Leave Request Alerts</p><p className="text-xs text-muted-foreground">Notify managers when leave requests are submitted</p></div>
            <Switch checked={leaveNotifs.value === "true"} onCheckedChange={v => leaveNotifs.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Expense Approval Alerts</p><p className="text-xs text-muted-foreground">Notify when expense claims need approval</p></div>
            <Switch checked={expenseNotifs.value === "true"} onCheckedChange={v => expenseNotifs.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Document Expiry Alerts</p><p className="text-xs text-muted-foreground">Alert when visas, licenses, or contracts are expiring</p></div>
            <Switch checked={expiryNotifs.value === "true"} onCheckedChange={v => expiryNotifs.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">HSE Incident Alerts</p><p className="text-xs text-muted-foreground">Immediate notification for safety incidents</p></div>
            <Switch checked={hseNotifs.value === "true"} onCheckedChange={v => hseNotifs.setValue(v ? "true" : "false")} />
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-sm">Maintenance Due Alerts</p><p className="text-xs text-muted-foreground">Notify when scheduled maintenance is upcoming</p></div>
            <Switch checked={maintenanceNotifs.value === "true"} onCheckedChange={v => maintenanceNotifs.setValue(v ? "true" : "false")} />
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Notification Retention (days)</Label><Input type="number" min={7} max={365} value={retentionDays.value} onChange={e => retentionDays.setValue(e.target.value)} /></div>
        </div>
        <Button onClick={handleSave} size="sm" className="h-9" disabled={saving}>
          {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Notification Settings
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Security Settings Tab ───
function SecuritySettingsTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const updateSetting = useUpdateSystemSetting();
  const idleTimeout = useSettingField("idle_timeout_min", "30");
  const maxLoginAttempts = useSettingField("max_login_attempts", "5");
  const enforceStrongPw = useSettingField("enforce_strong_password", "true");
  const sessionLogging = useSettingField("session_activity_logging", "true");

  const [saving, setSaving] = useState(false);

  const updatePassword = async () => {
    if (!isPasswordStrong(newPassword)) { toast.error("Password does not meet strength requirements"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); await logAudit("Changed password", "security"); }
  };

  const handleSaveSecuritySettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "idle_timeout_min", value: idleTimeout.value }),
        updateSetting.mutateAsync({ key: "max_login_attempts", value: maxLoginAttempts.value }),
        updateSetting.mutateAsync({ key: "enforce_strong_password", value: enforceStrongPw.value }),
        updateSetting.mutateAsync({ key: "session_activity_logging", value: sessionLogging.value }),
      ]);
      await logAudit("Updated security settings", "security");
      toast.success("Security settings saved");
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  // Recent audit logs
  const { data: recentLogs } = useQuery({
    queryKey: ["recent-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 chars, upper, number, special" />
            <PasswordStrengthMeter password={newPassword} />
          </div>
          <Button onClick={updatePassword} size="sm" className="h-9" disabled={!isPasswordStrong(newPassword)}>Update Password</Button>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Security Policies</CardTitle>
              <CardDescription>System-wide security configuration. These affect all users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Idle Session Timeout (minutes)</Label><Input type="number" min={5} max={120} value={idleTimeout.value} onChange={e => idleTimeout.setValue(e.target.value)} /></div>
                <div className="space-y-2"><Label>Max Login Attempts</Label><Input type="number" min={3} max={10} value={maxLoginAttempts.value} onChange={e => maxLoginAttempts.setValue(e.target.value)} /></div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-sm">Enforce Strong Passwords</p><p className="text-xs text-muted-foreground">Require uppercase, number, special char, 8+ chars</p></div>
                  <Switch checked={enforceStrongPw.value === "true"} onCheckedChange={v => enforceStrongPw.setValue(v ? "true" : "false")} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-sm">Session Activity Logging</p><p className="text-xs text-muted-foreground">Log all user sessions and actions in audit trail</p></div>
                  <Switch checked={sessionLogging.value === "true"} onCheckedChange={v => sessionLogging.setValue(v ? "true" : "false")} />
                </div>
              </div>
              <Button onClick={handleSaveSecuritySettings} size="sm" className="h-9" disabled={saving}>
                {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Security Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Audit Activity</CardTitle>
              <CardDescription>Last 10 actions recorded in the system audit log.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentLogs ?? []).map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">{log.action}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{log.module ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.details ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!recentLogs || recentLogs.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No audit logs found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Main Settings Page ───
export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: currentRole } = useUserRole();
  const isAdmin = currentRole === "admin";
  const isManagerUp = currentRole === "admin" || currentRole === "manager";
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [profileName, setProfileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const { data: companyLogoUrl } = useSystemSetting("company_logo_url");
  const updateSetting = useUpdateSystemSetting();

  const validateFile = (file: File, maxMB = 5) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) { toast.error("Only JPG, PNG, WebP or SVG files allowed"); return false; }
    if (file.size > maxMB * 1024 * 1024) { toast.error(`File must be under ${maxMB}MB`); return false; }
    return true;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!validateFile(file, 2)) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `company/logo_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      await updateSetting.mutateAsync({ key: "company_logo_url", value: urlData.publicUrl });
      logAudit("Updated company logo", "settings");
      toast.success("Company logo updated");
    } catch (err: any) { toast.error(err.message || "Upload failed"); } finally { setLogoUploading(false); }
  };

  const handleRemoveLogo = async () => {
    await updateSetting.mutateAsync({ key: "company_logo_url", value: null });
    logAudit("Removed company logo", "settings");
    toast.success("Logo removed");
  };

  // Role management
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("staff");

  const nameValue = profileName || profile?.name || "";
  const avatarUrl = profile?.avatar_url;
  const initials = (nameValue || user?.email || "U").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!validateFile(file, 2)) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Avatar updated");
    } catch (err: any) { toast.error(err.message); }
    setUploading(false);
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("profiles").update({ name: nameValue }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profile updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Admin: members & roles
  const { data: allProfiles } = useQuery({ queryKey: ["all-profiles"], queryFn: async () => { const { data } = await supabase.from("profiles").select("*").order("created_at"); return data ?? []; }, enabled: isAdmin });
  const { data: allRoles } = useQuery({ queryKey: ["all-user-roles"], queryFn: async () => { const { data } = await supabase.from("user_roles").select("*"); return data ?? []; }, enabled: isAdmin });
  const getRoleForUser = (userId: string) => allRoles?.find(r => r.user_id === userId)?.role ?? "staff";

  const updateUserRole = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      const { error } = await supabase.rpc("admin_update_user_role", { _target_user_id: selectedUser.user_id, _new_role: selectedRole as "admin" | "manager" | "staff" });
      if (error) throw error;
      await logAudit("Changed user role", `${selectedUser.name ?? selectedUser.user_id} → ${selectedRole}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-user-roles"] }); toast.success("Role updated"); setRoleDialogOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Manage your profile, company configuration, security, and system-wide settings</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs"><Palette className="h-3.5 w-3.5" /> Theme</TabsTrigger>
          {isManagerUp && <TabsTrigger value="company" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Company</TabsTrigger>}
          {isAdmin && <TabsTrigger value="finance" className="gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" /> Finance</TabsTrigger>}
          {isAdmin && <TabsTrigger value="hr" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" /> HR</TabsTrigger>}
          {isAdmin && <TabsTrigger value="operations" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" /> Operations</TabsTrigger>}
          {isAdmin && <TabsTrigger value="notifications" className="gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>}
          {isAdmin && <TabsTrigger value="access" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="branding" className="gap-1.5 text-xs"><Globe className="h-3.5 w-3.5" /> Branding</TabsTrigger>}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <input type="file" ref={fileRef} onChange={handleAvatarUpload} accept="image/jpeg,image/png,image/webp" className="hidden" />
                  <Button variant="outline" size="sm" className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full p-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  </Button>
                </div>
                <div>
                  <p className="font-medium">{nameValue || "Set your name"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 capitalize">{currentRole ?? "staff"}</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
                <div className="space-y-2"><Label>Display Name</Label><Input value={nameValue} onChange={e => setProfileName(e.target.value)} placeholder="Your name" /></div>
              </div>
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} size="sm" className="h-9">
                {updateProfile.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-4">
          <SecuritySettingsTab isAdmin={isAdmin} />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Appearance</CardTitle><CardDescription>Customize the look and feel</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-muted-foreground">Toggle dark theme</p></div>
                <Switch checked={theme === "dark"} onCheckedChange={checked => setTheme(checked ? "dark" : "light")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        {isManagerUp && <TabsContent value="company" className="space-y-4 mt-4"><CompanySettingsTab /></TabsContent>}

        {/* Finance Tab */}
        {isAdmin && <TabsContent value="finance" className="mt-4"><FinanceSettingsTab /></TabsContent>}

        {/* HR Tab */}
        {isAdmin && <TabsContent value="hr" className="mt-4"><HRSettingsTab /></TabsContent>}

        {/* Operations Tab */}
        {isAdmin && <TabsContent value="operations" className="mt-4"><OperationsSettingsTab /></TabsContent>}

        {/* Notifications Tab */}
        {isAdmin && <TabsContent value="notifications" className="mt-4"><NotificationSettingsTab /></TabsContent>}

        {/* User Access Tab */}
        {isAdmin && (
          <TabsContent value="access" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Access Control</CardTitle>
                <CardDescription>Manage user roles and permissions. Only administrators can modify these settings.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allProfiles ?? []).map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-7 w-7">
                              {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{(p.name ?? "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{p.name ?? "Unnamed"}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{getRoleForUser(p.user_id)}</Badge></TableCell>
                        <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"} className={p.status === "active" ? "bg-success/15 text-success border-0" : "border-0"}>{p.status ?? "active"}</Badge></TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedUser(p); setSelectedRole(getRoleForUser(p.user_id)); setRoleDialogOpen(true); }}>Change Role</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Change User Role</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">Changing role for: <strong>{selectedUser?.name ?? "User"}</strong></p>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin — Full system access</SelectItem>
                        <SelectItem value="manager">Manager — Manage teams & approve</SelectItem>
                        <SelectItem value="staff">Staff — Standard access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full h-9" onClick={() => updateUserRole.mutate()} disabled={updateUserRole.isPending}>
                    {updateUserRole.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Update Role
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* Branding Tab */}
        {isAdmin && (
          <TabsContent value="branding" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Company Branding</CardTitle>
                <CardDescription>Upload your company logo. It will appear in the sidebar, login page, and printed documents.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {companyLogoUrl ? <img src={companyLogoUrl} alt="Company Logo" className="h-full w-full object-contain" /> : <Building2 className="h-8 w-8 text-muted-foreground" />}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Company Logo</p>
                    <p className="text-xs text-muted-foreground">Recommended: Square image, at least 256×256px. PNG or JPG, max 2MB.</p>
                    <div className="flex gap-2">
                      <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                      <Button size="sm" className="h-9" variant="outline" onClick={() => logoRef.current?.click()} disabled={logoUploading}>
                        {logoUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                        {companyLogoUrl ? "Change Logo" : "Upload Logo"}
                      </Button>
                      {companyLogoUrl && <Button size="sm" className="h-9" variant="destructive" onClick={handleRemoveLogo}>Remove</Button>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
