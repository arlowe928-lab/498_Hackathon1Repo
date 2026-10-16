# Cookable

## Meal-planning MVP

The starter website is served by the same local TypeScript server as the candidate-search API. It provides a browser walkthrough of T1–T8: request capture and validation, clarification, TheMealDB candidate search, conservative screening, no-match/retry handling, ranking, and results with refinement.

1. Start the server with `npm --prefix server run dev` after setting the server keys described below.
2. Open `http://localhost:3000`. If that port is already in use, start with `PORT=4173 npm --prefix server run dev` and open `http://localhost:4173`.
3. Enter ingredients and choose an explicit answer for allergies, dietary restrictions, cooking time, and budget. The UI sends ingredient-search requests to the local server; it never receives API keys.

This is an in-session MVP, not a production application: request data is not saved across reloads, T6's 24-hour response window is described but not enforced by a background timer, and only T4 candidate search runs as a server-side workflow service; T1–T3 and T5–T8 currently run in the browser. The screening is intentionally conservative: if recipe ingredients or a stated constraint cannot be verified, it will not automatically mark that candidate feasible. It cannot certify allergy safety. Always inspect the linked recipe and product labels.

## Candidate-search server

The TypeScript server exposes `POST /api/meals/candidates`. It calls Claude Haiku from the server and provides server-side TheMealDB ingredient search and meal-detail tools. Claude chooses whether to search a second supplied ingredient, inspect a returned meal, or finish based on the intermediate results. Results are candidates for T5 to screen; they are not claims that a meal is allergy-safe or within the student's time or budget.

1. Add the variable lines from `.env.example` to the root `.env` if they are not already present, preserving existing entries, then enter your keys yourself. Never paste keys into chat or put them in browser code.
2. From the `server` directory, run `npm install`.
3. Run `npm run dev` to start the API on `http://localhost:3000`.
4. Run `npm test` and `npm run build` from `server` to verify it.

Example request body:

```json
{
  "requestId": "client-generated-unique-id",
  "ingredients": ["rice", "beans"],
  "preferences": ["vegetarian"],
  "allergies": [],
  "cookingTimeMinutes": 30,
  "budget": 12,
  "currency": "USD"
}
```

The server requires `ANTHROPIC_API_KEY` and `THEMEALDB_API_KEY` in the root `.env`. That file is ignored by Git. The web client should send the meal request to this server and must never receive either API key.