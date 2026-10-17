import { useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { searchFacebookRentals } from "@/lib/apify-facebook-function";
import { rentalAuthHeaders } from "@/lib/rental-import-client";
import { webSearchInput, type WebSearchInput, type WebSearchResult } from "@/lib/web-search";
export function FacebookRentalSearch({
  location,
  keywords,
  disabled,
  onResults,
  onBusy,
}: {
  location: string;
  keywords: string;
  disabled: boolean;
  onResults: (data: WebSearchResult, input: WebSearchInput) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const search = useMutation({
    mutationFn: async (input: WebSearchInput) =>
      searchFacebookRentals({ data: input, headers: await rentalAuthHeaders() }),
    onMutate: () => onBusy(true),
    onSettled: () => onBusy(false),
    onSuccess: onResults,
    retry: false,
  });
  const input = webSearchInput.safeParse({
    location,
    keywords: keywords
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean),
    page: 0,
  });
  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
        disabled={disabled || search.isPending || !input.success}
        onClick={() => {
          if (input.success) search.mutate(input.data);
        }}
      >
        {t(search.isPending ? "Searching Facebook…" : "Search Facebook (Apify)")}
      </button>
      <p className="text-xs text-muted-foreground">
        {t(
          "Search public Facebook posts by town and keywords. Up to 50 results; this uses your Apify account credits and may take 90 seconds.",
        )}
      </p>
      <div aria-live="polite">
        {search.isError && (
          <p role="alert" className="text-sm">
            {t(search.error.message)}
          </p>
        )}
        {search.data?.warnings.map((warning) => (
          <p key={warning} role="status" className="text-sm">
            {t(warning)}
          </p>
        ))}
        {search.isSuccess &&
          search.data.configured &&
          !search.data.results.length &&
          !search.data.warnings.length && (
            <p>{t("No public Facebook posts found. Try different keywords.")}</p>
          )}
      </div>
    </div>
  );
}
