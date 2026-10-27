import { detectBot, slidingWindow } from "@arcjet/next";
import { NextResponse } from "next/server";

import aj from "../../../lib/arcjet";

const protectedRoute = aj
  .withRule(
    detectBot({
      mode: "LIVE",
      deny: ["CATEGORY:AI", "CATEGORY:BOTNET"],
    }),
  )
  .withRule(
    slidingWindow({
      mode: "LIVE",
      interval: "1m",
      max: 5,
    }),
  );

export async function GET(request: Request) {
  const decision = await protectedRoute.protect(request);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (decision.isErrored()) {
    console.error("Arcjet protection failed open", decision.reason);
  }

  return NextResponse.json({ protected: true });
}
