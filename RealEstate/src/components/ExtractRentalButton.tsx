import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { extractAndSaveRental } from "@/lib/rental-import-function";
import { rentalAuthHeaders } from "@/lib/rental-import-client";
import type { ImportInput } from "@/lib/rental-import";
export function ExtractRentalButton({ item }: { item: ImportInput }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const client = useQueryClient();
  const extraction = useMutation({
    mutationFn: async () =>
      extractAndSaveRental({ data: item, headers: await rentalAuthHeaders() }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["imported-rentals", user?.id] }),
        client.invalidateQueries({ queryKey: ["imported-rental-raw", user?.id] }),
      ]);
    },
    retry: false,
  });
  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        disabled={
          extraction.isPending || (extraction.isSuccess && extraction.data.status !== "failed")
        }
        onClick={() => extraction.mutate()}
        className="rounded-md border border-primary/30 px-3 py-2 text-sm font-medium text-primary hover:bg-accent disabled:opacity-50"
      >
        {t(
          extraction.isPending
            ? "Reading page and extracting…"
            : extraction.isSuccess
              ? extraction.data.status === "failed"
                ? "Retry extraction"
                : "Saved to imported apartments"
              : "Extract with AI",
        )}
      </button>
      {extraction.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t(extraction.error.message)}
        </p>
      )}
      {extraction.isSuccess && (
        <div role="status" className="text-sm">
          <p>
            {t(
              extraction.data.status === "failed"
                ? "Saved with an extraction error. Review the source or retry."
                : extraction.data.status === "needs_review"
                  ? "Saved for review: this page is not an individual apartment listing."
                  : "Extracted and saved. Review AI details against the source.",
            )}
          </p>
          <Link to="/imports" className="text-primary underline">
            {t("View imported apartments")}
          </Link>
        </div>
      )}
    </div>
  );
}
