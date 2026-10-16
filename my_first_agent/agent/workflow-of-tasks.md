# Workflow of Tasks

## 1. Workflow Overview
### 1.1 Workflow Goal
This workflow supports the system goal defined in `my_first_agent/README.md`.

### 1.2 Workflow Trigger

One run starts when a student submits a meal request with available ingredients and explicit entries for allergies/dietary restrictions, time, and budget. An explicit entry may state a restriction/limit, “none,” “no limit,” or “unspecified”; the system does not infer a negative answer from a blank field. If any required entry is missing or ambiguous, the system asks the student to clarify it before searching for meals.

### 1.3 Completion Condition at Runtime

A run is complete when the system either presents one or more meal suggestions that pass screening against the student's stated constraints, explains that no candidate passed the completed screening, or reports that a search was incomplete without claiming that no suitable meal exists. A run also ends without a recommendation if the student declines to provide essential information, declines a search retry, or cancels.

### 1.4 General Workflow
The system receives the student's meal request and checks that available ingredients and explicit constraint declarations are clear enough to use. If required details are missing or ambiguous, T3 asks the student to clarify them and returns the updated request to T2. Once validated, T4 searches for candidate meals and sends its candidate set (including a valid empty set after successful searches) to T5. T5 screens each candidate against stated allergies and dietary restrictions, and applies fixed time and budget rules when those limits are stated and evidence is available. A candidate with a known conflict or a stated limit that cannot be assessed does not pass. If T4 cannot complete its search, T6 tells the student the search is incomplete; this is not represented as proof that no suitable meal exists. If T5 completes screening but no candidate passes, T6 explains the screening outcome. Otherwise, T7 ranks the passing meals and T8 presents them with available instructions, ingredient matches, missing ingredients, and supported time/cost details.

If no candidate passes screening, T6 explains the recorded reasons and asks whether the student wants to revise the request. If T4's search is incomplete, T6 explains that it cannot determine whether a suitable meal exists and offers a retry; an unchanged retry returns the same validated request to T4, while a changed request goes through T3 and T2. T6 allows 24 hours for the student's next-step choice after message delivery. A decline closes the run without a recommendation; no response also closes it without implying consent or treating silence as a choice. The student can also request refinement after T8 presents meal options; T3 captures the revision and T2 validates it before another search.

### 1.5 Workflow Diagram

```mermaid
flowchart TD
    T1["T1: Receive meal request"] --> T2["T2: Validate ingredients and constraints"]
    T2 --> D1{"Request clear and complete?"}
    D1 -->|No| T3["T3: Ask for clarification"]
    T3 --> D2{"Student responds before deadline?"}
    D2 -->|Yes| T2
    D2 -->|No or cancels| C2(["C2: End without recommendation"])
    D1 -->|Yes| T4["T4: Find candidate meals"]
    T4 -->|Candidate set, including empty after completed search| T5["T5: Screen meals against constraints"]
    T4 -->|Search incomplete| T6["T6: Explain no suitable match"]
    T5 --> D3{"Any feasible meals?"}
    D3 -->|No| T6
    T6 --> D4{"Outcome type?"}
    D4 -->|No feasible match| D5{"Student revises request?"}
    D5 -->|Yes| T3
    D5 -->|No| C3(["C3: End with no suitable match"])
    D5 -->|No response after 24 hours| C5(["C5: Close no-match; no response"])
    D4 -->|Search incomplete| D6{"Student next step?"}
    D6 -->|Retry unchanged request| T4
    D6 -->|Revise request| T3
    D6 -->|Decline| C4(["C4: End without recommendation; search incomplete"])
    D6 -->|No response after 24 hours| C6(["C6: Close incomplete-search; no response"])
    D3 -->|Yes| T7["T7: Rank feasible meals"]
    T7 --> T8["T8: Present meal options"]
    T8 --> D7{"Student wants refinement?"}
    D7 -->|Yes| T3
    D7 -->|No| C1(["C1: Recommendations delivered"])
```
