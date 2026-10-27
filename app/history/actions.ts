"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eraseHistoryRecord } from "@/infrastructure/database/history";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function deleteHistoryComparison(formData: FormData) {
  const comparisonId = formData.get("comparisonId");
  const { userId } = await auth();

  if (!userId) redirect("/history?notice=sign-in-required");
  if (typeof comparisonId !== "string" || !uuidPattern.test(comparisonId)) {
    redirect("/history?notice=delete-failed");
  }

  const deleted = await eraseHistoryRecord(userId, comparisonId).catch(
    () => false,
  );

  revalidatePath("/history");
  redirect(`/history?notice=${deleted ? "deleted" : "delete-failed"}`);
}
