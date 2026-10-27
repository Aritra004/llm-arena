"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ComparisonEvent } from "@/features/comparisons/contracts";
import { Icon } from "../design-system/icons";
import { ModelPicker } from "./model-picker";
import {
  ResponseCard,
  ResponsePlaceholder,
  type CardState,
} from "./response-card";
import type { PickerModel } from "./model-catalog";

function updateCard(
  cards: readonly CardState[],
  attemptId: string,
  update: (card: CardState) => CardState,
) {
  return cards.map((card) =>
    card.attemptId === attemptId ? update(card) : card,
  );
}

export function ArenaPreview({
  catalogError = false,
  initialModelIds = [],
  models,
}: Readonly<{
  catalogError?: boolean;
  initialModelIds?: readonly string[];
  models: readonly PickerModel[];
}>) {
  const { isSignedIn } = useUser();
  const [selectedModels, setSelectedModels] = useState<readonly string[]>(
    () => {
      const selectableModels = models.filter(
        (model) => model.availability !== "UNAVAILABLE",
      );
      const selectableIds = new Set(selectableModels.map((model) => model.id));
      const requestedIds = [...new Set(initialModelIds)]
        .filter((modelId) => selectableIds.has(modelId))
        .slice(0, 3);

      return requestedIds.length > 0
        ? requestedIds
        : selectableModels.slice(0, 3).map((model) => model.id);
    },
  );
  const [selectionMessage, setSelectionMessage] = useState("");
  const [cards, setCards] = useState<readonly CardState[]>([]);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const modelDialogRef = useRef<HTMLDialogElement>(null);

  function toggleModel(modelId: string) {
    setSelectedModels((current) => {
      if (current.includes(modelId)) {
        if (current.length === 1) {
          setSelectionMessage("Keep at least one model selected.");
          return current;
        }
        setSelectionMessage("");
        return current.filter((id) => id !== modelId);
      }
      if (current.length === 3) {
        setSelectionMessage("You can compare up to three models at once.");
        return current;
      }
      setSelectionMessage("");
      return [...current, modelId];
    });
  }

  function applyEvent(event: ComparisonEvent) {
    if (event.type === "comparison_started") {
      setComparisonId(event.comparisonId);
      setCards(
        event.contestants.map((contestant) => ({
          ...contestant,
          body: "",
          state: "pending",
          error: null,
          latency: null,
          tokens: null,
          modelName: null,
          versionLabel: null,
        })),
      );
    } else if (event.type === "attempt_started") {
      setCards((current) =>
        updateCard(current, event.attemptId, (card) => ({
          ...card,
          state: "streaming",
        })),
      );
    } else if (event.type === "content_delta") {
      setCards((current) =>
        updateCard(current, event.attemptId, (card) => ({
          ...card,
          body: card.body + event.delta,
        })),
      );
    } else if (event.type === "attempt_completed") {
      setCards((current) =>
        updateCard(current, event.attemptId, (card) => ({
          ...card,
          state: "complete",
          latency: event.firstTokenMs ?? event.totalMs,
          tokens: event.outputTokens,
        })),
      );
    } else if (event.type === "attempt_failed") {
      setCards((current) =>
        updateCard(current, event.attemptId, (card) => ({
          ...card,
          state: "failed",
          error: event.message,
        })),
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning || isVoting || selectedModels.length === 0) return;
    if (!prompt.trim()) {
      setMessage("Enter a prompt to compare.");
      return;
    }
    setIsRunning(true);
    setCards([]);
    setComparisonId(null);
    setMessage("");
    let interruption =
      "The connection ended before this response finished. Try a new comparison.";
    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelIds: selectedModels }),
      });
      if (!response.ok || !response.body) {
        const body: unknown = await response.json().catch(() => null);
        const detail =
          body && typeof body === "object"
            ? Reflect.get(body, "message")
            : null;
        throw new Error(
          typeof detail === "string"
            ? detail
            : "The comparison could not start.",
        );
      }
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let pending = "";
      let didStartComparison = false;
      const consumeLine = (line: string) => {
        const comparisonEvent = JSON.parse(line) as ComparisonEvent;
        if (comparisonEvent.type === "comparison_started")
          didStartComparison = true;
        applyEvent(comparisonEvent);
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += value;
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        lines.filter((line) => line.trim()).forEach(consumeLine);
      }
      if (pending.trim()) consumeLine(pending);
      if (!didStartComparison)
        throw new Error("No responses were received. Please try again.");
    } catch (error: unknown) {
      interruption =
        error instanceof Error
          ? error.message
          : "The comparison could not finish.";
      setMessage(interruption);
    } finally {
      setCards((current) =>
        current.map((card) =>
          card.state === "pending" || card.state === "streaming"
            ? { ...card, state: "failed", error: interruption }
            : card,
        ),
      );
      setIsRunning(false);
    }
  }

  async function handleVote(attemptId: string) {
    if (!comparisonId || isVoting || isRunning) return;
    setIsVoting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/comparisons/${comparisonId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAttemptId: attemptId }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !body || typeof body !== "object")
        throw new Error(
          body &&
            typeof body === "object" &&
            typeof Reflect.get(body, "message") === "string"
            ? String(Reflect.get(body, "message"))
            : "Your vote could not be recorded.",
        );
      const reveal = Reflect.get(body, "reveal");
      if (Array.isArray(reveal))
        setCards((current) =>
          current.map((card) => {
            const identity = reveal.find(
              (item: unknown) =>
                item &&
                typeof item === "object" &&
                Reflect.get(item, "contestantId") === card.contestantId,
            );
            return identity && typeof identity === "object"
              ? {
                  ...card,
                  modelName: String(Reflect.get(identity, "modelName")),
                  versionLabel: String(Reflect.get(identity, "versionLabel")),
                }
              : card;
          }),
        );
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your vote could not be recorded.",
      );
    } finally {
      setIsVoting(false);
    }
  }

  const isTerminal =
    cards.length > 0 &&
    cards.every((card) => card.state === "complete" || card.state === "failed");
  const revealed = cards.some((card) => card.modelName);
  const responseStatus = isRunning
    ? cards.length === 0
      ? "Preparing responses…"
      : "Models are thinking…"
    : isTerminal;
  const pickerProps = {
    models,
    selectedModels,
    isRunning,
    catalogError,
    selectionMessage,
    onToggle: toggleModel,
  };
  const suggestions = [
    {
      label: "Explain a concept",
      icon: "spark" as const,
      prompt:
        "Explain how large language models work using a simple, everyday analogy.",
    },
    {
      label: "Write some code",
      icon: "code" as const,
      prompt:
        "Write a TypeScript function that groups an array of objects by a given key. Explain your approach.",
    },
    {
      label: "Think creatively",
      icon: "message" as const,
      prompt:
        "Suggest five unexpected ways to make a daily commute more enjoyable. Keep each idea practical.",
    },
  ];

  return (
    <div className="arena-workspace">
      <section className="arena-compose" aria-labelledby="arena-title">
        <header className="arena-heading">
          <div>
            <h1 id="arena-title">
              Let the best answer win<span>.</span>
            </h1>
          </div>
          <button
            className="arena-model-toggle"
            type="button"
            onClick={() => modelDialogRef.current?.showModal()}
            aria-haspopup="dialog"
          >
            <Icon name="models" /> Models <span>{selectedModels.length}/3</span>
          </button>
        </header>
        <form
          className="arena-prompt"
          aria-label="New comparison"
          onSubmit={handleSubmit}
        >
          <label className="arena-prompt-label" htmlFor="arena-prompt">
            <Icon name="message" /> Your prompt
          </label>
          <textarea
            id="arena-prompt"
            ref={promptRef}
            name="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.ctrlKey || event.metaKey) &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={20000}
            disabled={isRunning}
            placeholder="What would you like to put to the test?"
            aria-describedby="arena-prompt-hint"
          />
          <div className="arena-prompt-actions">
            <span id="arena-prompt-hint">
              <Icon name="lock" /> Your prompts stay private
            </span>
            <div>
              <span className="arena-shortcut">Ctrl / ⌘ + Enter</span>
              <button
                className="button button-primary"
                type="submit"
                disabled={
                  isRunning ||
                  isVoting ||
                  selectedModels.length === 0 ||
                  !prompt.trim()
                }
              >
                {isRunning ? (
                  <>
                    <span className="arena-spinner" aria-hidden="true" />{" "}
                    Comparing…
                  </>
                ) : (
                  <>
                    Compare responses <Icon name="arrowUp" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
        <div className="arena-suggestions" aria-label="Prompt ideas">
          <span>Try a prompt</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              disabled={isRunning}
              onClick={() => {
                setPrompt(suggestion.prompt);
                promptRef.current?.focus();
              }}
            >
              <Icon name={suggestion.icon} />
              {suggestion.label}
            </button>
          ))}
        </div>
      </section>

      <aside className="arena-model-sidebar" aria-label="Model selection">
        <ModelPicker {...pickerProps} />
      </aside>
      <dialog
        ref={modelDialogRef}
        className="arena-model-dialog"
        aria-label="Choose models"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="arena-model-dialog-content">
          <button
            className="arena-dialog-close"
            type="button"
            aria-label="Close model selection"
            onClick={() => modelDialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
          <ModelPicker {...pickerProps} />
        </div>
      </dialog>

      <section className="arena-responses" aria-labelledby="comparison-title">
        <header className="arena-response-toolbar">
          <div>
            <h2 id="comparison-title">The responses</h2>
            {revealed && (
              <span className="arena-blind-badge">
                <Icon name="check" /> Revealed
              </span>
            )}
          </div>
          <p className="arena-response-status" role="status">
            <span
              className={isRunning ? "arena-live-dot" : "arena-status-dot"}
            />
            {responseStatus}
          </p>
        </header>
        {message && (
          <p className="arena-notice" role="status">
            {message}
          </p>
        )}
        <div
          className="arena-response-grid"
          style={
            {
              "--response-count": Math.max(
                cards.length || selectedModels.length,
                1,
              ),
            } as React.CSSProperties
          }
          tabIndex={0}
          aria-label="Responses; scroll horizontally to compare"
        >
          {cards.length > 0
            ? cards.map((card) => (
                <ResponseCard
                  key={card.attemptId}
                  card={card}
                  canVote={Boolean(isSignedIn) && isTerminal && !isRunning}
                  isVoting={isVoting}
                  onVote={() => void handleVote(card.attemptId)}
                />
              ))
            : Array.from(
                { length: Math.max(selectedModels.length, 1) },
                (_, index) => (
                  <ResponsePlaceholder
                    key={index}
                    position={index + 1}
                    preparing={isRunning}
                  />
                ),
              )}
        </div>
        {(revealed || (!isSignedIn && isTerminal)) && (
          <div className="arena-response-note">
            {!isSignedIn && isTerminal && (
              <SignInButton mode="modal">
                <button type="button" className="arena-sign-in">
                  Sign in to vote <Icon name="chevronRight" />
                </button>
              </SignInButton>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
