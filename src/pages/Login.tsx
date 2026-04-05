import { checkLoginRateLimit, recordLoginAttempt, getRemainingAttempts } from "@/lib/rate-limit";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, ArrowRight, Shield, Zap, BarChart3, Globe, CheckCircle2, TrendingUp, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import skpmLogo from "@/assets/skpm-logo.png";
import { useSystemSetting } from "@/hooks/use-system-settings";
import { loginSchema } from "@/lib/validations";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const { data: companyLogoUrl } = useSystemSetting("company_logo_url");
  const logoSrc = companyLogoUrl || skpmLogo;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const rateCheck = checkLoginRateLimit();
    if (!rateCheck.allowed) {
      setLockoutSeconds(rateCheck.remainingSeconds);
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
    const { error } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password });
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
      const remaining = getRemainingAttempts();
      if (remaining > 0 && remaining <= 3) {
        toast.error(`${error.message}. ${remaining} attempts remaining.`);
      } else {
        toast.error(error.message);
      }
    } else {
      recordLoginAttempt(true);
      toast.success("Check your email for a password reset link!");
    }
    setLoading(false);
  };

  const stats = [
    { icon: Users, value: "500+", label: "Active Users" },
    { icon: Building2, value: "12", label: "Project Sites" },
    { icon: TrendingUp, value: "99.9%", label: "Uptime SLA" },
  ];

  const features = [
    { icon: Zap, label: "Real-time Operations Dashboard", color: "text-amber-400" },
    { icon: Shield, label: "Enterprise-grade Security", color: "text-emerald-400" },
    { icon: BarChart3, label: "Smart Analytics & Reporting", color: "text-indigo-400" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#030712]">
      {/* ═══════════════════════════════════════════════
          LEFT PANEL — Immersive Brand Showcase
          ═══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden">

        {/* Multi-layer dark background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0e1a] via-[#0d0f20] to-[#060814]" />

        {/* Aurora glow orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full animate-aurora"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-24 right-[-10%] w-[500px] h-[500px] rounded-full animate-aurora"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)", animationDelay: "3s" }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-[350px] h-[350px] rounded-full animate-aurora"
            style={{ background: "radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%)", animationDelay: "5s" }}
          />
          <div
            className="absolute top-1/4 right-1/4 w-[200px] h-[200px] rounded-full animate-pulse-soft"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", animationDelay: "2s" }}
          />
        </div>

        {/* Fine grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }}
        />

        {/* Animated morphing blobs */}
        <div
          className="absolute top-20 right-16 w-44 h-44 bg-indigo-500/[0.07] animate-morph"
          style={{ filter: "blur(2px)" }}
        />
        <div
          className="absolute bottom-32 left-8 w-28 h-28 bg-violet-500/[0.06] animate-morph"
          style={{ filter: "blur(1px)", animationDelay: "4s" }}
        />

        {/* Floating geometric accents */}
        <div className="absolute top-28 right-28 w-20 h-20 border border-white/[0.06] rounded-2xl rotate-12 animate-float" style={{ animationDuration: "7s" }} />
        <div className="absolute bottom-40 left-20 w-14 h-14 border border-indigo-400/[0.08] rounded-xl -rotate-6 animate-float" style={{ animationDuration: "9s", animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-12 w-5 h-5 bg-violet-400/10 rounded rotate-45 animate-bounce-soft" />
        <div className="absolute top-1/3 left-1/3 w-2.5 h-2.5 bg-indigo-400/20 rounded-full animate-pulse-soft" style={{ animationDelay: "1.5s" }} />

        {/* Vertical accent lines */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
          <div className="absolute top-0 left-[30%] w-px h-full bg-gradient-to-b from-transparent via-white to-transparent" />
          <div className="absolute top-0 left-[65%] w-px h-full bg-gradient-to-b from-transparent via-white to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col w-full px-12 xl:px-16 py-10 justify-between">

          {/* Logo + Brand + Live indicator */}
          <div className="flex items-center gap-3.5 animate-fade-in">
            <div className="h-11 w-11 rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.08] flex items-center justify-center p-2 shadow-xl shadow-black/30">
              <img src={logoSrc} alt="SKPM" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-white/90 tracking-tight leading-none">SKPM Technical Service</h1>
              <p className="text-[11px] text-white/30 font-medium mt-0.5 leading-none">Operations Management Platform</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold tracking-wide">LIVE</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="flex-1 flex flex-col justify-center py-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 w-fit bg-indigo-500/10 border border-indigo-400/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in stagger-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[11px] text-indigo-300/80 font-semibold tracking-widest uppercase">Enterprise Operations Platform</span>
            </div>

            {/* Main headline */}
            <div className="space-y-2 mb-8 animate-fade-in stagger-2">
              <h2 className="text-[2.8rem] xl:text-[3.4rem] font-black text-white leading-[1.05] tracking-[-0.04em]">
                One platform.
              </h2>
              <h2 className="text-[2.8rem] xl:text-[3.4rem] font-black leading-[1.05] tracking-[-0.04em]">
                <span
                  className="animate-gradient"
                  style={{
                    background: "linear-gradient(90deg, #818cf8, #a78bfa, #60a5fa, #818cf8)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Total control.
                </span>
              </h2>
            </div>

            <p className="text-[15px] text-slate-400/75 max-w-md leading-[1.75] mb-10 animate-fade-in stagger-3">
              Manage projects, HR, finance, facilities, and compliance — all in one unified digital workspace built for the UAE's leading enterprises.
            </p>

            {/* Stats row */}
            <div className="flex gap-8 mb-12 animate-fade-in stagger-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <stat.icon className="h-3.5 w-3.5 text-indigo-400/70" />
                    <span className="text-[22px] font-black text-white tracking-tight">{stat.value}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div className="flex flex-col gap-2.5 animate-fade-in stagger-5">
              {features.map((feat) => (
                <div
                  key={feat.label}
                  className="flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl px-4 py-2.5 transition-all duration-300 group w-fit"
                >
                  <feat.icon className={`h-4 w-4 ${feat.color} group-hover:scale-110 transition-transform duration-200`} />
                  <span className="text-[13px] text-slate-300/80 font-medium">{feat.label}</span>
                  <div className="ml-2 h-1.5 w-1.5 rounded-full bg-white/10 group-hover:bg-indigo-400/40 transition-colors duration-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-2 text-slate-600 text-[11px] animate-fade-in stagger-6">
            <Globe className="h-3 w-3" />
            <span>Trusted across UAE · Secure · Enterprise-grade</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT PANEL — Login Form
          ═══════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative bg-[#060814] lg:bg-background">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/[0.025]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative w-full max-w-[400px] space-y-6 animate-fade-in">

          {/* Mobile Logo */}
          <div className="flex flex-col items-center lg:hidden mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 border border-primary/20 flex items-center justify-center p-2.5 mb-4 shadow-lg shadow-primary/15">
              <img src={logoSrc} alt="SKPM Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">SKPM Technical Service</h1>
            <p className="text-sm text-slate-400 mt-1">Operations Management Platform</p>
          </div>

          {/* Form Card */}
          <div className="relative">
            {/* Glow ring behind card */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent blur-sm" />

            <div className="relative bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/[0.06] overflow-hidden shadow-2xl shadow-black/20">
              {/* Top accent gradient bar */}
              <div className="h-[3px] w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

              <div className="px-7 sm:px-8 pt-8 pb-7">
                {/* Card header */}
                <div className="mb-7">
                  <h2 className="text-[1.55rem] font-bold tracking-tight text-foreground leading-tight">
                    {mode === "login" ? "Welcome back" : "Reset password"}
                  </h2>
                  <p className="text-[13.5px] text-muted-foreground mt-1.5">
                    {mode === "login"
                      ? "Enter your credentials to access the platform"
                      : "We'll send a reset link to your email address"}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={mode === "login" ? handleLogin : handleForgotPassword} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[12.5px] font-semibold text-foreground/70">
                      Email address
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors duration-200" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@skpm.ae"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-11 h-11 text-sm bg-muted/40 dark:bg-white/[0.04] border-border/50 hover:border-border focus:border-primary/50 focus:bg-background rounded-xl transition-all duration-200"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive font-medium animate-slide-down">{errors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  {mode === "login" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-[12.5px] font-semibold text-foreground/70">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => { setMode("forgot"); setErrors({}); }}
                          className="text-[12px] text-primary/70 hover:text-primary font-semibold transition-colors hover:underline underline-offset-2"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors duration-200" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-11 h-11 text-sm bg-muted/40 dark:bg-white/[0.04] border-border/50 hover:border-border focus:border-primary/50 focus:bg-background rounded-xl transition-all duration-200"
                        />
                      </div>
                      {errors.password && (
                        <p className="text-xs text-destructive font-medium animate-slide-down">{errors.password}</p>
                      )}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="pt-1">
                    <Button
                      type="submit"
                      className="w-full h-11 text-[13.5px] font-semibold gap-2 rounded-xl transition-all duration-300 hover:gap-3 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(135deg, hsl(243, 75%, 59%) 0%, hsl(262, 70%, 58%) 100%)"
                      }}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="animate-spin h-4 w-4" />}
                      {mode === "login" ? "Sign In to Platform" : "Send Reset Link"}
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>

                {/* Back to login */}
                {mode === "forgot" && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => { setMode("login"); setErrors({}); }}
                      className="text-sm text-primary/70 hover:text-primary font-semibold transition-colors hover:underline underline-offset-2"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                )}

                {/* Security notice */}
                <div className="mt-6 pt-5 border-t border-border/30">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground/40">
                    <Shield className="h-3.5 w-3.5" />
                    <p className="text-[11px] text-center leading-relaxed">
                      Private company tool · Unauthorized access prohibited
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/35 font-medium">
            © {new Date().getFullYear()} SKPM Technical Service LLC · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
