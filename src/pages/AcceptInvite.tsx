import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ShieldCheck, Shield, Lock, CheckCircle2,
  Eye, EyeOff, Loader2, AlertTriangle, XCircle, PartyPopper, KeyRound
} from "lucide-react";
import { toast } from "sonner";

const ROLE_INFO: Record<string, { label: string; color: string; iconColor: string; perms: string[] }> = {
  admin: {
    label: "Admin",
    color: "bg-red-100 text-red-700 border-red-200",
    iconColor: "text-red-500",
    perms: ["Full system access", "User & member management", "Audit logs & settings", "All financial data", "System configuration"],
  },
  manager: {
    label: "Manager",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    iconColor: "text-blue-500",
    perms: ["Operations management", "Team approvals", "Finance & payroll view", "Reports & analytics", "Project oversight"],
  },
  staff: {
    label: "Staff",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    iconColor: "text-gray-500",
    perms: ["Daily operations", "Task & timesheet entry", "Leave & attendance", "Help desk & requests", "Personal profile"],
  },
};

type PageState = "loading" | "invalid" | "expired" | "already_used" | "form" | "success";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<{ email: string; role: string; id: string; token: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      return;
    }
    loadInvite();
  }, [token]);

  async function loadInvite() {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, email, role, token, status, expires_at")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) {
        setPageState("invalid");
        return;
      }
      if (data.status === "accepted") {
        setPageState("already_used");
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        setPageState("expired");
        return;
      }
      if (data.status !== "pending") {
        setPageState("invalid");
        return;
      }
      setInvite(data);
      setPageState("form");
    } catch {
      setPageState("invalid");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      // Sign up the user with their email (locked) and chosen password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            invited: true,
            role: invite.role,
            invite_token: token,
          },
        },
      });

      if (signUpError) {
        // Handle already registered
        if (signUpError.message.includes("already registered") || signUpError.message.includes("already been registered")) {
          toast.error("This email is already registered. Please log in instead.");
          setTimeout(() => navigate("/login"), 2000);
          return;
        }
        throw signUpError;
      }

      const userId = authData.user?.id;
      if (!userId) throw new Error("User creation failed");

      // Accept invitation via secure DB function (assigns role, marks invite accepted)
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc("accept_invitation", {
          p_token: token,
          p_user_id: userId,
        });

      if (acceptError) {
        console.error("Accept invitation error:", acceptError);
        // Still proceed - the user was created, we'll handle role assignment later
      }

      // If signUp auto-signs in (email confirm disabled), sign out so they do a proper login
      await supabase.auth.signOut();

      setWelcomeData({ email: invite.email, role: invite.role });
      setPageState("success");
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  const roleInfo = ROLE_INFO[invite?.role || "staff"] || ROLE_INFO.staff;

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][strength];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">SKPM Ops Hub</span>
          </div>
          <p className="text-slate-500 text-sm">Operations Management Platform</p>
        </div>

        {/* Loading */}
        {pageState === "loading" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-slate-600">Verifying your invitation...</p>
          </div>
        )}

        {/* Invalid Token */}
        {pageState === "invalid" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Invitation</h2>
            <p className="text-slate-500 text-sm mb-6">
              This invitation link is invalid or does not exist. Please contact your administrator for a new invite.
            </p>
            <Button onClick={() => navigate("/login")} variant="outline" className="w-full">
              Go to Login
            </Button>
          </div>
        )}

        {/* Expired */}
        {pageState === "expired" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Invitation Expired</h2>
            <p className="text-slate-500 text-sm mb-6">
              This invitation link has expired (invitations are valid for 7 days). Please ask your administrator to send a new invitation.
            </p>
            <Button onClick={() => navigate("/login")} variant="outline" className="w-full">
              Go to Login
            </Button>
          </div>
        )}

        {/* Already Used */}
        {pageState === "already_used" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Already Accepted</h2>
            <p className="text-slate-500 text-sm mb-6">
              This invitation has already been used to create an account. Please log in with your credentials.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Go to Login
            </Button>
          </div>
        )}

        {/* Form */}
        {pageState === "form" && invite && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-white font-bold text-lg">You're Invited! 🎉</h2>
                <Badge className={`${roleInfo.color} border text-xs`}>{roleInfo.label}</Badge>
              </div>
              <p className="text-blue-200 text-sm">Set up your account to get started</p>
            </div>

            <div className="p-6">
              {/* Access Preview */}
              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Access Includes:</p>
                <div className="space-y-1.5">
                  {roleInfo.perms.map((perm, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {perm}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email - Locked */}
                <div>
                  <Label className="text-sm font-medium">Email Address</Label>
                  <div className="relative mt-1">
                    <Input
                      type="email"
                      value={invite.email}
                      readOnly
                      className="bg-slate-50 text-slate-600 cursor-not-allowed pr-10"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">This email was set by your administrator and cannot be changed</p>
                </div>

                {/* Password */}
                <div>
                  <Label className="text-sm font-medium">Create Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-slate-200"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">Strength: <span className={strength >= 3 ? "text-green-600 font-medium" : strength === 2 ? "text-blue-600" : "text-red-500"}>{strengthLabel}</span></p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <Label className="text-sm font-medium">Confirm Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className={`pr-10 ${confirmPassword && password !== confirmPassword ? "border-red-400 focus-visible:ring-red-300" : confirmPassword && password === confirmPassword ? "border-green-400" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Passwords match</p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-700 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 flex-shrink-0" />
                    Choose a strong password — you can change it anytime after logging in
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={submitting || !password || !confirmPassword}
                >
                  {submitting
                    ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Creating Your Account...</>
                    : <><CheckCircle2 className="mr-2 h-4 w-4" /> Create Account & Join SKPM Ops Hub</>
                  }
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Success / Welcome Screen */}
        {pageState === "success" && welcomeData && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-6 text-center">
              <PartyPopper className="h-12 w-12 text-white mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white">Welcome to SKPM Ops Hub!</h2>
              <p className="text-green-100 text-sm mt-1">Your account has been created successfully 🎉</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Account Details */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 mb-3">📋 Your Account Details:</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium text-slate-800">{welcomeData.email}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Role</span>
                  <Badge className={`${ROLE_INFO[welcomeData.role]?.color || ""} border`}>
                    {ROLE_INFO[welcomeData.role]?.label || welcomeData.role}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Platform</span>
                  <span className="font-medium text-slate-800">SKPM Ops Hub</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Password</span>
                  <span className="text-slate-400 italic text-xs">Set by you (keep it safe!)</span>
                </div>
              </div>

              {/* Access */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">🔑 Your Access Includes:</p>
                <div className="space-y-1.5">
                  {(ROLE_INFO[welcomeData.role]?.perms || []).map((perm, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {perm}
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">✅ Next Steps:</p>
                <ol className="space-y-1.5 text-xs text-blue-700">
                  <li>1. Click <strong>"Go to Login"</strong> below</li>
                  <li>2. Enter your email: <strong>{welcomeData.email}</strong></li>
                  <li>3. Enter the password you just created</li>
                  <li>4. You're in! Explore your dashboard 🚀</li>
                </ol>
              </div>

              <Button
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate("/login")}
              >
                Go to Login →
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-4">
          SKPM Ops Hub · Secure Invitation System
        </p>
      </div>
    </div>
  );
}
