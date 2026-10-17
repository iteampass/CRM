import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSavedSearches } from "@/lib/personal-data";
import { useI18n } from "@/lib/i18n";
import { webSearchInput } from "@/lib/web-search";

export function SaveWebSearch({ location, keywords }: { location: string; keywords: string }) {
  const { t } = useI18n();
  const { save } = useSavedSearches();
  const [savedSignature, setSavedSignature] = useState("");
  const [invalid, setInvalid] = useState(false);
  const parsed = webSearchInput.safeParse({
    location,
    keywords: keywords
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean),
    page: 0,
  });
  const signature = JSON.stringify([location, keywords]);
  const saved = savedSignature === signature;
  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        disabled={save.isPending || saved}
        className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        onClick={() => {
          setInvalid(!parsed.success);
          if (!parsed.success) return;
          save.mutate(
            {
              values: {
                name: `${parsed.data.location} — ${parsed.data.keywords.join(" / ")}`.slice(0, 120),
                city: parsed.data.location,
                keywords: parsed.data.keywords,
                areas: [],
                min_price: null,
                max_price: null,
                property_type: null,
                move_in_date: null,
              },
            },
            { onSuccess: () => setSavedSignature(signature) },
          );
        }}
      >
        {t(save.isPending ? "Saving…" : saved ? "Search saved" : "Save search")}
      </button>
      {invalid && (
        <p role="alert" className="text-sm">
          {t("Enter a location and 1–5 keyword lines, each 2–120 characters.")}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t(save.error.message)}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm">
          <Link to="/saved" className="text-primary underline">
            {t("Browse saved searches")}
          </Link>
        </p>
      )}
    </div>
  );
}
