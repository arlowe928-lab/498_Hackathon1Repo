# Find candidate meals Task Specification

```yaml
# BASIC INFORMATION
task_id: "T4"
task_name: "Find candidate meals"
task_owner: "Cookable workflow owner (student project team)"

# Agent Inference Configuration
Provider: Claude
Model: "claude-haiku-5-5"
Role: Generate meal candidates and explore alternative meals from the validated request.
Maximum inference requests per task run: 6
On inference failure or exhausted limits: Record the unresolved status and hand the case to the Cookable workflow owner (student project team).
```

## 1. Task Goal

- **Objective:** Identify candidate meals relevant to the student's validated meal request and return them to T5 for constraint screening, without presenting the candidates as verified feasible recommendations.

## 2. Inbound Inputs

### Input 1

- **Input name:** Validated meal request.
- **What it contains:** A structured request containing the student's available ingredients and stated preferences and constraints, including dietary restrictions or allergies, available cooking time, and budget when specified or clarified. Include only information supplied by the student; leave unspecified details identified as unspecified. Do not add example case data.
- **Source:** T2: Validate ingredients and constraints.

## 3. Tool Permissions and Boundaries

## 4. How the Agent Should Reason

### Permitted Subtask 1

- **Subtask name:** Generate meal candidates.
- **Subtask description:** Examine the validated meal request and identify possible meals that use some of the available ingredients and reflect the student's stated preferences. Produce candidate names and any ingredient or preparation details available from the task context, marking unknown details as unknown for T5 to assess.
- **Subtask boundary:** Use only the validated request and information available in the task context. Do not add ingredients or preferences the student did not provide, claim a candidate satisfies dietary, time, or budget constraints, or present unverified details as facts. Do not contact the student; T3 handles clarification.
- **Retry limits:** 0 additional attempts. If this attempt does not produce a useful candidate set, choose another permitted subtask or hand off if no useful next step remains.

### Permitted Subtask 2

- **Subtask name:** Explore alternative meals.
- **Subtask description:** When the initial candidates are sparse or leave important request details unresolved, use those findings to explore a different meal direction that still fits the student's supplied ingredients and preferences. Produce additional candidate names and note any remaining unknown details.
- **Subtask boundary:** Stay within the validated request and task context. Do not relax or reinterpret a stated allergy, dietary restriction, time limit, or budget, and do not claim that an alternative is feasible; T5 performs constraint screening. Do not invent external recipe sources or contact the student.
- **Retry limits:** 0 additional attempts. If this attempt does not resolve the remaining uncertainty or produce useful candidates, hand off to the Cookable workflow owner.

- **Decision guidance:** After each subtask, use its findings to select the permitted subtask most likely to resolve the most important remaining uncertainty. Do not follow a fixed sequence. If no permitted subtask can make useful progress, stop and hand the case to a person.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** One or more candidate meals are identified and returned to T5 with available ingredient details and any unknown details clearly marked. Candidates are not represented as screened or feasible.
- **Hand off early when:** No useful candidates can be identified from the validated request, essential candidate details remain unsupported after the permitted subtasks, or progress would require relaxing a stated constraint or using an unprovided source.
- **Hand off to:** Cookable workflow owner (student project team).

Stop at the first applicable budget limit or handoff condition. While awaiting review, take no further autonomous action.

## 6. Outbound Deliverable

- **Status:** Completed or escalated to human.
- **Result or recommendation:** The completed result. If escalated before reaching a supported result, write undetermined.
- **Evidence summary:** The most important evidence supporting the result or explaining why no result could be reached.
- **Subtasks performed:** Permitted subtasks completed, including repeated attempts.
- **Unresolved issues:** Remaining uncertainties or questions; use none only if no unresolved issue remains.
- **Handoff note:** Reason for stopping, unresolved questions, and what the reviewer needs to decide; write "Not applicable" for a completed task.
- **Next task or recipient:** T5: Screen meals against constraints receives completed candidate meals; unresolved cases go to the Cookable workflow owner.
