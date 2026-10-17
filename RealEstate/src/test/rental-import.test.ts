import { afterEach, expect, it, vi } from "vitest";
import { emptyApartment, importInput, publicWebUrl } from "@/lib/rental-import";
import { boundedJson, extractRental, groundExtraction } from "@/lib/rental-import.server";
const input = { url: "https://www.4zida.rs/stan/123", title: "Rental", description: "Snippet" };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("rejects local, credentialed and non-web URLs", () => {
  for (const url of [
    "http://127.0.0.1",
    "http://2130706433",
    "http://[::1]",
    "http://169.254.169.254",
    "https://foo.local",
    "https://localhost",
    "https://example.com:9000",
    "https://user:pass@example.com",
    "javascript:alert(1)",
  ])
    expect(publicWebUrl(url)).toBeNull();
  expect(importInput.safeParse({ ...input, url: "file:///etc/passwd" }).success).toBe(false);
  expect(publicWebUrl(input.url)).toBe(input.url);
});
it("retains only source-grounded photos and links", () => {
  const fields = groundExtraction(
    {
      ...emptyApartment,
      page_kind: "listing",
      images: [
        { url: "https://images.4zida.rs/a.jpg", caption: "Room" },
        { url: "https://images.4zida.rs/invented.jpg", caption: "Fake" },
      ],
      listing_links: [{ url: "https://www.4zida.rs/other", title: "Other" }],
    },
    "![Room](https://images.4zida.rs/a.jpg)",
  );
  expect(fields.images).toHaveLength(1);
  expect(fields.listing_links).toEqual([]);
});
it("clears property details on category pages instead of combining apartments", () => {
  const fields = groundExtraction(
    {
      ...emptyApartment,
      page_kind: "directory",
      price: 500,
      address: "Wrong combined address",
      location: "Valjevo",
      listing_links: [{ url: input.url, title: "Flat" }],
    },
    input.url,
  );
  expect(fields.price).toBeNull();
  expect(fields.address).toBeNull();
  expect(fields.location).toBeNull();
  expect(fields.listing_links).toHaveLength(1);
});
it("does not read a page or call AI when the AI key is absent", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(extractRental(input)).rejects.toThrow("OPENAI_API_KEY");
  expect(fetcher).not.toHaveBeenCalled();
});
it("extracts from the actual page, preserves raw data, and leaves missing fields unknown", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  const content =
    "A rental apartment in Valjevo, 400 EUR monthly, owned by the owner. ![Room](https://images.4zida.rs/a.jpg)";
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ data: { content, title: "Flat" } }))
    .mockResolvedValueOnce(
      Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  ...emptyApartment,
                  page_kind: "listing",
                  title: "Flat",
                  price: 400,
                  currency: "EUR",
                  images: [{ url: "https://images.4zida.rs/a.jpg", caption: "Room" }],
                }),
              },
            ],
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await extractRental(input);
  expect(result.status).toBe("extracted");
  expect(result.fields.price).toBe(400);
  expect(result.fields.floor).toBeNull();
  expect(result.fields.images).toHaveLength(1);
  expect(result.raw_data["reader_response"]).toBeDefined();
  expect(result.raw_data["ai_response"]).toBeDefined();
  expect(String(fetcher.mock.calls[0]?.[0])).toBe("https://r.jina.ai/" + input.url);
  const body = JSON.parse(fetcher.mock.calls[1]?.[1].body);
  expect(body.store).toBe(false);
  expect(body.input).toContain(content);
  expect(body.input).not.toContain("Snippet");
});
it("saves a failure with raw source metadata when reading is blocked", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("blocked", { status: 403 })));
  const result = await extractRental(input);
  expect(result.status).toBe("failed");
  expect(result.fields.price).toBeNull();
  expect(result.raw_data["search_result"]).toEqual(input);
});
it("retains page content on AI refusal or invalid output", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            content: "This source content is long enough but the model refuses to extract it.",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "completed",
          output: [{ type: "message", content: [{ type: "refusal" }] }],
        }),
      ),
  );
  const result = await extractRental(input);
  expect(result.status).toBe("failed");
  expect(result.raw_data["reader_response"]).toBeDefined();
  expect(result.fields.images).toEqual([]);
});
it("caps provider response size", async () => {
  await expect(boundedJson(new Response('"123456789"'), 4)).rejects.toThrow("too large");
});
