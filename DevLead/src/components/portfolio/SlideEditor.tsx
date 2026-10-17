import { useI18n } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { SLIDES_BUCKET, slideImageUrl } from "@/lib/website-slides";
import type { HeroSlide } from "@/lib/site-content";
function SlidePreview({ slide }: { slide: HeroSlide }) {
  const { t: ui } = useI18n();
  const [url, setUrl] = useState(slide.path ? "" : slideImageUrl(slide));
  useEffect(() => {
    if (!slide.path) return;
    let cancelled = false;
    supabase.storage
      .from(SLIDES_BUCKET)
      .createSignedUrl(slide.path, 3600)
      .then(({ data, error }) => {
        if (!cancelled && data) setUrl(data.signedUrl);
        if (!cancelled && error) toast.error(ui("Couldn't load image preview."));
      });
    return () => {
      cancelled = true;
    };
  }, [slide.path]);
  return (
    <div className="aspect-video overflow-hidden bg-muted">
      {url && <img src={url} alt={ui(slide.alt)} className="h-full w-full object-cover" />}
    </div>
  );
}
export function SlideEditor({
  slides,
  onChange,
  disabled,
  onBusyChange,
}: {
  slides: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t: ui } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (files: File[]) => {
    if (!files.length || disabled) return;
    if (slides.length + files.length > 12) {
      toast.error(ui("Use up to 12 slideshow images."));
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (files.some((file) => !validTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
      toast.error(ui("Choose JPG, PNG, WebP or AVIF images up to 10 MB each."));
      return;
    }
    setUploading(true);
    onBusyChange(true);
    const added: HeroSlide[] = [];
    try {
      for (const file of files) {
        const bitmap = await createImageBitmap(file);
        bitmap.close();
        const id = crypto.randomUUID();
        const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
        const path = `landing/${id}.${extension}`;
        const { error } = await supabase.storage
          .from(SLIDES_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        added.push({ id, path, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") });
      }
      toast.success(ui("Images uploaded. Save changes to update your website."));
    } catch {
      toast.error(ui("Couldn't upload an image. Please try again."));
    } finally {
      if (added.length) onChange([...slides, ...added]);
      setUploading(false);
      onBusyChange(false);
    }
  };
  const move = (index: number, delta: number) => {
    const next = [...slides];
    const other = index + delta;
    const first = next[index];
    const second = next[other];
    if (!first || !second) return;
    next[index] = second;
    next[other] = first;
    onChange(next);
  };
  return (
    <div className="space-y-4">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        hidden
        aria-label={ui("Upload slideshow images")}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void upload(files);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled || uploading || slides.length >= 12}
        onClick={() => input.current?.click()}
      >
        {uploading ? (
          <LoaderCircle className="mr-2 size-4 animate-spin" />
        ) : (
          <Upload className="mr-2 size-4" />
        )}
        {uploading ? ui("Uploading…") : ui("Upload images")}
      </Button>
      <div className="grid gap-4 sm:grid-cols-2">
        {slides.map((slide, index) => (
          <article key={slide.id} className="min-w-0 overflow-hidden rounded-md border">
            <SlidePreview slide={slide} />
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {ui("Slide ")}
                  {index + 1}
                  {!slide.path ? ui(" · Original") : ""}
                </span>
                <div className="flex">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={ui("Move earlier")}
                    aria-label={ui(`Move slide ${index + 1} earlier`)}
                    disabled={disabled || uploading || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={ui("Move later")}
                    aria-label={ui(`Move slide ${index + 1} later`)}
                    disabled={disabled || uploading || index === slides.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={ui("Remove slide")}
                    aria-label={ui(`Remove slide ${index + 1}`)}
                    disabled={disabled || uploading || slides.length === 1}
                    onClick={() => onChange(slides.filter((s) => s.id !== slide.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                {ui("Image description")}
                <Input
                  value={slide.alt}
                  disabled={disabled || uploading}
                  onChange={(e) =>
                    onChange(
                      slides.map((s) => (s.id === slide.id ? { ...s, alt: e.target.value } : s)),
                    )
                  }
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
