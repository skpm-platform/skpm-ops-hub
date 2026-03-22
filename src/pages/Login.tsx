import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Mail, ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";
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
      {/* Left panel - Brand & Features (hidden on mobile, visible on lg+) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "2s" }} />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24 w-full">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center p-2">
              <img src={logoSrc} alt="SKPM" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SKPM Technical Service</h1>
              <p className="text-sm text-blue-200/70">Operations Management Platform</p>
            </div>
          </div>

          <div className="space-y-3 mb-16">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Manage your
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 animate-gradient">
                entire operation
              </span>
              <br />
              in one place.
            </h2>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              Streamline projects, HR, finance, and facilities with a unified digital platform.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-5">
            {[
              { icon: Zap, title: "Real-time Dashboard", desc: "Live KPIs, analytics & insights at your fingertips" },
              { icon: Shield, title: "Enterprise Security", desc: "Role-based access with complete audit trails" },
              { icon: BarChart3, title: "Smart Reporting", desc: "Financial reports, attendance tracking & more" },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-[420px] space-y-8 animate-fade-in">
          {/* Mobile logo - visible only on mobile */}
          <div className="flex flex-col items-center lg:hidden mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center p-2.5 mb-4">
              <img src={logoSrc} alt="SKPM Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">SKPM Technical Service</h1>
            <p className="text-sm text-muted-foreground mt-1">Operations Management Platform</p>
          </div>

          <Card className="shadow-xl border-border/40 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2 pb-2">
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                {mode === "login" ? "Welcome back" : "Reset password"}
              </CardTitle>
              <CardDescription className="text-sm">
                {mode === "login" && "Enter your credentials to access the platform"}
                {mode === "forgot" && "We'll send you a reset link to your email"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={mode === "login" ? handleLogin : handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email" type="email" placeholder="you@company.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="pl-10 h-11 text-sm bg-secondary/30 border-border/60 focus:bg-background transition-colors"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                {mode === "login" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setErrors({}); }}
                        className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password" type="password" placeholder="••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)} required
                        className="pl-10 h-11 text-sm bg-secondary/30 border-border/60 focus:bg-background transition-colors"
                      />
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-medium gap-2 glow-primary transition-all duration-300 hover:gap-3"
                  disabled={loading}
                >
                  {loading && <Loader2 className="animate-spin h-4 w-4" />}
                  {mode === "login" ? "Sign In" : "Send Reset Link"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
              {mode === "forgot" && (
                <div className="mt-4 text-center">
                  <button onClick={() => { setMode("login"); setErrors({}); }} className="text-sm text-primary hover:underline transition-colors">
                    ← Back to sign in
                  </button>
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  This is a private company tool. Unauthorized access is prohibited.
                  <br />Contact your administrator for account access.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} SKPM Technical Service LLC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
