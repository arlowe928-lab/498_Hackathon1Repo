# Receive meal request Task Specification

## Basic Information

- Task ID: T1
- Task name: Receive meal request
- Task type: Sense
- Task owner: Cookable workflow owner (student project team)

## 1. Task Description
Capture the student's meal request through a predefined form and store it as a structured submission. The form collects ingredients, preferences, allergies/dietary restrictions, cooking-time limit, and budget. The student must explicitly choose a restriction/limit, “none,” “no limit,” or “unspecified”; a blank is not treated as “none.” The form records entries without interpreting free text; T2 performs ingredient interpretation and completeness validation.

## 2. Inputs

### Input 1

- Input name: Student meal request
- Contents and format: Student-entered form fields containing a client submission token, available-ingredient text, preferences, and explicit allergy/dietary, cooking-time, and budget declarations. Each constraint field contains the student's value or an explicit “none,” “no limit,” or “unspecified” choice; ingredient descriptions may be free text.
- Source: Student

- If a required input is missing or invalid: Do not create a usable request record. Return form validation errors to the student for correction; if the student cancels, end the run without a recommendation.

## 3. Outputs

### Output 1

- Output name: Captured meal request
- Contents and format: Structured record containing a unique request ID, client submission token, submission time, ingredient text, preferences, and explicit allergy/diet/time/budget declarations. Preserve the student's text and explicit no-limit/unspecified selections without silently interpreting or changing them.
- Next task or recipient: T2: Validate ingredients and constraints.
- Complete when: The form submission is stored once with a unique request ID and all required declarations and submitted values are available to T2. If the student leaves a required field blank, the form reports it and does not submit the request.

## 4. Planned Tools

### Tool 1

- Tool name: capture_meal_request
- Input: Student meal request
- Output: Captured meal request
- Implementation Route: Predefined web form and server-side request-record creation.
- Integration approach: Direct integration.
- Role in this task: Capture the student's entries into fixed fields and assign a request ID without making a recommendation or interpreting ingredients.
- Task timeout: 30 seconds per submission.
- Maximum retries: 1
- Retry only when: The form reports that the submission was not stored. Reuse the same client submission token so a repeated submit cannot create a duplicate. If the outcome is uncertain, check the stored request by that token before retrying.
- On timeout, exhausted retries, or an error that cannot be retried: Record the submission failure and show a clear error to the student. Do not route a partial request to T2; the student may retry or contact the Cookable workflow owner.
