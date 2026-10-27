"use client";

import { useId, useRef } from "react";
import { MINIMUM_RATINGS } from "./leaderboard";
import styles from "./methodology-dialog.module.css";

export function MethodologyDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        className={styles.trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5" />
          <path d="M12 16.5h.01" />
        </svg>
        How it works
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;

          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            event.currentTarget.close();
          }
        }}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Behind the leaderboard</p>
            <h2 id={titleId}>Ranking methodology</h2>
          </div>
          <button
            className={styles.close}
            type="button"
            aria-label="Close methodology"
            onClick={() => dialogRef.current?.close()}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <ol className={styles.steps}>
          <li>
            <span className={styles.number} aria-hidden="true">
              01
            </span>
            <div>
              <h3>One current vote</h3>
              <p>
                A comparison contributes only its latest verified vote, so a
                changed choice is never counted twice.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.number} aria-hidden="true">
              02
            </span>
            <div>
              <h3>Completed appearances</h3>
              <p>
                Win record is wins divided by rated appearances with a
                successful response. Models rank after {MINIMUM_RATINGS} such
                ratings.
              </p>
            </div>
          </li>
          <li>
            <span className={styles.number} aria-hidden="true">
              03
            </span>
            <div>
              <h3>Server-measured speed</h3>
              <p>
                Latency is the median time to first token from the latest
                successful attempt for each appearance. Cost is averaged across
                those successful calls.
              </p>
            </div>
          </li>
        </ol>
      </dialog>
    </>
  );
}
