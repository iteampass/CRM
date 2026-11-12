import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", companyPosition: user?.companyPosition ?? "", phone: user?.phone ?? "", avatarUrl: user?.avatarUrl ?? "" });
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const selectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP photo under 5 MB.");
      return;
    }
    setProcessing(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 96;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing unavailable");
      const side = Math.min(bitmap.width, bitmap.height);
      context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 96, 96);
      bitmap.close();
      // Store only a small thumbnail in the user's account metadata.
      const avatarUrl = canvas.toDataURL("image/webp", 0.65);
      if (avatarUrl.length > 16000) throw new Error("Photo too complex");
      setProfile((current) => ({ ...current, avatarUrl }));
    } catch {
      setError("Could not prepare this photo. Please choose another image.");
    } finally { setProcessing(false); }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy && !processing) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Change profile</DialogTitle><DialogDescription>Update your personal details and profile photo.</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={async (event) => {
          event.preventDefault();
          if (busy || processing) return;
          setBusy(true); setError("");
          try { await updateProfile(profile); toast.success("Profile updated"); onClose(); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your profile."); }
          finally { setBusy(false); }
        }}>
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile preview" className="size-16 rounded-full object-cover" /> : <span className="bg-muted grid size-16 shrink-0 place-items-center rounded-full font-medium">{profile.firstName[0]}{profile.lastName[0]}</span>}
            <div className="min-w-0 space-y-2">
              <label className="grid gap-1 text-sm">Profile photo<Input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || processing} onChange={selectPhoto} /></label>
              <p className="text-muted-foreground text-xs">JPG, PNG or WebP, up to 5 MB.</p>
              {profile.avatarUrl && <Button type="button" variant="ghost" size="sm" disabled={busy || processing} onClick={() => setProfile((current) => ({ ...current, avatarUrl: "" }))}>Remove photo</Button>}
            </div>
          </div>
          {([ ["firstName", "First name"], ["lastName", "Last name"], ["companyPosition", "Company position"], ["phone", "Phone"] ] as const).map(([key, label]) => <label key={key} className="grid gap-1.5 text-sm">{label}<Input value={profile[key]} maxLength={key === "phone" ? 50 : 100} type={key === "phone" ? "tel" : "text"} required={key === "firstName" || key === "lastName"} disabled={busy} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy || processing} onClick={onClose}>Cancel</Button><Button disabled={busy || processing}>{busy ? "Saving…" : processing ? "Preparing photo…" : "Save changes"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
