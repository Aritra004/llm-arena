# Rationale: design system and interface foundation

## Context

LLM Arena asks developers to compare long model responses, inspect measurements, and make a fair choice. The interface must support focused reading and fast comparison without looking like a generic chat product or turning the vote into a game.

Blind evaluation makes visual neutrality important. Response identities must remain hidden before a vote, while three simultaneous streams still need to be easy to track. Partial failures, loading, empty results, and completed measurements are normal product states rather than exceptional screens.

The private alpha needs a small reusable system before individual screens are built. It must work from mobile through wide desktop layouts, meet the WCAG 2.2 accessibility baseline, respect device preferences, and reuse the Geist fonts and Tailwind setup already in the application.

## Options considered

### Option 1: Calm technical workbench

Use neutral surfaces, crisp type, compact measurement rows, and one restrained brand accent. Treat response content as the primary visual material. (basis: the product intent in `CLAUDE.md`, blind evaluation, and the existing Geist font setup)

**Pros**:

* It supports long reading sessions and close comparison.
* It makes measurements feel credible without overwhelming response content.
* It scales naturally from the Arena into rankings, model details, and history.

**Cons**:

* It relies on typography and spacing for character, so careless implementation could feel plain.
* It offers less spectacle than an explicitly competitive visual direction.

### Option 2: Competitive arena

Use dark dramatic surfaces, strong winner treatments, and energetic motion to emphasize competition. (basis: common tournament and ranking interfaces)

**Pros**:

* The comparison and voting mechanic is immediately legible.
* Strong moments of feedback can make voting feel rewarding.

**Cons**:

* Competition cues can bias a careful evaluation and make serious measurements feel secondary.
* Dramatic effects compete with long response content and can tire users.

### Option 3: Research laboratory

Use a nearly monochrome, table led interface with high information density and minimal brand expression. (basis: analytical tools and research dashboards)

**Pros**:

* It presents measurements efficiently.
* Its restraint supports perceived neutrality.

**Cons**:

* Dense layouts are harder to use on mobile and for less experienced developers.
* The product can feel like an internal dashboard rather than an inviting evaluation tool.

## Rationale

The calm workbench direction fits a product where people read long answers and judge evidence. Vermilion gives the product a clear signature without coloring every surface, while the three restrained response identifiers improve orientation without giving any contestant more visual weight.

The system reuses the fonts and styling foundation already present in the application. A shared shell and small component vocabulary establish consistency before screen behavior is built, while system controlled light and dark appearances respect user preference without introducing another setting during the alpha.

## References

**Project sources**:

* `CLAUDE.md`, product intent, accessibility baseline, safe error rules, measurement requirements, and shared styling rules
* `docs/scope/scope.md`, planned screens and feature boundaries
* `docs/specs/0001-application-architecture.md`, independent streams, partial failures, and safe user states
* Existing `app/layout.tsx` and `app/globals.css`, Geist fonts and Tailwind foundation

**Practices and standards**:

* WCAG 2.2 AA contrast and interaction guidance
* Blind evaluation, equal visual treatment before identity reveal
* Progressive disclosure for detailed measurement context
* Responsive reflow and content preservation at browser zoom
