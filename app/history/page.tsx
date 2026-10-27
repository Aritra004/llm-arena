import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { HistoryList } from "@/features/history/history-view";
import { loadHistoryPage } from "@/features/history/history";
import { Icon, type IconName } from "../design-system/icons";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

const primaryActionClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#2cbb2c] bg-(--color-accent) px-4 py-2.5 text-xs! font-semibold! text-(--color-on-accent)! transition-colors hover:bg-(--color-accent-strong)";

const paginationLinkClassName =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-(--color-border) bg-white px-3 py-2 text-xs font-semibold text-(--arena-green)! transition-colors hover:border-[#b9d8b9] hover:bg-[#effbef]";

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | string[] | undefined) {
  value = firstQueryValue(value);
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function HistoryNotice({ notice }: Readonly<{ notice: string | undefined }>) {
  if (notice !== "deleted" && notice !== "delete-failed") return null;

  const deleted = notice === "deleted";

  return (
    <aside
      className={`mb-5 flex items-start gap-3 rounded-xl border p-4 ${deleted ? "border-[#d9e9d9] bg-[#eff7ef] text-(--arena-green)" : "border-[#f2d5d0] bg-(--color-danger-soft) text-(--color-danger)"}`}
      role={deleted ? "status" : "alert"}
    >
      <Icon
        className="mt-0.5 size-[18px]! shrink-0"
        name={deleted ? "check" : "status"}
      />
      <div>
        <strong className="text-xs font-semibold">
          {deleted ? "Comparison removed" : "Comparison not removed"}
        </strong>
        <p className="mt-1! mb-0 text-xs leading-relaxed text-(--color-body)">
          {deleted
            ? "Its private prompt and responses have been permanently erased."
            : "The record was unavailable or no longer belongs to this account."}
        </p>
      </div>
    </aside>
  );
}

function HistoryEmptyState({
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
      aria-labelledby="history-state-title"
    >
      <span className="mb-5 grid size-12 place-items-center rounded-xl border border-[#d9efd9] bg-[#effbef] text-(--arena-green)">
        <Icon className="size-6!" name={icon} />
      </span>
      <h2 id="history-state-title" className="mb-2! text-lg! font-semibold">
        {title}
      </h2>
      <p className="mb-0 max-w-md text-[13px] leading-relaxed text-(--color-muted)">
        {children}
      </p>
      <div className="mt-6">{action}</div>
    </section>
  );
}

export default async function HistoryPage({
  searchParams,
}: PageProps<"/history">) {
  const { userId } = await auth();
  const query = await searchParams;
  const currentPage = pageNumber(query.page);

  return (
    <div className="mx-auto max-w-[1320px] pt-2 pb-10 sm:pt-3">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0! text-[clamp(28px,2.5vw,38px)]! leading-[1.15]! font-semibold tracking-[-1.5px]!">
          Comparison <span className="text-(--arena-green)">history</span>
        </h1>
        <Link className={primaryActionClassName} href="/">
          <Icon className="size-4!" name="arena" />
          Start a comparison
        </Link>
      </header>
      {!userId ? (
        <HistoryEmptyState
          icon="lock"
          title="Sign in to see your history"
          action={
            <SignInButton mode="modal">
              <button className={primaryActionClassName} type="button">
                Sign in to continue
              </button>
            </SignInButton>
          }
        >
          Sign in and vote on a comparison to retain its encrypted prompt and
          responses in your private history.
        </HistoryEmptyState>
      ) : (
        <HistoryContent
          clerkSubject={userId}
          currentPage={currentPage}
          notice={firstQueryValue(query.notice)}
        />
      )}
    </div>
  );
}

async function HistoryContent({
  clerkSubject,
  currentPage,
  notice,
}: Readonly<{
  clerkSubject: string;
  currentPage: number;
  notice: string | undefined;
}>) {
  const history = await loadHistoryPage(clerkSubject, currentPage).catch(
    () => null,
  );

  if (!history) {
    return (
      <HistoryEmptyState
        icon="status"
        title="History is temporarily unavailable"
        action={
          <Link className={primaryActionClassName} href="/history">
            Try again
          </Link>
        }
      >
        Your retained comparisons are unaffected. Try loading them again.
      </HistoryEmptyState>
    );
  }

  if (currentPage > history.totalPages) {
    redirect(`/history?page=${history.totalPages}`);
  }

  if (history.totalCount === 0) {
    return (
      <>
        <HistoryNotice notice={notice} />
        <HistoryEmptyState
          icon="history"
          title="No retained comparisons yet"
          action={
            <Link className={primaryActionClassName} href="/">
              Start a comparison
            </Link>
          }
        >
          Complete a blind comparison and vote to keep it in your private
          history.
        </HistoryEmptyState>
      </>
    );
  }

  return (
    <>
      <HistoryNotice notice={notice} />
      <HistoryList items={history.items} />
      {history.totalPages > 1 ? (
        <nav
          className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
          aria-label="History pages"
        >
          {currentPage > 1 ? (
            <Link
              className={`${paginationLinkClassName} justify-self-start`}
              href={`/history?page=${currentPage - 1}`}
            >
              <Icon className="size-4!" name="arrowLeft" />
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-center text-[11px] text-(--color-muted) tabular-nums">
            Page {currentPage} of {history.totalPages}
          </span>
          {currentPage < history.totalPages ? (
            <Link
              className={`${paginationLinkClassName} justify-self-end`}
              href={`/history?page=${currentPage + 1}`}
            >
              Next
              <Icon className="size-4!" name="chevronRight" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
