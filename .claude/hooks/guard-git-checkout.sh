#!/usr/bin/env bash
# Refuse a working-tree-destroying git checkout while there are uncommitted changes.
#
# Same reasoning as .githooks/pre-commit: "never checkout on a dirty tree" was a written rule,
# broken twice on 2026-08-24 — the second time discarding a live production infrastructure fix
# that existed nowhere else, recovered only because the diff happened to still be on screen.
# Prose depends on attention at exactly the moment attention is elsewhere. A guard does not.
#
# Deliberately NARROW. These are safe on a dirty tree and stay allowed, because they are the
# normal way to start work and blocking them would make the guard something to route around:
#
#   git checkout -b <new>    git switch -c <new>    (create a branch, carry the changes along)
#
# These are refused, because each can silently overwrite uncommitted work:
#
#   git checkout <ref> -- <path>   git checkout -- <path>   git restore <path>
#       ^ overwrites the file in the working tree from another ref. No conflict, no warning,
#         nothing in the reflog. This is the one that caused the loss.
#   git checkout <existing-branch>  git switch <existing-branch>
#       ^ either carries changes into the wrong branch or fails half-way through a sequence.
set -uo pipefail

INPUT="$(cat)"
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[[ -z "$CMD" ]] && exit 0

# Only look at git checkout/switch/restore. Anything else is none of this hook's business.
if ! grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(checkout|switch|restore)([[:space:]]|$)' <<<"$CMD"; then
  exit 0
fi

# The escape hatch, matched on the command text itself — the hook cannot see the shell's
# environment, only what is about to run, and an inline prefix is exactly how it would be used.
grep -q 'VEERVRAT_ALLOW_DIRTY_CHECKOUT=yes-i-am-sure' <<<"$CMD" && exit 0

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[[ -z "$REPO_ROOT" ]] && exit 0

DIRTY="$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null)"
[[ -z "$DIRTY" ]] && exit 0   # clean tree — nothing to lose, allow everything

# Branch CREATION carries changes safely; that is the intended way to start work mid-change.
# `--` anywhere means path arguments are present, which is the destructive form even with -b.
if grep -Eq 'git[[:space:]]+(checkout[[:space:]]+-b|switch[[:space:]]+-c)' <<<"$CMD" \
   && ! grep -Eq '(^|[[:space:]])--([[:space:]]|$)' <<<"$CMD"; then
  exit 0
fi

CHANGED="$(printf '%s' "$DIRTY" | head -5)"
MORE="$(printf '%s' "$DIRTY" | wc -l | tr -d ' ')"

jq -n --arg cmd "$CMD" --arg changed "$CHANGED" --arg count "$MORE" '
{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: (
      "Refusing: the working tree has \($count) uncommitted change(s) and this command can " +
      "overwrite them with no way back.\n\n" +
      "Blocked command:\n  \($cmd)\n\n" +
      "Uncommitted:\n\($changed)\n\n" +
      "This rule exists because it was broken on 2026-08-24 and discarded a live production " +
      "infrastructure fix that existed nowhere else.\n\n" +
      "Do one of these instead:\n" +
      "  • Starting new work?      git switch -c <type>/<slug>   (allowed on a dirty tree)\n" +
      "  • Keeping these changes?  git stash push -m \"wip\"   → switch → git stash pop\n" +
      "  • Finished with them?     commit them first\n" +
      "  • Genuinely discarding?   git stash push first anyway — it is recoverable, this is not\n\n" +
      "Real override (long on purpose — it should feel like a decision, not a reflex):\n" +
      "  VEERVRAT_ALLOW_DIRTY_CHECKOUT=yes-i-am-sure <your command>"
    )
  }
}'
