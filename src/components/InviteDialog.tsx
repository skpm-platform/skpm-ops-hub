import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus, Mail, MessageCircle, Copy, Link, Send, ShieldCheck, Shield, Lock,
  CheckCircle2, Building2, Loader2, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_INFO = {
  admin: {
    label: "Admin",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: ShieldCheck,
    iconColor: "text-red-500",
    perms: ["Full system access", "User & member management", "Audit logs & settings", "All financial data", "System configuration"],
  },
  manager: {
    label: "Manager",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Shield,
    iconColor: "text-blue-500",
    perms: ["Operations management", "Team approvals", "Finance & payroll view", "Reports & analytics", "Project oversight"],
  },
  staff: {
    label: "Staff",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Lock,
    iconColor: "text-gray-500",
    perms: ["Daily operations", "Task & timesheet entry", "Leave & attendance", "Help desk & requests", "Personal profile"],
  },
};

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<"form" | "share">("form");
  const [form, setForm] = useState({ email: "", role: "staff", name: "", message: "" });
  const [copied, setCopied] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<any>(null);

  const roleInfo = ROLE_INFO[form.role as keyof typeof ROLE_INFO] || ROLE_INFO.staff;
  const RoleIcon = roleInfo.icon;

  const previewUrl = `${window.location.origin}/accept-invite`;
  const inviteToken = createdInvite?.token || "";
  const signupUrl = inviteToken
    ? `${window.location.origin}/accept-invite?token=${inviteToken}`
    : previewUrl;

  // WhatsApp formatted message
  const getWhatsAppMessage = () => {
    const name = form.name ? `Hi ${form.name},` : "Hi there,";
    return encodeURIComponent(
`${name}

You've been invited to join *SKPM Ops Hub* as a *${roleInfo.label}*! 🎉

SKPM Ops Hub is our all-in-one operations management platform for managing HR, projects, finance, logistics, and more.

*Your Access:*
${roleInfo.perms.map(p => `✅ ${p}`).join("\n")}

*Get Started:*
👉 ${signupUrl}
📧 Use this email: ${form.email}

${form.message ? `*Message from your admin:*\n"${form.message}"\n\n` : ""}Need help? Reply to this message.

— SKPM Operations Team`
    );
  };

  // Email mailto formatted message
  const getEmailSubject = () =>
    encodeURIComponent(`You're invited to join SKPM Ops Hub as ${roleInfo.label}`);

  const getEmailBody = () =>
    encodeURIComponent(
`${form.name ? `Hi ${form.name},` : "Hi there,"}

You've been invited to join SKPM Ops Hub as a ${roleInfo.label}.

SKPM Ops Hub is our all-in-one operations management platform.

YOUR ACCESS INCLUDES:
${roleInfo.perms.map(p => `  ✓ ${p}`).join("\n")}

HOW TO GET STARTED:
1. Visit: ${signupUrl}
2. Sign up using: ${form.email}
3. Use your role: ${roleInfo.label}

${form.message ? `MESSAGE FROM YOUR ADMIN:\n"${form.message}"\n\n` : ""}If you have any questions, please contact your system administrator.

Best regards,
SKPM Operations Team
Powered by SKPM Ops Hub`
    );

  const createInvite = useMutation({
    mutationFn: async () => {
      if (!form.email) throw new Error("Email is required");
      const { data: existing } = await supabase
        .from("invitations")
        .select("id")
        .eq("email", form.email)
        .eq("status", "pending")
        .maybeSingle();
      if (existing) throw new Error("Invitation already pending for this email");

      const { data, error } = await supabase
        .from("invitations")
        .insert({ email: form.email, role: form.role, invited_by: user?.id })
        .select()
        .single();
      if (error) throw error;

      // Try Supabase inviteUserByEmail (admin only) - graceful fallback
      try {
        await (supabase.auth as any).admin?.inviteUserByEmail(form.email);
      } catch (_) { /* fallback - invitation recorded in DB */ }

      await logAudit("Sent invitation", `Invited ${form.email} as ${form.role}`, "members");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      setCreatedInvite(data);
      setStep("share");
      toast.success("Invitation created! Now share it below 👇");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite link copied!");
  };

  const handleCopyFullMessage = () => {
    const text = decodeURIComponent(getWhatsAppMessage());
    navigator.clipboard.writeText(text);
    toast.success("Full message copied!");
  };

  const handleClose = () => {
    setStep("form");
    setForm({ email: "", role: "staff", name: "", message: "" });
    setCreatedInvite(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {step === "form" ? "Invite New Member" : "Share Invitation"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Add a new team member to SKPM Ops Hub"
              : `Invitation ready for ${form.email} — choose how to share it`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Form */}
        {step === "form" && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="user@company.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Full Name (optional)</Label>
                <Input
                  placeholder="John Smith"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
                        Admin — Full access
                      </div>
                    </SelectItem>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        Manager — Operations
                      </div>
                    </SelectItem>
                    <SelectItem value="staff">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-gray-500" />
                        Staff — Standard
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Personal Message (optional)</Label>
                <Textarea
                  placeholder="Add a personal note to your invitation..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Role Preview Card */}
            <div className={`rounded-xl border-2 p-4 ${form.role === "admin" ? "border-red-200 bg-red-50/50 dark:bg-red-950/10" : form.role === "manager" ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/10" : "border-gray-200 bg-gray-50/50 dark:bg-gray-900/20"}`}>
              <div className="flex items-center gap-2 mb-3">
                <RoleIcon className={`h-4 w-4 ${roleInfo.iconColor}`} />
                <span className="font-semibold text-sm">{roleInfo.label} Access</span>
                <Badge className={`${roleInfo.color} border text-xs ml-auto`}>{roleInfo.label}</Badge>
              </div>
              <div className="space-y-1">
                {roleInfo.perms.map((perm, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                    {perm}
                  </div>
                ))}
              </div>
            </div>

            {/* Invitation Preview */}
            <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/10 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-white/80" />
                <span className="text-white font-semibold text-sm">SKPM Ops Hub</span>
                <span className="text-blue-200 text-xs ml-auto">Invitation Preview</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {form.name ? `Hi ${form.name},` : "Hi there,"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You've been invited to join <strong>SKPM Ops Hub</strong> as{" "}
                    <strong className={form.role === "admin" ? "text-red-600" : form.role === "manager" ? "text-blue-600" : "text-gray-600"}>
                      {roleInfo.label}
                    </strong>
                  </p>
                </div>
                {form.message && (
                  <div className="bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2 border-l-2 border-blue-400">
                    <p className="text-xs italic text-muted-foreground">"{form.message}"</p>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-medium w-fit">
                  <ExternalLink className="h-3 w-3" />
                  Get Started → {previewUrl}
                </div>
                <p className="text-xs text-muted-foreground">Sign up using: <strong>{form.email || "email@company.com"}</strong></p>
              </div>
            </div>

            <Button
              className="w-full h-10"
              onClick={() => createInvite.mutate()}
              disabled={!form.email || createInvite.isPending}
            >
              {createInvite.isPending
                ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Creating Invitation...</>
                : <><Send className="h-4 w-4 mr-2" /> Create Invitation & Get Share Options</>
              }
            </Button>
          </div>
        )}

        {/* Step 2: Share */}
        {step === "share" && (
          <div className="space-y-4 pt-2">
            {/* Success Banner */}
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Invitation Created!</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Now share it with <strong>{form.email}</strong> via WhatsApp or Email
                </p>
              </div>
            </div>

            {/* Invitation Card Preview */}
            <div className="rounded-xl border-2 border-dashed border-muted overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 text-white/80" />
                  <span className="text-white font-bold text-base">SKPM Ops Hub</span>
                </div>
                <p className="text-blue-200 text-xs">Operations Management Platform</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">You're Invited</p>
                    <p className="font-bold text-lg text-foreground">{form.name || form.email}</p>
                    <p className="text-xs text-muted-foreground">{form.name ? form.email : ""}</p>
                  </div>
                  <Badge className={`${roleInfo.color} border text-sm px-3 py-1`}>
                    <RoleIcon className={`h-3.5 w-3.5 mr-1.5 ${roleInfo.iconColor}`} />
                    {roleInfo.label}
                  </Badge>
                </div>
                {form.message && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2 border-l-2 border-blue-400">
                    <p className="text-xs text-blue-800 dark:text-blue-300 italic">"{form.message}"</p>
                  </div>
                )}
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Access Includes:</p>
                  {roleInfo.perms.map((perm, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Sign up at:</p>
                  <p className="text-xs font-mono font-medium text-blue-600 break-all">{signupUrl}</p>
                  <p className="text-xs text-muted-foreground mt-1">Use email: <strong>{form.email}</strong></p>
                </div>
              </div>
            </div>

            {/* Sharing Tabs */}
            <Tabs defaultValue="whatsapp">
              <TabsList className="w-full">
                <TabsTrigger value="whatsapp" className="flex-1 gap-1.5">
                  <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
                </TabsTrigger>
                <TabsTrigger value="email" className="flex-1 gap-1.5">
                  <Mail className="h-4 w-4 text-blue-600" /> Email
                </TabsTrigger>
                <TabsTrigger value="link" className="flex-1 gap-1.5">
                  <Link className="h-4 w-4 text-purple-600" /> Link
                </TabsTrigger>
              </TabsList>

              {/* WhatsApp Tab */}
              <TabsContent value="whatsapp" className="space-y-3 pt-2">
                <div className="bg-[#dcf8c6] dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-800 dark:text-green-300">WhatsApp Message Preview</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Ready to send</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-xs space-y-1.5 font-mono shadow-sm">
                    <p className="font-semibold">{form.name ? `Hi ${form.name},` : "Hi there,"}</p>
                    <p className="text-muted-foreground">You've been invited to join <strong>SKPM Ops Hub</strong> as a <strong>{roleInfo.label}</strong>! 🎉</p>
                    <div className="pt-1">
                      {roleInfo.perms.slice(0, 3).map((p, i) => (
                        <p key={i} className="text-muted-foreground">✅ {p}</p>
                      ))}
                      {roleInfo.perms.length > 3 && <p className="text-muted-foreground">✅ + {roleInfo.perms.length - 3} more...</p>}
                    </div>
                    {form.message && <p className="italic text-muted-foreground pt-1">"{form.message}"</p>}
                    <p className="font-semibold pt-1">👉 {signupUrl}</p>
                    <p className="text-muted-foreground">📧 {form.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white"
                    onClick={() => window.open(`https://wa.me/?text=${getWhatsAppMessage()}`, "_blank")}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" /> Open WhatsApp
                  </Button>
                  <Button variant="outline" onClick={handleCopyFullMessage}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
              </TabsContent>

              {/* Email Tab */}
              <TabsContent value="email" className="space-y-3 pt-2">
                <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Email Preview</p>
                      <p className="text-xs text-blue-600">To: {form.email}</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm text-xs">
                    <div className="bg-blue-600 px-3 py-2 text-white font-semibold">
                      You're invited to join SKPM Ops Hub as {roleInfo.label}
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="font-semibold">{form.name ? `Hi ${form.name},` : "Hi there,"}</p>
                      <p className="text-muted-foreground">You've been invited to join <strong>SKPM Ops Hub</strong> as a <strong>{roleInfo.label}</strong>.</p>
                      {form.message && <p className="italic text-muted-foreground bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded border-l-2 border-blue-400">"{form.message}"</p>}
                      <div className="font-medium">Your Access:</div>
                      {roleInfo.perms.map((p, i) => <p key={i} className="text-muted-foreground">  ✓ {p}</p>)}
                      <div className="bg-blue-600 text-white rounded px-3 py-1.5 text-center mt-2">
                        Get Started → {signupUrl}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => window.open(`mailto:${form.email}?subject=${getEmailSubject()}&body=${getEmailBody()}`, "_blank")}
                  >
                    <Mail className="h-4 w-4 mr-2" /> Open Email App
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${decodeURIComponent(getEmailSubject())}\n\n${decodeURIComponent(getEmailBody())}`);
                      toast.success("Email content copied!");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
              </TabsContent>

              {/* Link Tab */}
              <TabsContent value="link" className="space-y-3 pt-2">
                <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <Link className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-800 dark:text-purple-300">Shareable Signup Link</p>
                      <p className="text-xs text-purple-600">Share this link directly</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 py-2.5 border">
                    <code className="text-xs font-mono text-foreground flex-1 break-all">{signupUrl}</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    🔒 This link is unique and locked to <strong>{form.email}</strong> — only they can use it
                  </p>
                </div>
                <Button
                  className={`w-full ${copied ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={handleCopyLink}
                >
                  {copied
                    ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Copied!</>
                    : <><Copy className="h-4 w-4 mr-2" /> Copy Invite Link</>
                  }
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Done
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => { setStep("form"); setForm({ email: "", role: "staff", name: "", message: "" }); }}>
                <UserPlus className="h-4 w-4 mr-2" /> Invite Another
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
