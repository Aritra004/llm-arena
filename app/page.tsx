import { ArenaPreview } from "./arena/arena-preview";
import { listPickerModels } from "./arena/model-catalog";

export const dynamic = "force-dynamic";

type ArenaPageProps = Readonly<{
  searchParams: Promise<{ models?: string | readonly string[] }>;
}>;

export default async function Home({ searchParams }: ArenaPageProps) {
  const { models: requestedModels } = await searchParams;
  const initialModelIds = requestedModels
    ? Array.isArray(requestedModels)
      ? requestedModels
      : [requestedModels]
    : [];
  let catalogError = false;
  const models = await listPickerModels().catch(() => {
    catalogError = true;
    return [];
  });

  return (
    <div className="page-arena">
      <ArenaPreview
        catalogError={catalogError}
        initialModelIds={initialModelIds}
        models={models}
      />
    </div>
  );
}
