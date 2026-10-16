# Screen meals against constraints Task Specification

## Basic Information

- Task ID: T5
- Task name: Screen meals against constraints
- Task type: Verify
- Task owner: Cookable workflow owner (student project team)

## 1. Task Description
Assess each candidate returned by T4 against the student's explicit allergy and dietary declarations, then apply fixed time and budget rules when the student supplied limits. Claude maps normalized recipe ingredient names to the declared allergy/diet categories; deterministic rules exclude any known conflict and any candidate that cannot be assessed against a declared restriction or limit. If a field is explicitly “unspecified,” mark the corresponding assessment unable to assess; do not interpret it as “none” or “no limit.” For a declared “no limit,” no time/cost threshold applies. Never claim a recipe is allergy-safe or that ingredient quantities match what the student has available.

## 2. Inputs

### Input 1

- Input name: Candidate meal set
- Contents and format: Request ID, candidate meal IDs, names, evidence showing whether TheMealDB search completed, listed normalized ingredients and measurements when retrieved, instructions and source when available, and unavailable fields explicitly marked unknown.
- Source: T4: Find candidate meals.

### Input 2

- Input name: Validated meal request
- Contents and format: Same request ID as the candidate meal set; structured request with normalized available ingredients and the student's stated allergies, dietary restrictions, cooking-time limit, and budget; unspecified values remain explicitly unspecified.
- Source: T2: Validate ingredients and constraints.

- If a required input is missing or invalid: Do not label any meal feasible. Record the missing evidence and notify the Cookable workflow owner; a valid empty candidate set from completed T4 searches is still screened and routes to T6: Explain no suitable match.

## 3. Outputs

### Output 1

- Output name: Screened meal set
- Contents and format: Request ID; candidate list with each meal's status (feasible, excluded, or unable to assess); normalized available and missing ingredient names; counts of name matches and missing ingredients for T7; allergy/diet category evidence; applied time/budget checks; evidence sources; and an explicit reason for each exclusion or unknown. Quantities not provided by the request remain unknown. Include overall outcome `feasible_candidates`, `no_feasible_candidates`, or `unable_to_complete`.
- Next task or recipient: T7: Rank feasible meals when one or more candidates are feasible; T6: Explain no suitable match when screening completes with no feasible candidates; Cookable workflow owner when screening cannot complete.
- Complete when: Every input candidate has a screening status and the overall outcome is recorded. No unknown allergy/diet assessment or unknown value for a stated limit is represented as a pass. If no candidates arrive after a completed T4 search, emit `no_feasible_candidates` with an empty list. If the screening operation itself fails, emit `unable_to_complete` and the exception notice instead of a completed result.

### Output 2

- Output name: Screening exception notice
- Contents and format: Request ID, non-sensitive failure category, and statement that screening did not complete; do not include secrets or claim feasibility.
- Next task or recipient: Cookable workflow owner (student project team).
- Complete when: The failure is recorded and T7/T8 are not started.

## 4. Planned Tools

### Tool 1

- Tool name: screen_meals_against_constraints
- Input: Candidate meal set and Validated meal request
- Output: Screened meal set or Screening exception notice
- Implementation Route: Claude Haiku maps listed recipe ingredient names to stated allergy and dietary categories; deterministic rules then exclude known conflicts and meals with known cooking time or cost exceeding the student's stated limits.
- Integration approach: Direct integration.
- Role in this task: Produce evidence-based screening statuses and the match/missing counts required by T7. Treat missing or uncertain allergy/diet evidence, and missing evidence for any stated limit, as unable to assess, not as feasible. Do not infer amounts or market costs from ingredient names.
- Task timeout: 45 seconds per request.
- Maximum retries: 0
- Retry only when: Not applicable.
- On timeout, exhausted retries, or an error that cannot be retried: Produce Screening exception notice, do not mark candidates feasible, and notify the Cookable workflow owner. Do not continue to T7 or T6 as though screening completed.
