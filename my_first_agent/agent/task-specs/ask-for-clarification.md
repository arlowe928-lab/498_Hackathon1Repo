# Ask for clarification Task Specification

## Basic Information

- Task ID: T3
- Task name: Ask for clarification
- Task type: Act
- Task owner: Cookable workflow owner (student project team)

## 1. Task Description
Use the specific gaps identified by T2, or a revision prompt from T6/T8, to compose and send a concise question or revision request. Capture the student's response under the same request ID and return the updated request to T2 for validation. Never treat silence as consent or fill gaps using assumptions.

## 2. Inputs

### Input 1

- Input name: Clarification gaps
- Contents and format: Request ID and structured list of missing, ambiguous, or uninterpretable request fields with their original text when relevant.
- Source: T2: Validate ingredients and constraints.

### Input 2

- Input name: Revision prompt
- Contents and format: Optional prompt indicating the student chose to revise after a no-match result or requested refinement after seeing meal options; includes the current request ID and any proposed changes.
- Source: T6: Explain no suitable match or T8: Present meal options.

### Input 3

- Input name: Student clarification or revision response
- Contents and format: Student-entered response to the clarification question, linked to the existing request ID; it may be partial.
- Source: Student through the Cookable request interface.

- If a required input is missing or invalid: If neither clarification gaps nor a revision prompt with request ID is supplied, stop and notify the Cookable workflow owner. If the student does not respond by the deadline, close without recommendation; if the response is partial, retain it as-is and route to T2 to identify remaining gaps.

## 3. Outputs

### Output 1

- Output name: Clarification question
- Contents and format: Request ID and a plain-language question listing only the unresolved fields that the student needs to answer.
- Next task or recipient: Student through the Cookable request interface.
- Complete when: The question is delivered once and is traceable to the originating request.

### Output 2

- Output name: Updated meal request
- Contents and format: Original request plus the student's verbatim clarification or revision response and response time, linked by request ID.
- Next task or recipient: T2: Validate ingredients and constraints.
- Complete when: The response is stored and returned for T2 validation, or the request is closed without a recommendation after cancellation or no response by the deadline.

### Output 3

- Output name: No-response closure
- Contents and format: Request ID, question delivery time, deadline, and closure status `no_response` or `cancelled`. Silence is not an answer.
- Next task or recipient: Cookable workflow owner (student project team); student receives a closure notice.
- Complete when: The 24-hour response deadline expires or the student cancels, and the request is closed without starting T2.

## 4. Planned Tools

### Tool 1

- Tool name: compose_clarification_question
- Input: Clarification gaps or Revision prompt
- Output: Clarification question
- Implementation Route: Claude Haiku generates a short question only from the supplied gaps or revision prompt; the request interface delivers it.
- Integration approach: Direct integration.
- Role in this task: Phrase the gaps or requested revision clearly without adding new requirements, supplying answers, or changing the validated request.
- Task timeout: 30 seconds to prepare and deliver the question.
- Maximum retries: 1
- Retry only when: A delivery error is confirmed. Use the same request ID and message idempotency key to prevent duplicate questions. If delivery is uncertain, check delivery status before retrying. Do not retry the model with the same inputs after an inference error.
- On timeout, exhausted retries, or an error that cannot be retried: Record the delivery failure and notify the Cookable workflow owner. Do not wait for or imply a student response when the message was not delivered.

### Tool 2

- Tool name: capture_student_clarification
- Input: Clarification question and Student clarification or revision response
- Output: Updated meal request or No-response closure
- Implementation Route: Request interface records the student's response with the existing request ID and timestamp, then routes it to T2; a 24-hour timeout or cancellation closes the request without recommendation.
- Integration approach: Direct integration.
- Role in this task: Capture, not interpret, the student's response. T2 revalidates all updates.
- Task timeout: 24 hours for student response after successful question delivery.
- Maximum retries: 0
- Retry only when: Not applicable.
- On timeout, exhausted retries, or an error that cannot be retried: Record `no_response`, `cancelled`, or response-capture failure. Silence is not consent; notify the student and Cookable workflow owner as applicable, and do not start T2 without a captured response.
