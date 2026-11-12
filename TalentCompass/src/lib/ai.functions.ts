import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  name: z.string().min(1),
  department: z.string().optional().default(""),
});

function fallbackDescription(name: string, department: string): string {
  const team = department ? ` within the ${department} team` : " within our team";
  return `We are looking for a ${name}${team} to help deliver high-quality work and improve the way we serve our customers. You will collaborate closely with cross-functional partners, take ownership of meaningful initiatives, and bring clear, thoughtful judgment to day-to-day decisions. The ideal candidate combines strong role-specific expertise with excellent communication, a practical problem-solving approach, and a commitment to continuous improvement. You will help shape priorities, share knowledge with colleagues, and contribute to a supportive, high-performing culture.`;
}

export const generatePositionDescription = createServerFn({ method: "POST" })
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["OPENAI_API_KEY"];
    // AI generation is optional; use the local template when no API key is configured.
    // Keep the workflow usable with a professional template in that case.
    if (!apiKey) {
      return { description: fallbackDescription(data.name, data.department) };
    }

    const prompt = [
      "Write a concise job description for a recruitment workspace.",
      `Position title: ${data.name}`,
      data.department ? `Department: ${data.department}` : "",
      "",
      "Rules: 90-140 words, plain professional English, no markdown headings, no bullet characters, no em dashes.",
      "Cover the role purpose, key responsibilities and the main skills expected.",
      "Return only the description text.",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: process.env["OPENAI_MODEL"] || "gpt-6-astra",
        store: false,
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI is busy right now. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(detail || `AI request failed (${res.status}).`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          } else if (event.type === "response.completed" && !text) {
            text = event.response?.output_text ?? "";
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }

    const description = text.replace(/\u2014/g, "-").trim();
    if (!description) throw new Error("AI did not return a description. Please try again.");
    return { description };
  });
