# Cookable

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