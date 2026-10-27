import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { ResponseAttemptStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function claimMatches(stored: Uint8Array | null, token: string | null) {
  if (!stored || !token) return false;
  const candidate = createHash("sha256").update(token).digest();
  return (
    stored.length === candidate.length && timingSafeEqual(stored, candidate)
  );
}

export async function castVote(input: {
  readonly clerkSubject: string;
  readonly comparisonId: string;
  readonly selectedAttemptId: string;
  readonly claimToken: string | null;
}) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: { clerkSubject: input.clerkSubject },
      update: {},
      create: { clerkSubject: input.clerkSubject },
      select: { id: true },
    });
    const comparison = await transaction.comparison.findUnique({
      where: { id: input.comparisonId },
      select: {
        ownerId: true,
        claimTokenHash: true,
        claimExpiresAt: true,
        vote: {
          select: {
            id: true,
            userId: true,
            revisions: {
              select: { sequence: true },
              orderBy: { sequence: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    if (!comparison)
      return {
        ok: false,
        status: 404,
        message: "This comparison could not be found.",
      } as const;
    const isOwner = comparison.ownerId === user.id;
    const canClaim =
      comparison.ownerId === null &&
      comparison.claimExpiresAt !== null &&
      comparison.claimExpiresAt > new Date() &&
      claimMatches(comparison.claimTokenHash, input.claimToken);
    if (!isOwner && !canClaim) {
      return {
        ok: false,
        status: 403,
        message: "This comparison can no longer be claimed.",
      } as const;
    }
    const attempt = await transaction.responseAttempt.findFirst({
      where: {
        id: input.selectedAttemptId,
        comparisonId: input.comparisonId,
        status: ResponseAttemptStatus.SUCCEEDED,
      },
      select: { id: true },
    });
    if (!attempt)
      return {
        ok: false,
        status: 409,
        message: "Choose a completed response.",
      } as const;

    if (canClaim) {
      await transaction.comparison.update({
        where: { id: input.comparisonId },
        data: { ownerId: user.id, claimTokenHash: null, claimExpiresAt: null },
      });
    }

    const revisionId = randomUUID();
    if (comparison.vote) {
      if (comparison.vote.userId !== user.id) {
        return {
          ok: false,
          status: 403,
          message: "This vote belongs to another user.",
        } as const;
      }
      const sequence = (comparison.vote.revisions[0]?.sequence ?? 0) + 1;
      await transaction.voteRevision.create({
        data: {
          id: revisionId,
          voteId: comparison.vote.id,
          comparisonId: input.comparisonId,
          selectedAttemptId: input.selectedAttemptId,
          sequence,
        },
      });
      await transaction.vote.update({
        where: { id: comparison.vote.id },
        data: { currentRevisionId: revisionId },
      });
    } else {
      const voteId = randomUUID();
      await transaction.$executeRaw`
        SET CONSTRAINTS "VoteRevision_voteId_comparisonId_fkey", "Vote_currentRevisionId_id_comparisonId_fkey" DEFERRED
      `;
      await transaction.vote.create({
        data: {
          id: voteId,
          comparisonId: input.comparisonId,
          userId: user.id,
          currentRevisionId: revisionId,
        },
      });
      await transaction.voteRevision.create({
        data: {
          id: revisionId,
          voteId,
          comparisonId: input.comparisonId,
          selectedAttemptId: input.selectedAttemptId,
          sequence: 1,
        },
      });
    }
    await transaction.comparison.update({
      where: { id: input.comparisonId },
      data: { revealedAt: new Date() },
    });
    const contestants = await transaction.contestant.findMany({
      where: { comparisonId: input.comparisonId },
      orderBy: { displayPosition: "asc" },
      select: {
        id: true,
        modelVersion: {
          select: { versionLabel: true, model: { select: { name: true } } },
        },
      },
    });
    return {
      ok: true,
      reveal: contestants.map((contestant) => ({
        contestantId: contestant.id,
        modelName: contestant.modelVersion.model.name,
        versionLabel: contestant.modelVersion.versionLabel,
      })),
    } as const;
  });
}
