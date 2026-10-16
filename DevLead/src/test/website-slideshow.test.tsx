import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { HeroSlideshow } from "@/components/portfolio/HeroSlideshow";
import { SlideEditor } from "@/components/portfolio/SlideEditor";
import { defaultContent, mergeContent, type HeroSlide } from "@/lib/site-content";

const { upload } = vi.hoisted(() => ({ upload: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload, createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.com/image.jpg" }, error: null }) }) } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); upload.mockClear(); });
const slides: HeroSlide[] = [defaultContent.heroSlides[0] ?? { id: "original", path: "", alt: "Original" }, { id: "second", path: "landing/second.jpg", alt: "Second image", url: "https://example.com/second.jpg" }];

describe("Website slideshow", () => {
  it("keeps the original image for older saved content", () => {
    expect(mergeContent({ hero: { name: "Ivan" } }).heroSlides[0]?.id).toBe("original");
    expect(mergeContent({ heroSlides: [] }).heroSlides).toEqual(defaultContent.heroSlides);
  });
  it("advances automatically and supports pause and navigation", () => {
    vi.useFakeTimers();
    render(<HeroSlideshow slides={slides} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pause slideshow" }));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
  it("hides controls with one image", () => {
    render(<HeroSlideshow slides={defaultContent.heroSlides} />);
    expect(screen.queryByRole("button", { name: "Next slide" })).not.toBeInTheDocument();
  });
  it("reserves a clear background for uploaded slides without changing the original", () => {
    render(<HeroSlideshow slides={slides} />);
    expect(screen.getByAltText("Second image").parentElement).toHaveClass("portfolio-slide-uploaded");
    expect(screen.getByAltText(slides[0]?.alt ?? "Original").parentElement).not.toHaveClass("portfolio-slide-uploaded");
  });
  it("uploads an image and allows ordering and removal before saving", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ close: vi.fn() }));
    function Editor() {
      const [value, setValue] = useState(defaultContent.heroSlides);
      return <SlideEditor slides={value} onChange={setValue} disabled={false} onBusyChange={() => {}} />;
    }
    render(<Editor />);
    fireEvent.change(screen.getByLabelText("Upload slideshow images"), { target: { files: [new File(["image"], "my-photo.jpg", { type: "image/jpeg" })] } });
    await screen.findByText("Slide 2");
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^landing\/.+\.jpg$/), expect.any(File), { contentType: "image/jpeg", upsert: false });
    fireEvent.click(screen.getByRole("button", { name: "Move slide 2 earlier" }));
    expect(screen.getByText("Slide 2 · Original")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove slide 1" }));
    await waitFor(() => expect(screen.getByText("Slide 1 · Original")).toBeInTheDocument());
  });
  it("rejects unsupported files without uploading", async () => {
    render(<SlideEditor slides={defaultContent.heroSlides} onChange={() => {}} disabled={false} onBusyChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("Upload slideshow images"), { target: { files: [new File(["svg"], "file.svg", { type: "image/svg+xml" })] } });
    expect(upload).not.toHaveBeenCalled();
  });
});