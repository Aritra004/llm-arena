import "server-only";

import { cache } from "react";
import {
  buildModelCatalog,
  type CatalogModel,
} from "@/features/models/model-catalog";
import { getLeaderboardEvidence } from "@/infrastructure/database/leaderboard";
import { getModelCatalogRecords } from "@/infrastructure/database/models";

export const loadModelCatalog = cache(
  async function loadModelCatalog(): Promise<readonly CatalogModel[]> {
    const [records, evidence] = await Promise.all([
      getModelCatalogRecords(),
      getLeaderboardEvidence(),
    ]);

    return buildModelCatalog(records, evidence.models);
  },
);
