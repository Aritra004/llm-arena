ALTER TABLE "Comparison"
DROP CONSTRAINT "Comparison_ownerId_fkey";

ALTER TABLE "Comparison"
ADD CONSTRAINT "Comparison_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
