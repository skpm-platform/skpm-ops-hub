import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Building2, Palette, Shield, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [newPassword, setNewPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [companyName, setCompanyName] = useState("SKPM Technical Service");

  const nameValue = profileName || profile?.name || "";

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("profiles").update({ name: nameValue }).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) { toast.error("Min 6 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Theme</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
              <div className="space-y-2"><Label>Display Name</Label><Input value={nameValue} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" /></div>
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Address</Label><Input placeholder="Company address" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+62 xxx xxx xxxx" /></div>
              <Button onClick={() => toast.success("Company info saved")}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-muted-foreground">Toggle dark theme</p></div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              <Button onClick={updatePassword}>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
