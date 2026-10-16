# Present meal options Task Specification

## Basic Information

- Task ID: T8
- Task name: Present meal options
- Task type: Act
- Task owner: Cookable workflow owner (student project team)

## 1. Task Description
Present the ranked feasible candidates in a fixed format so the student can compare options. Include recipe evidence and identify ingredients on hand, ingredients still needed, and known time/cost details; mark unavailable values as unknown. Allow the student to request refinement, which is captured and sent to T3. T6 sends no-match and incomplete-search messages directly to the student; they do not enter T8.

## 2. Inputs

### Input 1

- Input name: Ranked feasible meal set
- Contents and format: Request ID and ordered candidates with rank, name, recipe instructions/source when available, ingredient matches, missing ingredients, known time/cost details, and unknown markers.
- Source: T7: Rank feasible meals.

### Input 2

- Input name: Student refinement request
- Contents and format: Student-entered ingredient, preference, or constraint changes linked to the request ID, submitted after the meal options response.
- Source: Student through the Cookable request interface.

- If a required input is missing or invalid: Do not invent meal fields or present candidates as screened. Record the delivery issue and notify the Cookable workflow owner; request correction or rerun the prior task as appropriate.

## 3. Outputs

### Output 1

- Output name: Meal options response
- Contents and format: Request ID and fixed-format student-facing response containing ranked meal cards, with evidence and unknown values clearly labeled.
- Next task or recipient: Student.
- Complete when: The response is delivered once and all displayed claims are supported by the supplied task outputs.

### Output 2

- Output name: Revision prompt
- Contents and format: Student's requested ingredient, preference, or constraint changes linked to the current request ID.
- Next task or recipient: T3: Ask for clarification.
- Complete when: The student's request to refine is stored and routed for clarification/validation; otherwise the workflow is marked complete after delivery.

## 4. Planned Tools

### Tool 1

- Tool name: present_meal_options
- Input: Ranked feasible meal set
- Output: Meal options response
- Implementation Route: Fixed-format web interface populated from the Ranked feasible meal set.
- Integration approach: Direct integration.
- Role in this task: Render verified fields without exposing server credentials or converting unknown recipe data into facts.
- Task timeout: 30 seconds per request.
- Maximum retries: 1
- Retry only when: Delivery failure is confirmed. Use the same request ID and response idempotency key to avoid duplicate responses. If delivery status is uncertain, check the delivery record before retrying.
- On timeout, exhausted retries, or an error that cannot be retried: Record the delivery state and notify the Cookable workflow owner. Do not mark recommendations as delivered.

### Tool 2

- Tool name: capture_meal_refinement
- Input: Student refinement request
- Output: Revision prompt
- Implementation Route: Request interface captures the student's requested changes under the existing request ID and routes them to T3 without interpreting or validating them.
- Integration approach: Direct integration.
- Role in this task: Capture a refinement request only after the student has received the meal options.
- Task timeout: 30 seconds per submission.
- Maximum retries: 1
- Retry only when: A confirmed storage failure occurs. Reuse the same submission token to prevent duplicate revisions; if the outcome is uncertain, check the request ID and token before retrying.
- On timeout, exhausted retries, or an error that cannot be retried: Record the failure and notify the Cookable workflow owner. Do not start T3 without a captured revision prompt.
