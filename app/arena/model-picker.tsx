"use client";

import { useId, useState } from "react";
import type { PickerModel } from "./model-catalog";
import styles from "./model-picker.module.css";

type ModelPickerProps = Readonly<{
  models: readonly PickerModel[];
  selectedModels: readonly string[];
  isRunning: boolean;
  catalogError: boolean;
  selectionMessage: string;
  onToggle: (modelId: string) => void;
}>;

const contextFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function modelInitials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/);
  return words.length > 1
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function ModelPicker({
  models,
  selectedModels,
  isRunning,
  catalogError,
  selectionMessage,
  onToggle,
}: ModelPickerProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const filteredModels = models.filter((model) =>
    `${model.name} ${model.description}`.toLowerCase().includes(search),
  );

  return (
    <section className={styles.picker} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <div className={styles.headingRow}>
          <h2 id={`${id}-title`}>Models</h2>
          <span
            className={styles.count}
            aria-label={`${selectedModels.length} of 3 models selected`}
          >
            {selectedModels.length} <span>/ 3</span>
          </span>
        </div>
      </header>

      <div className={styles.search}>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4 4" strokeLinecap="round" />
        </svg>
        <label className={styles.visuallyHidden} htmlFor={`${id}-search`}>
          Search models
        </label>
        <input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search models"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <span className={styles.visuallyHidden} aria-live="polite">
        {filteredModels.length} models
      </span>

      {catalogError ? (
        <p className={styles.catalogError} role="status">
          The model library could not load. Refresh to try again.
        </p>
      ) : null}

      <div className={styles.scrollArea}>
        {filteredModels.length > 0 ? (
          <ul className={styles.list} aria-label="Choose models to compare">
            {filteredModels.map((model) => {
              const selected = selectedModels.includes(model.id);
              const unavailable = model.availability === "UNAVAILABLE";
              const degraded = model.availability === "DEGRADED";
              const availability = unavailable
                ? "Unavailable"
                : degraded
                  ? "Limited availability"
                  : "Available";

              return (
                <li key={model.id}>
                  <label
                    className={styles.model}
                    data-selected={selected}
                    data-disabled={isRunning || unavailable}
                    title={
                      model.description
                        ? `${model.name}: ${model.description}`
                        : model.name
                    }
                  >
                    <input
                      className={styles.checkbox}
                      type="checkbox"
                      checked={selected}
                      disabled={isRunning || unavailable}
                      onChange={() => onToggle(model.id)}
                      aria-label={model.name}
                      aria-describedby={`${id}-${model.id}-details`}
                    />
                    <span className={styles.initials} aria-hidden="true">
                      {modelInitials(model.name)}
                    </span>
                    <span className={styles.modelDetails}>
                      <span className={styles.modelName}>{model.name}</span>
                      <span
                        className={styles.metadata}
                        id={`${id}-${model.id}-details`}
                      >
                        <span
                          className={styles.availability}
                          data-availability={model.availability}
                        >
                          <span className={styles.dot} aria-hidden="true" />
                          {availability}
                        </span>
                        {model.contextWindowTokens !== null ? (
                          <span className={styles.context}>
                            {contextFormatter.format(model.contextWindowTokens)}
                            {" context"}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className={styles.checkmark} aria-hidden="true">
                      {selected ? (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="m3.5 8 3 3 6-6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.empty}>
            <strong>
              {models.length === 0 ? "No models available" : "No models found"}
            </strong>
            <p>
              {models.length === 0
                ? "The model library will appear here when it is available."
                : "Try a different model name or keyword."}
            </p>
            {models.length > 0 ? (
              <button type="button" onClick={() => setQuery("")}>
                Clear search
              </button>
            ) : null}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <p
          className={styles.selectionMessage}
          data-warning={Boolean(selectionMessage)}
          aria-live="polite"
          aria-atomic="true"
        >
          {selectionMessage ||
            (isRunning
              ? "Your models are working on a response."
              : "Select up to 3 models for each comparison.")}
        </p>
      </footer>
    </section>
  );
}
