# Explain no suitable match Task Specification

## Basic Information

- Task ID: T6
- Task name: Explain no suitable match
- Task type: Act
- Task owner: Cookable workflow owner (student project team)

## 1. Task Description
Provide a fixed, evidence-based message when T5 finds no feasible candidate. Also handle a separate incomplete-search status from T4: explain that the system could not complete its search and that this does not establish that no suitable meal exists. For a completed search with no candidate, identify the recorded screening reasons and invite the student to revise their request if appropriate. For an incomplete search, offer a retry; a retry returns the same validated request to T4, a changed request goes to T3, and declining ends without a recommendation. Allow 24 hours for a student choice after message delivery; no response closes the run without treating silence as a choice or approval.

## 2. Inputs

### Input 1

- Input name: Screened meal set (`no_feasible_candidates`)
- Contents and format: Request ID, completed screening status, candidate-level exclusions or unable-to-assess reasons, and the validated constraints relevant to the outcome. The candidate list may be empty when T4 completed its searches but found no supported candidate.
- Source: T5: Screen meals against constraints.

### Input 2

- Input name: Incomplete-search result
- Contents and format: Request ID, `search_incomplete` status, undetermined result, T4 failure evidence, any safe recovery action, and a reference to the unchanged validated request retained under that request ID. This input must not state or imply that the search proved no meal exists.
- Source: T4: Find candidate meals.

### Input 3

- Input name: Student outcome choice
- Contents and format: Request ID and choice to revise after no feasible candidates, retry an incomplete search without changing the request, revise an incomplete-search request, or decline.
- Source: Student through the Cookable request interface.

### Input 4

- Input name: Outcome deadline expiry
- Contents and format: Request ID, timestamp when the 24-hour response period expired, and the delivered outcome message being timed.
- Source: Cookable request interface timer, started only after successful message delivery.

- If a required input is missing or invalid: Do not generate a claim about meal suitability. Record the missing evidence and notify the Cookable workflow owner.

## 3. Outputs

### Output 1

- Output name: No-suitable-match message
- Contents and format: Request ID, fixed-format explanation of why all screened meals were excluded or could not be assessed, or that the completed search returned no candidates, and an optional prompt to revise the request. Do not claim that no meal exists beyond the candidates searched or screened.
- Next task or recipient: Student through the Cookable request interface; if the student revises the request, T3: Ask for clarification.
- Complete when: The message accurately reflects the completed T5 evidence and is delivered once.

### Output 2

- Output name: Search-incomplete message
- Contents and format: Request ID, fixed-format statement that candidate search could not be completed, relevant non-sensitive status, and a clear statement that this is not evidence that no suitable meal exists.
- Next task or recipient: Student through the Cookable request interface; a retry goes to T4: Find candidate meals, a changed request goes to T3: Ask for clarification, and technical recovery status goes to the Cookable workflow owner.
- Complete when: The student is told the search is incomplete without a false no-match claim, and the recovery status is recorded for the owner.

### Output 3

- Output name: Search recovery notice
- Contents and format: Request ID, non-sensitive T4 failure category, and suggested recovery action. Never include API keys or other secrets.
- Next task or recipient: Cookable workflow owner (student project team).
- Complete when: The incomplete-search condition and recovery need are recorded for human review.

### Output 4

- Output name: Retry request
- Contents and format: Existing request ID, the student's explicit choice to retry without changing the request, and a reference to the original validated request retained under that ID. T4 must receive that unchanged validated request.
- Next task or recipient: T4: Find candidate meals.
- Complete when: The retry is recorded and T4 receives the same validated request only when the student chooses retry.

### Output 5

- Output name: Revision prompt
- Contents and format: Existing request ID, applicable T5 screening or T4 incomplete-search context, and the student's proposed request changes.
- Next task or recipient: T3: Ask for clarification.
- Complete when: The student's request to revise is stored and routed to T3; T2 must revalidate before another T4 run.

### Output 6

- Output name: No-recommendation closure
- Contents and format: Request ID, outcome (`no_feasible_candidates` or `search_incomplete`), and closure reason (`student_declined` or `no_response_after_24_hours`). A timeout is not recorded as a student choice.
- Next task or recipient: Cookable workflow owner (student project team) for request history; no further task is started.
- Complete when: The run is closed without a recommendation and the outcome is preserved.

## 4. Planned Tools

### Tool 1

- Tool name: explain_search_outcome
- Input: Screened meal set (`no_feasible_candidates`), Incomplete-search result, Student outcome choice, or Outcome deadline expiry
- Output: No-suitable-match message, Search-incomplete message, Search recovery notice, Retry request, Revision prompt, or No-recommendation closure
- Implementation Route: Fixed message templates populated only with the corresponding structured evidence and status, delivered through the Cookable request interface.
- Integration approach: Direct integration.
- Role in this task: Map completed screening failure reasons to the no-match template, and map T4 `search_incomplete` to a distinct incomplete-search template. Capture the student's next-step choice and route retry, revision, or closure accordingly. If no choice arrives within 24 hours of delivery, close with `no_response_after_24_hours`. Do not conflate the outcomes or treat silence as a decline or approval.
- Task timeout: 24 hours for the student's outcome choice after successful message delivery; message preparation and delivery must complete within 30 seconds.
- Maximum retries: 1
- Retry only when: Delivery failure is confirmed; use the same request ID and message idempotency key to prevent duplicate delivery. If delivery status is uncertain, check it before retrying.
- On timeout, exhausted retries, or an error that cannot be retried: Record the message status and notify the Cookable workflow owner. Do not record the message as delivered or the workflow as complete.
