## ADDED Requirements

### Requirement: VA can fetch sentence suggestions derived from latest test results
The system SHALL expose `GET /api/v1/dashboard/suggestions` returning a list of sentence suggestions for the authenticated VA. Each suggestion represents a sentence the VA scored ≤ 2 (Never or Sometimes) in their most recent submitted test for a given weakness.

**v1 Algorithm:**
1. For each weakness where the VA has at least one submitted `TestAttempt`, find the most recently submitted attempt.
2. From that attempt's `TestAnswer` rows, keep only answers with `score <= 2`.
3. For each qualifying answer, resolve: sentence text (EN + MR), the sentence's subvirtue (name EN + MR), the subvirtue's virtue (name EN + MR), the weakness name (EN), and the score.
4. Deduplicate by `sentenceId` — if the same sentence appears in multiple weaknesses' latest tests, keep the entry with the lowest score (most urgent).
5. Sort ascending by score (1 before 2).
6. Cap the result at 20 items.

Response shape:
```
{
  suggestions: [
    {
      sentenceId: string,
      sentenceTextEn: string,
      sentenceTextMr: string | null,
      score: 1 | 2,
      subvirtueId: string,
      subvirtueNameEn: string,
      subvirtueNameMr: string | null,
      virtueId: string,
      virtueNameEn: string,
      virtueNameMr: string | null,
      weaknessId: string,
      weaknessNameEn: string
    }
  ]
}
```

#### Scenario: VA has tests with low-scoring sentences
- **WHEN** a VA has submitted tests for two weaknesses, and the latest test for weakness A has a sentence scored 1 and weakness B has a sentence scored 2
- **THEN** the response contains both sentences, sorted score ASC (1 first, then 2)

#### Scenario: VA has no submitted tests
- **WHEN** a VA has no submitted `TestAttempt` records
- **THEN** the response returns `{ suggestions: [] }`

#### Scenario: Sentence appears in two weaknesses — lowest score wins
- **WHEN** the same sentence is scored 2 in weakness A's latest test and 1 in weakness B's latest test
- **THEN** only one entry for that sentence appears, with score 1 and the weakness context from B

#### Scenario: Only score-1 and score-2 answers are included
- **WHEN** a latest test contains sentences scored 3 (Often) and 4 (Always) alongside some scored 1 and 2
- **THEN** only the score-1 and score-2 sentences appear in the suggestions

#### Scenario: Result is capped at 20 items
- **WHEN** a VA's aggregated low-scoring sentences across all weaknesses exceed 20
- **THEN** the response contains exactly 20 items (the 20 lowest-scored)

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request to `GET /api/v1/dashboard/suggestions` is made without a valid session cookie
- **THEN** the system returns `401 Unauthorized`
