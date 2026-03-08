import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Mail } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md animate-fade-in shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img src={logoSrc} alt="SKPM Logo" className="h-16 w-16 rounded-xl object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">SKPM Technical Service</CardTitle>
            <CardDescription className="mt-1">
              {mode === "login" && "Sign in to your account"}
              {mode === "forgot" && "Reset your password"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={mode === "login" ? handleLogin : handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            {mode === "login" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9" />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
            )}
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {mode === "login" ? "Sign In" : "Send Reset Link"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <button onClick={() => { setMode("forgot"); setErrors({}); }} className="text-primary hover:underline">Forgot password?</button>
            ) : (
              <button onClick={() => { setMode("login"); setErrors({}); }} className="text-primary hover:underline">Back to sign in</button>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-[11px] text-center text-muted-foreground">
              This is a private company tool. Unauthorized access is prohibited.
              <br />Contact your administrator for account access.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
