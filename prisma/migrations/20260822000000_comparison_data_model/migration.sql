CREATE TYPE "ModelAvailability" AS ENUM ('AVAILABLE', 'DEGRADED', 'UNAVAILABLE');
CREATE TYPE "ResponseAttemptStatus" AS ENUM ('PENDING', 'STREAMING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "ResponseErrorCategory" AS ENUM ('UNAVAILABLE', 'TIMED_OUT', 'RATE_LIMITED', 'CANCELLED', 'INTERRUPTED');

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "clerkSubject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "availability" "ModelAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelVersion" (
    "id" UUID NOT NULL,
    "modelId" TEXT NOT NULL,
    "providerModelId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "capabilities" JSONB NOT NULL,
    "contextWindowTokens" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ModelVersion_contextWindowTokens_check" CHECK ("contextWindowTokens" IS NULL OR "contextWindowTokens" > 0),
    CONSTRAINT "ModelVersion_effectiveDates_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);

CREATE TABLE "Comparison" (
    "id" UUID NOT NULL,
    "promptCiphertext" BYTEA,
    "promptKeyVersion" TEXT,
    "ownerId" UUID,
    "claimTokenHash" BYTEA,
    "claimExpiresAt" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),
    "contentDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Comparison_promptEnvelope_check" CHECK (("promptCiphertext" IS NULL) = ("promptKeyVersion" IS NULL)),
    CONSTRAINT "Comparison_claimEnvelope_check" CHECK (("claimTokenHash" IS NULL) = ("claimExpiresAt" IS NULL)),
    CONSTRAINT "Comparison_ownership_check" CHECK ("ownerId" IS NULL OR "claimTokenHash" IS NULL),
    CONSTRAINT "Comparison_contentDeletion_check" CHECK ("contentDeletedAt" IS NULL OR "promptCiphertext" IS NULL)
);

CREATE TABLE "Contestant" (
    "id" UUID NOT NULL,
    "comparisonId" UUID NOT NULL,
    "modelVersionId" UUID NOT NULL,
    "displayPosition" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contestant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Contestant_displayPosition_check" CHECK ("displayPosition" BETWEEN 1 AND 3)
);

CREATE TABLE "ResponseAttempt" (
    "id" UUID NOT NULL,
    "contestantId" UUID NOT NULL,
    "comparisonId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "responseCiphertext" BYTEA,
    "responseKeyVersion" TEXT,
    "status" "ResponseAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "errorCategory" "ResponseErrorCategory",
    "startedAt" TIMESTAMP(3) NOT NULL,
    "firstTokenAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsdTenThousandths" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResponseAttempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResponseAttempt_attemptNumber_check" CHECK ("attemptNumber" > 0),
    CONSTRAINT "ResponseAttempt_responseEnvelope_check" CHECK (("responseCiphertext" IS NULL) = ("responseKeyVersion" IS NULL)),
    CONSTRAINT "ResponseAttempt_tokenCounts_check" CHECK (("inputTokens" IS NULL OR "inputTokens" >= 0) AND ("outputTokens" IS NULL OR "outputTokens" >= 0)),
    CONSTRAINT "ResponseAttempt_freeTierCost_check" CHECK ("costUsdTenThousandths" = 0),
    CONSTRAINT "ResponseAttempt_timestamps_check" CHECK (("firstTokenAt" IS NULL OR "firstTokenAt" >= "startedAt") AND ("completedAt" IS NULL OR "completedAt" >= "startedAt")),
    CONSTRAINT "ResponseAttempt_terminalState_check" CHECK (
        ("status" IN ('PENDING', 'STREAMING') AND "completedAt" IS NULL AND "errorCategory" IS NULL)
        OR ("status" = 'SUCCEEDED' AND "completedAt" IS NOT NULL AND "errorCategory" IS NULL)
        OR ("status" IN ('FAILED', 'CANCELLED') AND "completedAt" IS NOT NULL AND "errorCategory" IS NOT NULL)
    )
);

