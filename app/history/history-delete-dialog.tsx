"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/app/design-system/icons";
import { deleteHistoryComparison } from "./actions";

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#a52319] bg-[#a52319] px-4 py-2.5 text-xs! font-semibold! text-white! transition-colors hover:bg-[#861d15] disabled:cursor-wait disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      <Icon className="size-4!" name="trash" />
      {pending ? "Removing..." : "Remove comparison"}
    </button>
  );
}

export function HistoryDeleteDialog({
  comparisonId,
  promptPreview,
}: Readonly<{ comparisonId: string; promptPreview: string }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-3.5 py-2.5 text-xs! font-medium! text-(--color-success)! transition-colors hover:border-(--color-success) hover:bg-(--color-success-soft)"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon className="size-4!" name="trash" />
        Remove
      </button>
      <dialog
        className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-[13px] border border-(--color-border) bg-(--color-surface) p-0 text-(--color-ink)! shadow-2xl backdrop:bg-black/45"
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <form className="p-5 sm:p-6" action={deleteHistoryComparison}>
          <input type="hidden" name="comparisonId" value={comparisonId} />
          <span
            className="mb-5 grid size-11 place-items-center rounded-xl bg-(--color-danger-soft) text-(--color-danger)"
            aria-hidden="true"
          >
            <Icon className="size-5!" name="trash" />
          </span>
          <h2
            className="mb-2! text-lg! leading-snug! font-semibold tracking-[-0.4px]!"
            id={titleId}
          >
            Remove this comparison?
          </h2>
          <p
            className="mb-0 text-[13px] leading-relaxed text-(--color-body)"
            id={descriptionId}
          >
            Its prompt and responses will be permanently erased from your
            history. The anonymous vote will remain in aggregate rankings.
          </p>
          <blockquote className="my-5 max-h-28 overflow-y-auto rounded-lg border border-(--color-border) bg-(--color-canvas) p-4 text-xs leading-relaxed text-(--color-muted) wrap-anywhere">
            {promptPreview}
          </blockquote>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-2.5 text-xs! font-medium! text-(--color-body)! transition-colors hover:bg-(--color-surface-muted)"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <DeleteSubmitButton />
          </div>
        </form>
      </dialog>
    </>
  );
}
