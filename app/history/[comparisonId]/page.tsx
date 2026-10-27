import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/app/design-system/icons";
import { HistoryDeleteDialog } from "@/app/history/history-delete-dialog";
import { loadHistoryDetail } from "@/features/history/history";
import { HistoryDetailView } from "@/features/history/history-view";

export const metadata: Metadata = { title: "Saved comparison" };
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeStyle: "short",
});

const primaryActionClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#2cbb2c] bg-(--color-accent) px-4 py-2.5 text-xs! font-semibold! text-(--color-on-accent)! transition-colors hover:bg-(--color-accent-strong)";

function HistoryDetailFrame({
  children,
  createdAt,
  action,
}: Readonly<{
  children: ReactNode;
  createdAt?: Date;
  action?: ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-[1320px] pt-2 pb-10 sm:pt-3">
      <Link
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-medium text-(--arena-green)! hover:underline hover:underline-offset-4"
        href="/history"
      >
        <Icon className="size-4!" name="arrowLeft" />
        Back to history
      </Link>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0! text-[clamp(28px,2.5vw,38px)]! leading-[1.15]! font-semibold tracking-[-1.5px]!">
            Saved <span className="text-(--arena-green)">comparison</span>
          </h1>
          {createdAt ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] leading-relaxed text-(--color-muted)">
              <span>
                Created{" "}
                <time dateTime={createdAt.toISOString()}>
                  {dateFormatter.format(createdAt)}
                </time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5!" name="lock" />
                Encrypted at rest
              </span>
            </div>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

function HistoryDetailState({
  icon,
  title,
  children,
  action,
}: Readonly<{
  icon: IconName;
  title: string;
  children: ReactNode;
  action: ReactNode;
}>) {
  return (
    <section
      className="flex min-h-80 flex-col items-center justify-center rounded-[13px] border border-(--color-border) bg-white px-6 py-12 text-center"
      aria-labelledby="comparison-state-title"
    >
      <span className="mb-5 grid size-12 place-items-center rounded-xl border border-[#d9efd9] bg-[#effbef] text-(--arena-green)">
        <Icon className="size-6!" name={icon} />
      </span>
      <h2 id="comparison-state-title" className="mb-2! text-lg! font-semibold">
        {title}
      </h2>
      <p className="mb-0 max-w-md text-[13px] leading-relaxed text-(--color-muted)">
        {children}
      </p>
      <div className="mt-6">{action}</div>
    </section>
  );
}

export default async function HistoryDetailPage({
  params,
}: PageProps<"/history/[comparisonId]">) {
  const { userId } = await auth();

  if (!userId) {
    return (
      <HistoryDetailFrame>
        <HistoryDetailState
          icon="lock"
          title="Sign in to open this comparison"
          action={
            <SignInButton mode="modal">
              <button className={primaryActionClassName} type="button">
                Sign in to continue
              </button>
            </SignInButton>
          }
        >
          Sign in with the account that owns this comparison to see its saved
          prompt and responses.
        </HistoryDetailState>
      </HistoryDetailFrame>
    );
  }

  const { comparisonId } = await params;
  const comparison = await loadHistoryDetail(userId, comparisonId).catch(
    () => undefined,
  );

  if (comparison === undefined) {
    return (
      <HistoryDetailFrame>
        <HistoryDetailState
          icon="status"
          title="This comparison is temporarily unavailable"
          action={
            <Link
              className={primaryActionClassName}
              href={`/history/${comparisonId}`}
            >
              Try again
            </Link>
          }
        >
          Your retained comparison is unaffected. Try loading it again.
        </HistoryDetailState>
      </HistoryDetailFrame>
    );
  }

  if (comparison === null) notFound();

  return (
    <HistoryDetailFrame
      createdAt={comparison.createdAt}
      action={
        <HistoryDeleteDialog
          comparisonId={comparison.id}
          promptPreview={comparison.prompt}
        />
      }
    >
      <HistoryDetailView comparison={comparison} />
    </HistoryDetailFrame>
  );
}
