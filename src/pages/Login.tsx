import { checkLoginRateLimit, recordLoginAttempt, getRemainingAttempts } from "@/lib/rate-limit";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Lock, Mail, ArrowRight, Shield,
  Zap, BarChart3, Users, Building2, TrendingUp,
  CheckCircle2, Globe, Sparkles, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import skpmLogo from "@/assets/skpm-logo.png";
import { useSystemSetting } from "@/hooks/use-system-settings";
import { loginSchema } from "@/lib/validations";

/* ── Floating decorative card (mimics a mini dashboard widget) ── */
function FloatingCard({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute rounded-2xl border border-white/[0.09] bg-white/[0.05] backdrop-blur-md p-3.5 shadow-xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* ── Stat pill used in FloatingCards ── */
function StatPill({ icon: Icon, value, label, color }: {
  icon: React.ComponentType<any>;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[15px] font-bold text-white leading-none">{value}</p>
        <p className="text-[10px] text-white/45 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: companyLogoUrl } = useSystemSetting("company_logo_url");
  const logoSrc = companyLogoUrl || skpmLogo;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const rateCheck = checkLoginRateLimit();
    if (!rateCheck.allowed) {
      toast.error(`Too many attempts. Try again in ${rateCheck.remainingSeconds}s`);
      return;
    }
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });
    if (error) {
      recordLoginAttempt(false);
      const remaining = getRemainingAttempts();
      if (remaining > 0 && remaining <= 3) {
        toast.error(`${error.message}. ${remaining} attempts remaining.`);
      } else {
        toast.error(error.message);
      }
    } else {
      recordLoginAttempt(true);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const emailCheck = loginSchema.shape.email.safeParse(email);
    if (!emailCheck.success) {
      setErrors({ email: emailCheck.error.errors[0]?.message || "Invalid email" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      recordLoginAttempt(false);
      toast.error(error.message);
    } else {
      recordLoginAttempt(true);
      toast.success("Reset link sent — check your email!");
    }
    setLoading(false);
  };

  const features = [
    { icon: Zap,      label: "Real-time Operations",    color: "bg-amber-400/20 text-amber-300" },
    { icon: Shield,   label: "Enterprise Security",      color: "bg-emerald-400/20 text-emerald-300" },
    { icon: BarChart3,label: "Smart Analytics",          color: "bg-violet-400/20 text-violet-300" },
    { icon: Users,    label: "HR & Workforce",           color: "bg-blue-400/20 text-blue-300" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden" style={{ background: "#050610" }}>

      {/* ══════════════════════════════════════════════════
          LEFT — Immersive Brand Panel
          ══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[54%] xl:w-[56%] relative overflow-hidden flex-col">

        {/* ── Background layers ── */}
        <div className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #0c0618 0%, #0a0520 35%, #080416 70%, #050310 100%)"
          }}
        />

        {/* Aurora orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full animate-aurora"
            style={{ background: "radial-gradient(circle at 40% 40%, rgba(124,58,237,0.2) 0%, transparent 65%)" }} />
          <div className="absolute -bottom-32 right-[-15%] w-[600px] h-[600px] rounded-full animate-aurora"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.12) 0%, transparent 65%)", animationDelay: "3.5s" }} />
          <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full animate-aurora"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 65%)", animationDelay: "6s" }} />
          <div className="absolute top-[15%] right-[15%] w-[220px] h-[220px] rounded-full animate-pulse-soft"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)", animationDelay: "1.5s" }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "52px 52px"
          }}
        />

        {/* Morphing blob accents */}
        <div className="absolute top-24 right-20 w-48 h-48 bg-violet-600/[0.07] animate-morph" style={{ filter: "blur(4px)" }} />
        <div className="absolute bottom-36 left-12 w-32 h-32 bg-purple-500/[0.06] animate-morph" style={{ filter: "blur(3px)", animationDelay: "5s" }} />

        {/* Geometric accents */}
        <div className="absolute top-32 right-36 w-24 h-24 border border-white/[0.05] rounded-3xl rotate-12 animate-float-slow" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-44 left-24 w-16 h-16 border border-violet-400/[0.08] rounded-2xl -rotate-6 animate-float-slow" style={{ animationDuration: "10s", animationDelay: "2s" }} />

        {/* Twinkling stars */}
        {[
          { top: "18%", left: "25%", delay: "0s" },
          { top: "35%", left: "72%", delay: "1.2s" },
          { top: "62%", left: "18%", delay: "0.6s" },
          { top: "78%", left: "58%", delay: "2s" },
          { top: "12%", left: "60%", delay: "0.9s" },
          { top: "48%", left: "88%", delay: "1.7s" },
        ].map((s, i) => (
          <div key={i}
            className="absolute w-1 h-1 rounded-full bg-white/30 animate-twinkle"
            style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          />
        ))}

        {/* ── Floating UI preview cards ── */}
        {/* Top-right: Revenue card */}
        <FloatingCard
          className="top-[14%] right-[8%] w-52 animate-float"
          style={{ animationDuration: "6s", animationDelay: "0.5s" }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Revenue</span>
            <span className="text-[9px] bg-emerald-400/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">+14.2%</span>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">AED 2.4M</p>
          <div className="mt-2.5 flex gap-1 items-end h-8">
            {[35, 58, 42, 72, 55, 88, 65, 94, 71, 82].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: `rgba(167,139,250,${0.2 + (i / 10) * 0.5})`
                }}
              />
            ))}
          </div>
        </FloatingCard>

        {/* Bottom-right: Employees */}
        <FloatingCard
          className="bottom-[22%] right-[6%] w-44 animate-float-slow"
          style={{ animationDuration: "7s", animationDelay: "2s" }}
        >
          <StatPill icon={Users} value="487" label="Active Employees" color="bg-blue-500/20 text-blue-400" />
          <div className="mt-2.5 h-px bg-white/[0.06]" />
          <div className="mt-2.5">
            <StatPill icon={Building2} value="12" label="Project Sites" color="bg-violet-500/20 text-violet-400" />
          </div>
        </FloatingCard>

        {/* Mid-left: Tasks card */}
        <FloatingCard
          className="top-[46%] left-[5%] w-48 animate-float"
          style={{ animationDuration: "8s", animationDelay: "1s" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-6 w-6 rounded-lg bg-amber-400/20 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-[11px] font-bold text-white/60">Tasks Today</span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Completed", w: "68%", color: "bg-emerald-400/40" },
              { label: "In Progress", w: "45%", color: "bg-violet-400/40" },
              { label: "Pending",    w: "25%", color: "bg-amber-400/40"  },
            ].map(t => (
              <div key={t.label}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[9px] text-white/35 font-medium">{t.label}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${t.color}`} style={{ width: t.w }} />
                </div>
              </div>
            ))}
          </div>
        </FloatingCard>

        {/* ── Main content ── */}
        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10 justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3.5 animate-fade-in">
            <div className="h-11 w-11 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] flex items-center justify-center p-2 shadow-2xl shadow-black/40">
              <img src={logoSrc} alt="SKPM" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-white/90 tracking-tight leading-none">SKPM Technical Service</h1>
              <p className="text-[11px] text-white/30 font-medium mt-0.5">Operations Management Platform</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold tracking-wider">LIVE</span>
            </div>
          </div>

          {/* Hero */}
          <div className="flex-1 flex flex-col justify-center py-10">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 w-fit mb-8 animate-fade-in stagger-1">
              <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[11px] text-violet-300/80 font-bold tracking-widest uppercase">
                  Enterprise Operations Platform
                </span>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-1 mb-6 animate-fade-in stagger-2">
              <h2 className="text-[3.2rem] xl:text-[3.8rem] font-black text-white leading-[1.0] tracking-[-0.045em]">
                Manage more.
              </h2>
              <h2 className="text-[3.2rem] xl:text-[3.8rem] font-black leading-[1.0] tracking-[-0.045em]">
                <span
                  className="animate-gradient"
                  style={{
                    background: "linear-gradient(90deg, #a78bfa, #c084fc, #818cf8, #a78bfa)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Work smarter.
                </span>
              </h2>
            </div>

            <p className="text-[15px] text-slate-400/70 max-w-[420px] leading-[1.8] mb-10 animate-fade-in stagger-3">
              The all-in-one digital workspace for UAE enterprises — projects, HR, finance, facilities and compliance in one unified platform.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-2.5 max-w-[420px] animate-fade-in stagger-4">
              {features.map((f) => (
                <div key={f.label}
                  className="flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] rounded-xl px-3.5 py-2.5 transition-all duration-300 group cursor-default"
                >
                  <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}>
                    <f.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[12px] text-slate-300/75 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-slate-600 text-[11px] animate-fade-in stagger-6">
            <Globe className="h-3 w-3" />
            <span>Trusted across UAE · ISO-certified · Enterprise-grade</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          RIGHT — Login Form Panel
          ══════════════════════════════════════════════════ */}
      <div className="flex-1 relative flex items-center justify-center p-6 sm:p-10 lg:p-14"
        style={{ background: "hsl(250 30% 98%)" }}
      >
        {/* Subtle bg glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-30 -translate-y-1/2 translate-x-1/2"
            style={{ background: "radial-gradient(circle, hsl(263 70% 58% / 0.08) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-20 translate-y-1/2 -translate-x-1/2"
            style={{ background: "radial-gradient(circle, hsl(290 70% 60% / 0.07) 0%, transparent 70%)" }} />
        </div>

        <div className="relative w-full max-w-[420px] animate-fade-in-scale">

          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden mb-10">
            <div className="h-16 w-16 rounded-3xl border border-violet-200 bg-violet-50 flex items-center justify-center p-3 mb-4 shadow-lg shadow-violet-200/50">
              <img src={logoSrc} alt="SKPM" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">SKPM Technical Service</h1>
            <p className="text-sm text-slate-500 mt-1">Operations Management Platform</p>
          </div>

          {/* Header text */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <img src={logoSrc} alt="" className="h-5 w-5 object-contain brightness-0 invert" />
              </div>
              <span className="text-[13px] font-bold text-violet-600 tracking-tight">SKPM Ops Hub</span>
            </div>
            <h2 className="text-[2rem] font-black text-slate-900 tracking-tight leading-tight" style={{ letterSpacing: "-0.03em" }}>
              {mode === "login" ? "Welcome back" : "Forgot password?"}
            </h2>
            <p className="text-[14px] text-slate-500 mt-2 leading-relaxed">
              {mode === "login"
                ? "Sign in to your workspace to continue"
                : "We'll email you a link to reset your password"}
            </p>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Outer glow */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent blur-[2px] pointer-events-none" />

            <div className="relative bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_16px_40px_-8px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100/80">

              {/* Top accent */}
              <div className="h-[3px] w-full"
                style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7, #6366f1)" }}
              />

              <div className="p-7 sm:p-8">
                <form onSubmit={mode === "login" ? handleLogin : handleForgotPassword} className="space-y-5">

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[12.5px] font-semibold text-slate-600">
                      Email address
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors duration-200" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.ae"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-11 h-11 text-sm border-slate-200 hover:border-slate-300 focus:border-violet-400 bg-slate-50/50 focus:bg-white rounded-xl transition-all duration-200 placeholder:text-slate-400/70 text-slate-900"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-red-500 font-medium animate-slide-down flex items-center gap-1.5">
                        <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  {mode === "login" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-[12.5px] font-semibold text-slate-600">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => { setMode("forgot"); setErrors({}); }}
                          className="text-[12px] text-violet-600 hover:text-violet-700 font-semibold transition-colors hover:underline underline-offset-2"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors duration-200" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-11 h-11 text-sm border-slate-200 hover:border-slate-300 focus:border-violet-400 bg-slate-50/50 focus:bg-white rounded-xl transition-all duration-200 placeholder:text-slate-400 text-slate-900"
                        />
                      </div>
                      {errors.password && (
                        <p className="text-xs text-red-500 font-medium animate-slide-down flex items-center gap-1.5">
                          <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                          {errors.password}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full h-11 text-[13.5px] font-bold gap-2 rounded-xl mt-1 transition-all duration-300 hover:gap-3 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #6366f1 100%)",
                      boxShadow: "0 4px 16px -4px rgba(124,58,237,0.5)"
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      <>
                        {mode === "login" ? "Sign in to workspace" : "Send reset link"}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Back link */}
                {mode === "forgot" && (
                  <div className="mt-5 text-center">
                    <button
                      onClick={() => { setMode("login"); setErrors({}); }}
                      className="text-sm text-violet-600 hover:text-violet-700 font-semibold transition-colors hover:underline underline-offset-2 flex items-center gap-1.5 mx-auto"
                    >
                      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                      Back to sign in
                    </button>
                  </div>
                )}

                {/* Security notice */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-center gap-2 text-slate-400/60">
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    <p className="text-[11px] text-center leading-relaxed">
                      Private company platform · Unauthorized access is prohibited
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-slate-400/50 font-medium mt-6">
            © {new Date().getFullYear()} SKPM Technical Service LLC · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
