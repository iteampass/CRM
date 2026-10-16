import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { notifyProfileChanged, useProfile } from "@/lib/profile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceSettings } from "@/components/crm/WorkspaceSettings";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings — DevLead CRM" },
    { name: "description", content: "Manage your profile picture, personal details, email and password." },
    { property: "og:title", content: "Settings — DevLead CRM" },
    { property: "og:description", content: "Manage your profile picture, personal details, email and password." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Settings,
});

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-[220px_1fr]">
      <div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{text}</p></div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Settings() {
  const p = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ firstName: "", lastName: "", phone: "", jobTitle: "" });
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState({ a: "", b: "" });
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (p) { setF({ firstName: p.firstName, lastName: p.lastName, phone: p.phone, jobTitle: p.jobTitle }); setEmail(p.email); }
  }, [p]);

  if (!p) return <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>;
  const initials = ((p.firstName[0] ?? "") + (p.lastName[0] ?? "") || p.email.slice(0, 2)).toUpperCase();

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const upload = (file: File) => run("avatar", async () => {
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
    const { data: u } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${u.user!.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { error: e2 } = await supabase.auth.updateUser({ data: { avatar_path: path } });
    if (e2) throw e2;
    if (p.avatarPath) await supabase.storage.from("avatars").remove([p.avatarPath]);
    notifyProfileChanged();
    toast.success("Profile picture updated");
  });

  const removeAvatar = () => run("avatar", async () => {
    const { error } = await supabase.auth.updateUser({ data: { avatar_path: null } });
    if (error) throw error;
    if (p.avatarPath) await supabase.storage.from("avatars").remove([p.avatarPath]);
    notifyProfileChanged();
    toast.success("Profile picture removed");
  });

  const saveProfile = (e: React.FormEvent) => { e.preventDefault(); run("profile", async () => {
    const fn = f.firstName.trim(), ln = f.lastName.trim(), ph = f.phone.trim(), jt = f.jobTitle.trim();
    if (!fn || !ln) throw new Error("First and last name are required.");
    if (fn.length > 50 || ln.length > 50 || jt.length > 80) throw new Error("One of the fields is too long.");
    if (ph && !/^\+?[0-9 ()-]{6,20}$/.test(ph)) throw new Error("Please enter a valid phone number.");
    const { error } = await supabase.auth.updateUser({ data: { first_name: fn, last_name: ln, full_name: `${fn} ${ln}`, phone: ph || null, job_title: jt || null } });
    if (error) throw error;
    notifyProfileChanged();
    toast.success("Profile saved");
  }); };

  const saveEmail = (e: React.FormEvent) => { e.preventDefault(); run("email", async () => {
    const v = email.trim();
    if (v === p.email) return;
    const { error } = await supabase.auth.updateUser({ email: v }, { emailRedirectTo: window.location.origin });
    if (error) throw error;
    toast.success("Check both inboxes to confirm the new email address.");
  }); };

  const savePw = (e: React.FormEvent) => { e.preventDefault(); run("pw", async () => {
    if (pw.a.length < 8) throw new Error("Password must be at least 8 characters.");
    if (pw.a !== pw.b) throw new Error("Passwords don't match.");
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    if (error) throw error;
    setPw({ a: "", b: "" });
    toast.success("Password changed");
  }); };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Your profile, workspace members and roles.</p></div>
      <Tabs defaultValue="profile">
        <TabsList><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="workspace">Workspace &amp; members</TabsTrigger></TabsList>
        <TabsContent value="workspace" className="mt-5"><WorkspaceSettings /></TabsContent>
        <TabsContent value="profile" className="mt-5 space-y-5">

      <Section title="Profile picture" text="JPG, PNG or WEBP, up to 5 MB.">
        <div className="flex items-center gap-4">
          {p.avatarUrl
            ? <img src={p.avatarUrl} alt="Profile" className="h-20 w-20 rounded-full border object-cover" />
            : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">{initials}</div>}
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ""; }} />
            <Button type="button" variant="outline" disabled={busy === "avatar"} onClick={() => fileRef.current?.click()}><Camera className="mr-2 h-4 w-4" />{busy === "avatar" ? "Uploading…" : p.avatarPath ? "Change" : "Upload"}</Button>
            {p.avatarPath && <Button type="button" variant="ghost" disabled={busy === "avatar"} onClick={removeAvatar}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>}
          </div>
        </div>
      </Section>

      <Section title="Personal details" text="Shown to your teammates in the workspace.">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="fn">First name</Label><Input id="fn" maxLength={50} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="ln">Last name</Label><Input id="ln" maxLength={50} value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="jt">Job title</Label><Input id="jt" maxLength={80} value={f.jobTitle} onChange={(e) => setF({ ...f, jobTitle: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="ph">Phone number</Label><Input id="ph" type="tel" maxLength={20} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <Button type="submit" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save changes"}</Button>
        </form>
      </Section>

      <Section title="Email" text="We'll send a confirmation link before the change takes effect.">
        <form onSubmit={saveEmail} className="flex gap-2">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="outline" disabled={busy === "email" || email.trim() === p.email}>Update</Button>
        </form>
      </Section>

      <Section title="Password" text="At least 8 characters.">
        <form onSubmit={savePw} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="pa">New password</Label><Input id="pa" type="password" minLength={8} value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="pb">Confirm password</Label><Input id="pb" type="password" minLength={8} value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></div>
          </div>
          <Button type="submit" variant="outline" disabled={busy === "pw" || !pw.a}>Change password</Button>
        </form>
      </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
