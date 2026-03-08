import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUserRole } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Building2, Palette, Shield, Loader2, Upload, Settings2, Users, Lock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logAudit } from "@/lib/audit";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: currentRole } = useUserRole();
  const isAdmin = currentRole === "admin";
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [newPassword, setNewPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [companyName, setCompanyName] = useState("SKPM Technical Service");
  const [uploading, setUploading] = useState(false);

  // Role management
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("staff");

  const nameValue = profileName || profile?.name || "";
  const avatarUrl = profile?.avatar_url;
  const initials = (nameValue || user?.email || "U").split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

  // Upload avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
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
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploading(false);
  };

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

  // Admin: members & roles
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: allRoles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const getRoleForUser = (userId: string) => allRoles?.find(r => r.user_id === userId)?.role ?? "staff";

  const updateUserRole = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      const existing = allRoles?.find(r => r.user_id === selectedUser.user_id);
      if (existing) {
        const { error } = await supabase.from("user_roles").update({ role: selectedRole as any }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: selectedUser.user_id, role: selectedRole as any });
        if (error) throw error;
      }
      await logAudit("Changed user role", `${selectedUser.name ?? selectedUser.user_id} → ${selectedRole}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("Role updated");
      setRoleDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences & system configuration</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" /> Theme</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
          {isAdmin && <TabsTrigger value="access" className="gap-2"><Users className="h-4 w-4" /> User Access</TabsTrigger>}
          {isAdmin && <TabsTrigger value="system" className="gap-2"><Settings2 className="h-4 w-4" /> System</TabsTrigger>}
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
                  <input type="file" ref={fileRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
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
                <div className="space-y-2"><Label>Display Name</Label><Input value={nameValue} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" /></div>
              </div>
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} size="sm" className="h-9">
                {updateProfile.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Trade License No.</Label><Input placeholder="TL-XXXX-XXXX" /></div>
                <div className="space-y-2"><Label>Address</Label><Input placeholder="Company address" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder="+971 XX XXX XXXX" /></div>
                <div className="space-y-2"><Label>Email</Label><Input placeholder="info@company.com" /></div>
                <div className="space-y-2"><Label>Website</Label><Input placeholder="www.company.com" /></div>
              </div>
              <Button onClick={() => toast.success("Company info saved")} size="sm" className="h-9">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-muted-foreground">Toggle dark theme</p></div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-sm"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" /></div>
              <Button onClick={updatePassword} size="sm" className="h-9">Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Access Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="access" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Access Control</CardTitle>
                <CardDescription>Manage user roles and permissions. Only system administrators can modify these settings.</CardDescription>
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
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                {(p.name ?? "U").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{p.name ?? "Unnamed"}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{getRoleForUser(p.user_id)}</Badge></TableCell>
                        <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"} className={p.status === "active" ? "bg-success/15 text-success border-0" : "border-0"}>{p.status ?? "active"}</Badge></TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                            setSelectedUser(p);
                            setSelectedRole(getRoleForUser(p.user_id));
                            setRoleDialogOpen(true);
                          }}>Change Role</Button>
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

        {/* System Settings (Admin Only) */}
        {isAdmin && (
          <TabsContent value="system" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Settings</CardTitle>
                <CardDescription>Configure system-wide settings. These changes affect all users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Select defaultValue="AED">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                        <SelectItem value="GBP">GBP — British Pound</SelectItem>
                        <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>VAT Rate (%)</Label>
                    <Input type="number" defaultValue={5} />
                  </div>
                  <div className="space-y-2">
                    <Label>Work Start Time</Label>
                    <Input type="time" defaultValue="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Late Threshold (minutes)</Label>
                    <Input type="number" defaultValue={30} />
                  </div>
                  <div className="space-y-2">
                    <Label>Working Days / Month</Label>
                    <Input type="number" defaultValue={26} />
                  </div>
                  <div className="space-y-2">
                    <Label>Overtime Rate Multiplier</Label>
                    <Input type="number" step="0.1" defaultValue={1.5} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-sm">Email Notifications</p><p className="text-xs text-muted-foreground">Send email alerts for approvals</p></div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-sm">Auto-Generate Invoice Numbers</p><p className="text-xs text-muted-foreground">Sequential invoice numbering</p></div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-sm">Require Approval for Leave</p><p className="text-xs text-muted-foreground">Manager must approve leave requests</p></div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-sm">Auto Clock-Out</p><p className="text-xs text-muted-foreground">Automatically clock out at end of shift</p></div>
                    <Switch />
                  </div>
                </div>
                <Button onClick={() => toast.success("System settings saved")} size="sm" className="h-9">Save System Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
