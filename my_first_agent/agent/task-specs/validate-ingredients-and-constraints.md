# Validate ingredients and constraints Task Specification

## Basic Information

- Task ID: T2
- Task name: Validate ingredients and constraints
- Task type: Reason
- Task owner: Cookable workflow owner (student project team)

## 1. Task Description
Interpret the ingredient text in a captured request into normalized ingredient entries, then apply the same fixed completeness checks to every request. Confirm that at least one usable ingredient is present and that allergy/dietary, cooking-time, and budget fields contain explicit student declarations, including “none,” “no limit,” or “unspecified” where applicable. Do not infer unstated constraints. Return a validated request only when all checks pass.

## 2. Inputs

### Input 1

- Input name: Captured meal request
- Contents and format: Structured request record with request ID, ingredient text, and any optional preference and constraint fields.
- Source: T1: Receive meal request for the initial request; T3: Ask for clarification for an updated request.

- If a required input is missing or invalid: For a known missing or ambiguous field, produce Clarification gaps and route to T3: Ask for clarification. If the request record is unavailable or the validation operation fails, produce a Validation exception notice and route it to the Cookable workflow owner; do not send a failure without gaps to T3.

## 3. Outputs

### Output 1

- Output name: Validated meal request
- Contents and format: Structured request with normalized ingredient names, original ingredient text, supplied preferences and constraints, and unspecified fields explicitly identified.
- Next task or recipient: T4: Find candidate meals.
- Complete when: Required ingredients are interpretable and the fixed completeness checks pass without inventing student-provided information.

### Output 2

- Output name: Clarification gaps
- Contents and format: Request ID and a list of specific missing, ambiguous, or uninterpretable fields, with the original text needed to form a question.
- Next task or recipient: T3: Ask for clarification.
- Complete when: Every failed fixed check is represented by a concrete gap and no unverified interpretation is presented as fact.

### Output 3

- Output name: Validation exception notice
- Contents and format: Request ID if available, failed operation, non-sensitive error category, and statement that validation did not complete. Do not include secrets or claim the request is valid.
- Next task or recipient: Cookable workflow owner (student project team).
- Complete when: The failure is recorded for human recovery and no downstream task is started as if validation succeeded.

## 4. Planned Tools

### Tool 1

- Tool name: interpret_and_validate_request
- Input: Captured meal request
- Output: Validated meal request, Clarification gaps, or Validation exception notice
- Implementation Route: Claude Haiku interprets and normalizes free-text ingredient entries; deterministic validation rules then apply the fixed completeness checks and select the output.
- Integration approach: Direct integration.
- Role in this task: Normalize student-provided ingredients, identify ambiguity, and apply the same completeness outcomes to every request. The model does not decide whether a request is complete by changing the fixed criteria.
- Task timeout: 30 seconds per request.
- Maximum retries: 0
- Retry only when: Not applicable.
- On timeout, exhausted retries, or an error that cannot be retried: Record the failed operation and error category in a Validation exception notice. Do not mark the request validated or route a failure without concrete clarification gaps to T3.
