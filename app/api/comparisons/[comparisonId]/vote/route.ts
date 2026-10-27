import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { castVote } from "@/infrastructure/database/voting";

export async function POST(
  request: Request,
  context: { params: Promise<{ comparisonId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      { message: "Sign in to cast your vote." },
      { status: 401 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Choose a response to vote for." },
      { status: 400 },
    );
  }
  const selectedAttemptId =
    body && typeof body === "object"
      ? Reflect.get(body, "selectedAttemptId")
      : null;
  if (typeof selectedAttemptId !== "string") {
    return Response.json(
      { message: "Choose a response to vote for." },
      { status: 400 },
    );
  }
  const { comparisonId } = await context.params;
  const cookieStore = await cookies();
  const result = await castVote({
    clerkSubject: userId,
    comparisonId,
    selectedAttemptId,
    claimToken: cookieStore.get(`arena_claim_${comparisonId}`)?.value ?? null,
  });
  if (!result.ok) {
    return Response.json(
      { message: result.message },
      { status: result.status },
    );
  }
  return Response.json(result);
}
