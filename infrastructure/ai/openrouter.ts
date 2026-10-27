import "server-only";

import { serverEnvironment } from "@/infrastructure/env";

export type ProviderDelta = Readonly<{ delta: string }>;
export type ProviderUsage = Readonly<{
  inputTokens: number | null;
  outputTokens: number | null;
}>;

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function readProviderError(value: unknown, fallbackStatus = 502) {
  const error =
    value && typeof value === "object" ? Reflect.get(value, "error") : null;
  const code =
    error && typeof error === "object" ? Reflect.get(error, "code") : null;
  const parsedCode = typeof code === "string" ? Number(code) : code;
  const status =
    typeof parsedCode === "number" &&
    Number.isInteger(parsedCode) &&
    parsedCode >= 400 &&
    parsedCode <= 599
      ? parsedCode
      : fallbackStatus;

  // Provider messages and metadata can contain submitted content. Only expose
  // messages chosen here while retaining the status needed for error handling.
  const messages: Record<number, string> = {
    401: "The model provider could not authenticate this request.",
    402: "The model provider could not serve this request for free.",
    403: "The model provider could not accept this request.",
    404: "This model is no longer available for free. Choose another model.",
    408: "The model provider took too long to respond.",
    429: "This model is busy right now. Try it again shortly.",
  };
  return new OpenRouterError(
    messages[status] ?? "The model provider could not finish this response.",
    status,
  );
}

function readUsage(value: unknown): ProviderUsage | null {
  if (!value || typeof value !== "object") return null;
  const usage = Reflect.get(value, "usage");
  if (!usage || typeof usage !== "object") return null;
  const prompt = Reflect.get(usage, "prompt_tokens");
  const completion = Reflect.get(usage, "completion_tokens");
  return {
    inputTokens: typeof prompt === "number" ? prompt : null,
    outputTokens: typeof completion === "number" ? completion : null,
  };
}

function readDelta(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const choices = Reflect.get(value, "choices");
  if (!Array.isArray(choices)) return "";
  const first = choices[0];
  if (!first || typeof first !== "object") return "";
  const delta = Reflect.get(first, "delta");
  if (!delta || typeof delta !== "object") return "";
  const content = Reflect.get(delta, "content");
  return typeof content === "string" ? content : "";
}

export async function streamOpenRouter(
  model: string,
  prompt: string,
  signal: AbortSignal,
  onDelta: (delta: ProviderDelta) => void,
) {
  if (!model.endsWith(":free")) {
    throw readProviderError(null, 404);
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnvironment.openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        usage: { include: true },
        provider: { max_price: { prompt: 0, completion: 0, request: 0 } },
      }),
      signal,
    },
  );

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw readProviderError(payload, response.status);
  }
  if (!response.body) {
    throw new OpenRouterError("The model provider returned no response.", 502);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = "";
  let usage: ProviderUsage = { inputTokens: null, outputTokens: null };
  let eventData: string[] = [];
  let finished = false;
  let hasContent = false;

  function readEvent() {
    if (eventData.length === 0 || finished) return;
    const data = eventData.join("\n").trim();
    eventData = [];
    if (data === "[DONE]") {
      finished = true;
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      throw new OpenRouterError(
        "The model provider returned an invalid response.",
        502,
      );
    }
    if (
      payload &&
      typeof payload === "object" &&
      Reflect.get(payload, "error")
    ) {
      throw readProviderError(payload);
    }
    const choices =
      payload && typeof payload === "object"
        ? Reflect.get(payload, "choices")
        : null;
    if (
      Array.isArray(choices) &&
      choices.some(
        (choice) =>
          choice &&
          typeof choice === "object" &&
          Reflect.get(choice, "finish_reason") === "error",
      )
    ) {
      throw readProviderError(payload);
    }
    const delta = readDelta(payload);
    if (delta) {
      hasContent ||= delta.trim().length > 0;
      onDelta({ delta });
    }
    usage = readUsage(payload) ?? usage;
  }

  function readLine(rawLine: string) {
    const line = rawLine.replace(/\r$/, "");
    if (line === "") {
      readEvent();
    } else if (line.startsWith("data:")) {
      eventData.push(line.slice(5).replace(/^ /, ""));
    }
  }

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) {
        if (pending) readLine(pending);
        readEvent();
        break;
      }
      pending += value;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        readLine(line);
        if (finished) break;
      }
    }
    if (!finished) {
      throw new OpenRouterError(
        "The model provider disconnected before finishing this response.",
        502,
      );
    }
    if (!hasContent) {
      throw new OpenRouterError(
        "The model provider returned an empty response. Try another model.",
        502,
      );
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  return usage;
}
