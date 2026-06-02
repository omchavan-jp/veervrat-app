# Test Scoring & Response Scale
_Last updated: 2026-06-02 | Round: R1_

## Confirmed Decisions

### Response Scale
- Four options per sentence, displayed in EN and MR:
  | Score | English | Marathi |
  |---|---|---|
  | 4 | Always | नेहमी |
  | 3 | Often | कधी कधी |
  | 2 | Sometimes | क्वचित |
  | 1 | Never | कधीच नाही |

### Flagging
- A sentence is **flagged** if scored 1 (Never) or 2 (Sometimes) on the latest test attempt.
- Flagged sentences are surfaced at the top of the test result screen.
- Within flagged sentences: sorted lowest score first (Never before Sometimes).

### Suggestion Algorithm (v1)
- Based on the **single latest test result per weakness per VA** — not an average across attempts.
- "Lowest-scored sentences" = sentences with score 1 or 2 from the most recent test for that weakness.
- Suggestion order: score 1 (Never) first, then score 2 (Sometimes).

### Future Version Note
- The averaging logic (score across multiple attempts over time) is a candidate input for the future suggestion algorithm enhancement. When speccing v2 algorithm, start from: per-sentence score history, weighted by recency.

## Flags
- ⚠ Test scoring is per-attempt, single-latest for v1. Do not build averaging into the v1 score computation — it must be addable later without breaking the existing result display.
