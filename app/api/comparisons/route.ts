import { slidingWindow } from "@arcjet/next";
import aj from "@/lib/arcjet";
import { serverEnvironment } from "@/infrastructure/env";
import { encodeEvent } from "@/features/comparisons/contracts";
import {
  prepareComparison,
  runContestant,
} from "@/features/comparisons/run-comparison";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const comparisonProtection = aj.withRule(
  slidingWindow({ mode: "LIVE", interval: "1m", max: 10 }),
);

function parseRequest(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const prompt = Reflect.get(value, "prompt");
  const modelIds = Reflect.get(value, "modelIds");
  if (
    typeof prompt !== "string" ||
    prompt.trim().length === 0 ||
    prompt.length > 20_000 ||
    !Array.isArray(modelIds) ||
    modelIds.length < 1 ||
    modelIds.length > 3 ||
    !modelIds.every((modelId) => typeof modelId === "string") ||
    new Set(modelIds).size !== modelIds.length
  ) {
    return null;
  }
  return { prompt: prompt.trim(), modelIds } as const;
}

export async function POST(request: Request) {
  const decision = await comparisonProtection.protect(request);
  if (decision.isDenied()) {
    const status = decision.reason.isRateLimit() ? 429 : 403;
    return Response.json(
      {
        message:
          status === 429
            ? "You have started several comparisons. Try again in a minute."
            : "This comparison request could not be accepted.",
      },
      { status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Send a valid comparison request." },
      { status: 400 },
    );
  }
  const input = parseRequest(body);
  if (!input) {
    return Response.json(
      { message: "Enter a prompt and choose between one and three models." },
      { status: 400 },
    );
  }

  const prepared = await prepareComparison(input.prompt, input.modelIds);
  if (!prepared.ok) {
    return Response.json({ message: prepared.message }, { status: 409 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: Parameters<typeof encodeEvent>[0]) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };
      emit({
        type: "comparison_started",
        comparisonId: prepared.comparison.id,
        contestants: prepared.comparison.contestants.map((contestant) => ({
          contestantId: contestant.id,
          attemptId: contestant.attemptId,
          position: contestant.position,
        })),
      });
      void Promise.allSettled(
        prepared.comparison.contestants.map((contestant) =>
          runContestant(contestant, input.prompt, request.signal, emit),
        ),
      ).then(() => {
        emit({
          type: "comparison_completed",
          comparisonId: prepared.comparison.id,
        });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Set-Cookie": `arena_claim_${prepared.comparison.id}=${prepared.claimToken}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${serverEnvironment.nodeEnvironment === "production" ? "; Secure" : ""}`,
      "X-Accel-Buffering": "no",
    },
  });
}