CREATE TABLE "Vote" (
    "id" UUID NOT NULL,
    "comparisonId" UUID NOT NULL,
    "userId" UUID,
    "currentRevisionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoteRevision" (
    "id" UUID NOT NULL,
    "voteId" UUID NOT NULL,
    "comparisonId" UUID NOT NULL,
    "selectedAttemptId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoteRevision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VoteRevision_sequence_check" CHECK ("sequence" > 0)
);

CREATE UNIQUE INDEX "User_clerkSubject_key" ON "User"("clerkSubject");
CREATE INDEX "ModelVersion_modelId_idx" ON "ModelVersion"("modelId");
CREATE UNIQUE INDEX "ModelVersion_modelId_versionLabel_key" ON "ModelVersion"("modelId", "versionLabel");
CREATE UNIQUE INDEX "Comparison_claimTokenHash_key" ON "Comparison"("claimTokenHash");
CREATE INDEX "Comparison_ownerId_createdAt_idx" ON "Comparison"("ownerId", "createdAt" DESC);
CREATE INDEX "Comparison_claimExpiresAt_idx" ON "Comparison"("claimExpiresAt");
CREATE INDEX "Contestant_modelVersionId_idx" ON "Contestant"("modelVersionId");
CREATE UNIQUE INDEX "Contestant_comparisonId_displayPosition_key" ON "Contestant"("comparisonId", "displayPosition");
CREATE UNIQUE INDEX "Contestant_comparisonId_modelVersionId_key" ON "Contestant"("comparisonId", "modelVersionId");
CREATE UNIQUE INDEX "Contestant_id_comparisonId_key" ON "Contestant"("id", "comparisonId");
CREATE INDEX "ResponseAttempt_comparisonId_status_idx" ON "ResponseAttempt"("comparisonId", "status");
CREATE UNIQUE INDEX "ResponseAttempt_contestantId_attemptNumber_key" ON "ResponseAttempt"("contestantId", "attemptNumber");
CREATE UNIQUE INDEX "ResponseAttempt_id_comparisonId_key" ON "ResponseAttempt"("id", "comparisonId");
CREATE UNIQUE INDEX "Vote_comparisonId_key" ON "Vote"("comparisonId");
CREATE UNIQUE INDEX "Vote_currentRevisionId_key" ON "Vote"("currentRevisionId");
CREATE INDEX "Vote_userId_updatedAt_idx" ON "Vote"("userId", "updatedAt" DESC);
CREATE UNIQUE INDEX "Vote_id_comparisonId_key" ON "Vote"("id", "comparisonId");
CREATE UNIQUE INDEX "Vote_currentRevisionId_id_comparisonId_key" ON "Vote"("currentRevisionId", "id", "comparisonId");
CREATE INDEX "VoteRevision_selectedAttemptId_idx" ON "VoteRevision"("selectedAttemptId");
CREATE UNIQUE INDEX "VoteRevision_voteId_sequence_key" ON "VoteRevision"("voteId", "sequence");
CREATE UNIQUE INDEX "VoteRevision_id_voteId_comparisonId_key" ON "VoteRevision"("id", "voteId", "comparisonId");

ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contestant" ADD CONSTRAINT "Contestant_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contestant" ADD CONSTRAINT "Contestant_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResponseAttempt" ADD CONSTRAINT "ResponseAttempt_contestantId_comparisonId_fkey" FOREIGN KEY ("contestantId", "comparisonId") REFERENCES "Contestant"("id", "comparisonId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResponseAttempt" ADD CONSTRAINT "ResponseAttempt_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VoteRevision" ADD CONSTRAINT "VoteRevision_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VoteRevision" ADD CONSTRAINT "VoteRevision_selectedAttemptId_comparisonId_fkey" FOREIGN KEY ("selectedAttemptId", "comparisonId") REFERENCES "ResponseAttempt"("id", "comparisonId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VoteRevision" ADD CONSTRAINT "VoteRevision_voteId_comparisonId_fkey" FOREIGN KEY ("voteId", "comparisonId") REFERENCES "Vote"("id", "comparisonId") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_currentRevisionId_id_comparisonId_fkey" FOREIGN KEY ("currentRevisionId", "id", "comparisonId") REFERENCES "VoteRevision"("id", "voteId", "comparisonId") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION "enforce_successful_vote_attempt"() RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "ResponseAttempt"
        WHERE "id" = NEW."selectedAttemptId"
          AND "comparisonId" = NEW."comparisonId"
          AND "status" = 'SUCCEEDED'
    ) THEN
        RAISE EXCEPTION 'A vote revision must select a successful attempt from the same comparison';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VoteRevision_successfulAttempt_trigger"
BEFORE INSERT OR UPDATE ON "VoteRevision"
FOR EACH ROW EXECUTE FUNCTION "enforce_successful_vote_attempt"();

CREATE FUNCTION "prevent_vote_revision_mutation"() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Vote revisions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "VoteRevision_immutable_trigger"
BEFORE UPDATE OR DELETE ON "VoteRevision"
FOR EACH ROW EXECUTE FUNCTION "prevent_vote_revision_mutation"();
