#!/usr/bin/env bash
# Find local work that never reached the remote or main.
#
#   ./scripts/unmerged-work.sh          # problems only — safe to run in a session-close ritual
#   ./scripts/unmerged-work.sh --all    # also list in-flight and historical branches
#
# WHY NOT `git branch --no-merged main`: we squash-merge, so a merged branch shares no ancestry
# with its merge commit. Every branch ever merged still reports as unmerged — 42 of them here,
# of which 3 held real work. That noise is how commit 5ca19d0 stayed lost for a day: committed,
# never pushed, silently dropped from a squash merge because the PR only ever saw the remote.
#
# WHY THIS DOES NOT TRY TO ANSWER "did this branch merge?": after a squash, nothing answers it
# reliably. Ancestry is broken by design; `git cherry` patch-ids only match single-commit
# branches; and branches predating the PR convention were merged into the retired `dev` with no
# PR at all. A check that guesses would fire ~27 false alarms, and a check that cries wolf gets
# ignored — which is worse than no check (21_Infrastructure-Conventions §17).
#
# So it reports only what IS unambiguous:
#   1. commits that exist locally and nowhere else  <- the failure that actually bit us
#   2. a PR closed without merging, work left behind
set -uo pipefail

SHOW_ALL=0
[[ "${1:-}" == "--all" ]] && SHOW_ALL=1
TRUNK=main
problems=0

git rev-parse --git-dir >/dev/null 2>&1 || { echo "not a git repo" >&2; exit 1; }
HAVE_GH=0; command -v gh >/dev/null && gh auth status >/dev/null 2>&1 && HAVE_GH=1

RECENT_DAYS=${RECENT_DAYS:-21}
cutoff=$(( $(date +%s) - RECENT_DAYS*86400 ))

while IFS= read -r branch; do
  ahead=$(git rev-list --count "$TRUNK..$branch" 2>/dev/null || echo 0)
  [[ "$ahead" == "0" ]] && continue

  if upstream=$(git rev-parse --abbrev-ref "$branch@{upstream}" 2>/dev/null); then
    # CASE 1 — the unambiguous one, and the failure that actually bit us. The branch is on the
    # remote, so we know exactly what the remote has; anything beyond it exists only here and
    # cannot appear in any PR.
    unpushed=$(git rev-list --count "$upstream..$branch" 2>/dev/null || echo 0)
    if [[ "$unpushed" != "0" ]]; then
      echo "⚠️  $branch — $unpushed commit(s) exist ONLY on this machine"
      git log --oneline "$upstream..$branch" | sed 's/^/       /'
      echo "       push them, or cherry-pick onto a live branch. Verify the content is really"
      echo "       missing from $TRUNK first — it may have shipped via another branch."
      problems=$((problems+1))
    fi
  else
    # CASE 2 — no remote branch. Ambiguous: it may never have been pushed, or it may have been
    # merged long ago and the remote branch deleted. Two filters keep this from crying wolf:
    #   * patch-id equivalence catches single-commit branches already squashed into trunk
    #   * an age cutoff skips branches predating the current PR convention (merged via the
    #     retired `dev`, often with no PR at all)
    # Multi-commit historical branches are genuinely indistinguishable from stranded work after
    # a squash, so they are surfaced under --all rather than alarmed on.
    uniq=$(git cherry "$TRUNK" "$branch" 2>/dev/null | grep -c '^+' || true)
    tip=$(git log -1 --format=%ct "$branch" 2>/dev/null || echo 0)
    if [[ "${uniq:-0}" != "0" && "$tip" -gt "$cutoff" ]]; then
      echo "⚠️  $branch — $ahead commit(s), never pushed, and recent (tip $(git log -1 --format=%cr "$branch"))"
      problems=$((problems+1))
    elif [[ "$SHOW_ALL" == "1" ]]; then
      echo "?   $branch — no remote branch; $ahead commit(s), tip $(git log -1 --format=%cr "$branch") (likely merged pre-convention)"
    fi
  fi

  [[ "$branch" == "$TRUNK" ]] && continue
  [[ "$HAVE_GH" == "1" ]] || continue

  # Every PR for this head, not just the newest. A branch can carry more than one: open a PR,
  # close it, open another, and `--limit 1` returns whichever is most recent — so a closed
  # duplicate of a PR that DID merge reports as "work left behind" and sends the next reader
  # digging through a branch that shipped weeks ago. `chore/batch1-housekeeping` carries exactly
  # that pair: #236 closed, #235 merged.
  #
  # ⚠️ A merged PR is NOT treated as proof and does not silence the branch. It says GitHub merged
  # *something* from this head; after a squash, only the content answers whether a given commit
  # survived — which is the whole reason this script exists rather than `git branch --no-merged`.
  # So the mixed case drops from an alarm to a note: still printed, still names what to check, no
  # longer claims work was abandoned when it probably was not.
  prs=$(gh pr list --head "$branch" --state all --limit 20 --json number,state \
          -q '.[]|"\(.state):\(.number)"' 2>/dev/null || echo "")
  merged_pr=$(grep '^MERGED:' <<<"$prs" | head -1 | cut -d: -f2)
  closed_pr=$(grep '^CLOSED:' <<<"$prs" | head -1 | cut -d: -f2)
  open_pr=$(grep '^OPEN:' <<<"$prs" | head -1 | cut -d: -f2)

  if [[ -n "$closed_pr" && -n "$merged_pr" ]]; then
    state=MIXED
  elif [[ -n "$open_pr" ]]; then
    state=OPEN
  elif [[ -n "$merged_pr" ]]; then
    state=MERGED
  elif [[ -n "$closed_pr" ]]; then
    state=CLOSED
  else
    state=""
  fi
  case "$state" in
    MIXED)
      echo "?   $branch — PR #$closed_pr closed, but #$merged_pr merged the same head."
      echo "       Probably landed via #$merged_pr. Confirm by content, not by ancestry:"
      echo "       git show $TRUNK:<a file the branch changed> — a squash leaves no ancestry to follow." ;;
    CLOSED)
      echo "⚠️  $branch — PR closed WITHOUT merging; $ahead commit(s) left behind"
      problems=$((problems+1)) ;;
    OPEN)   [[ "$SHOW_ALL" == "1" ]] && echo "•   $branch — PR open, in flight" ;;
    MERGED) [[ "$SHOW_ALL" == "1" ]] && echo "✓   $branch — PR merged" ;;
  esac
done < <(git branch --format='%(refname:short)')

echo
if [[ "$problems" == "0" ]]; then
  echo "✅ nothing stranded — no unpushed commits, no work behind a closed PR"
else
  echo "❌ $problems item(s) need attention"
  exit 1
fi
