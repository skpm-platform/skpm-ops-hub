import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Mail, ArrowRight, Shield, Zap, BarChart3, Globe, ChevronRight } from "lucide-react";
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
  const { data: companyLogoUrl } = useSystemSetting("company_logo_url");
  const logoSrc = companyLogoUrl || skpmLogo;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
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
    if (error) toast.error(error.message);
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
    if (error) toast.error(error.message);
    else toast.success("Check your email for a password reset link!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel — Premium Brand Showcase */}
      <div className="hidden lg:flex lg:w-[56%] relative overflow-hidden">
        {/* Deep gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0d1530] to-[#0f0a2e]" />
        
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[15%] -left-32 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[100px] animate-pulse-soft" />
          <div className="absolute bottom-[15%] right-[-5%] w-[450px] h-[450px] bg-indigo-600/12 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-[50%] left-[30%] w-[350px] h-[350px] bg-cyan-500/8 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: "3s" }} />
          <div className="absolute bottom-[5%] left-[10%] w-[250px] h-[250px] bg-purple-600/10 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: "2s" }} />
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "80px 80px"
        }} />

        {/* Decorative geometric shapes */}
        <div className="absolute top-20 right-20 w-24 h-24 border border-white/[0.05] rounded-2xl rotate-12 animate-float" />
        <div className="absolute bottom-32 left-16 w-16 h-16 border border-white/[0.04] rounded-xl -rotate-12 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-32 w-8 h-8 bg-blue-500/10 rounded-lg rotate-45 animate-bounce-soft" />

        <div className="relative z-10 flex flex-col justify-between px-14 xl:px-20 w-full py-12">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.08] flex items-center justify-center p-2 shadow-2xl">
              <img src={logoSrc} alt="SKPM" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">SKPM Technical Service</h1>
              <p className="text-xs text-white/30 font-medium">Operations Management Platform</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="flex-1 flex flex-col justify-center -mt-8">
            <div className="space-y-6 mb-16 max-w-lg">
              <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1.5 text-xs text-blue-300/80 font-medium backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Enterprise-grade platform
              </div>
              <h2 className="text-4xl xl:text-[3.2rem] font-extrabold text-white leading-[1.1] tracking-tight">
                Manage your
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 animate-gradient" style={{ backgroundSize: "200% 200%" }}>
                  entire operation
                </span>
                <br />
                in one place.
              </h2>
              <p className="text-base text-slate-400/80 max-w-md leading-relaxed">
                Streamline projects, HR, finance, and facilities management with a unified digital platform built for modern enterprises.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid gap-3 max-w-lg">
              {[
                { icon: Zap, title: "Real-time Analytics", desc: "Live KPIs and business intelligence dashboards", color: "from-amber-500/20 to-orange-500/10 border-amber-500/15" },
                { icon: Shield, title: "Enterprise Security", desc: "Role-based access control with full audit trails", color: "from-emerald-500/20 to-green-500/10 border-emerald-500/15" },
                { icon: BarChart3, title: "Smart Reporting", desc: "Automated financial reports and analytics", color: "from-blue-500/20 to-cyan-500/10 border-blue-500/15" },
              ].map((feature) => (
                <div key={feature.title} className={`flex items-center gap-4 bg-gradient-to-r ${feature.color} border rounded-xl px-4 py-3.5 group hover:scale-[1.01] transition-all duration-300`}>
                  <div className="h-9 w-9 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                    <feature.icon className="h-4.5 w-4.5 text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white">{feature.title}</p>
                    <p className="text-[11px] text-slate-400/70">{feature.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-3 text-white/20 text-[11px]">
            <Globe className="h-3.5 w-3.5" />
            <span>Trusted by teams across the UAE</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/[0.03]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative w-full max-w-[420px] space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center lg:hidden mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center p-3 mb-4 shadow-lg shadow-primary/10">
              <img src={logoSrc} alt="SKPM Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">SKPM Technical Service</h1>
            <p className="text-sm text-muted-foreground mt-1">Operations Management Platform</p>
          </div>

          <Card className="shadow-2xl shadow-black/[0.06] border-border/30 overflow-hidden">
            {/* Subtle top accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            <CardHeader className="text-center space-y-2.5 pb-2 pt-8">
              <CardTitle className="text-2xl sm:text-[1.65rem] font-bold tracking-tight">
                {mode === "login" ? "Welcome back" : "Reset password"}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground/80">
                {mode === "login" && "Enter your credentials to access the platform"}
                {mode === "forgot" && "We'll send you a reset link to your email"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-8 px-6 sm:px-8">
              <form onSubmit={mode === "login" ? handleLogin : handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary/70 transition-colors duration-200" />
                    <Input
                      id="email" type="email" placeholder="you@company.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="pl-11 h-12 text-sm bg-muted/30 border-border/50 hover:border-border focus:border-primary/50 focus:bg-background rounded-xl transition-all duration-200 shadow-sm"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive font-medium animate-slide-down">{errors.email}</p>}
                </div>
                {mode === "login" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setErrors({}); }}
                        className="text-xs text-primary/80 hover:text-primary font-medium hover:underline underline-offset-2 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary/70 transition-colors duration-200" />
                      <Input
                        id="password" type="password" placeholder="••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)} required
                        className="pl-11 h-12 text-sm bg-muted/30 border-border/50 hover:border-border focus:border-primary/50 focus:bg-background rounded-xl transition-all duration-200 shadow-sm"
                      />
                    </div>
                    {errors.password && <p className="text-xs text-destructive font-medium animate-slide-down">{errors.password}</p>}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-semibold gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:gap-3 bg-gradient-to-r from-primary to-primary/90"
                  disabled={loading}
                >
                  {loading && <Loader2 className="animate-spin h-4 w-4" />}
                  {mode === "login" ? "Sign In" : "Send Reset Link"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
              {mode === "forgot" && (
                <div className="mt-5 text-center">
                  <button onClick={() => { setMode("login"); setErrors({}); }} className="text-sm text-primary/80 hover:text-primary font-medium hover:underline underline-offset-2 transition-colors">
                    ← Back to sign in
                  </button>
                </div>
              )}
              <div className="mt-8 pt-5 border-t border-border/30">
                <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
                  <Shield className="h-3.5 w-3.5" />
                  <p className="text-[11px] text-center leading-relaxed">
                    Private company tool · Unauthorized access prohibited
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground/40 font-medium">
            © {new Date().getFullYear()} SKPM Technical Service LLC · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
