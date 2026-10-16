import assert from "node:assert/strict";
import test from "node:test";
import { findCandidateMeals, parseMealRequest, type CookableConfig } from "./cookable.js";

const config: CookableConfig = {
  anthropicApiKey: "test-anthropic-key",
  themealdbApiKey: "test-mealdb-key",
};

test("validates the available ingredients and optional constraints", () => {
  assert.deepEqual(
    parseMealRequest({
      ingredients: ["rice", "beans"],
      allergies: ["peanuts"],
      cookingTimeMinutes: 30,
      budget: 12,
    }),
    {
      ingredients: ["rice", "beans"],
      allergies: ["peanuts"],
      cookingTimeMinutes: 30,
      budget: 12,
    },
  );
  assert.equal(parseMealRequest({ ingredients: [] }), null);
  assert.equal(parseMealRequest({ ingredients: ["rice"], allergies: [""] }), null);
});

test("adapts after search results and returns details grounded in a returned meal ID", async () => {
  const requests: Array<{ url: string; body?: Record<string, unknown> }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
    requests.push({ url, body });

    if (url.includes("api.anthropic.com")) {
      const inferenceNumber = requests.filter((request) => request.url.includes("api.anthropic.com")).length;
      if (inferenceNumber === 1) {
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: "tool-search",
            name: "search_mealdb_by_ingredient",
            input: { ingredient: "rice" },
          }],
        });
      }
      if (inferenceNumber === 2) {
        assert.match(JSON.stringify(body?.messages), /Test Dish/);
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: "tool-lookup",
            name: "lookup_mealdb_meal",
            input: { mealId: "42" },
          }],
        });
      }
      return jsonResponse({
        content: [{
          type: "text",
          text: JSON.stringify({
            candidates: [{ mealId: "42", reason: "The recipe lists rice." }],
            evidenceSummary: "TheMealDB returned the meal and recipe details.",
            unresolvedIssues: [],
          }),
        }],
      });
    }

    if (url.includes("filter.php")) {
      assert.match(url, /test-mealdb-key/);
      return jsonResponse({ meals: [{ idMeal: "42", strMeal: "Test Dish", strMealThumb: null }] });
    }
    if (url.includes("lookup.php")) {
      return jsonResponse({
        meals: [{
          idMeal: "42",
          strMeal: "Test Dish",
          strIngredient1: "Rice",
          strMeasure1: "1 cup",
          strIngredient2: "",
          strInstructions: "Cook the rice.",
          strSource: null,
        }],
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  const result = await findCandidateMeals({ ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "completed");
  assert.equal(result.candidates[0]?.name, "Test Dish");
  assert.deepEqual(result.candidates[0]?.ingredients, [{ name: "Rice", measure: "1 cup" }]);
  assert.equal(requests.filter((request) => request.url.includes("api.anthropic.com")).length, 3);
  assert.equal(requests.filter((request) => request.url.includes("themealdb.com")).length, 2);
});

test("rejects searches for ingredients that were not in the validated request", async () => {
  const fetchMock: typeof fetch = async (input) => {
    if (String(input).includes("api.anthropic.com")) {
      return jsonResponse({
        content: [{
          type: "tool_use",
          id: "invalid-search",
          name: "search_mealdb_by_ingredient",
          input: { ingredient: "not supplied" },
        }],
      });
    }
    throw new Error("The invalid search must not reach TheMealDB.");
  };

  const result = await findCandidateMeals({ ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "escalated_to_human");
  assert.equal(result.candidates.length, 0);
});

test("returns a handoff result when Claude inference fails", async () => {
  const fetchMock: typeof fetch = async () =>
    jsonResponse({ error: { message: "invalid API key" } }, 401);

  const result = await findCandidateMeals({ ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "escalated_to_human");
  assert.match(result.evidenceSummary, /HTTP 401/);
  assert.equal(result.nextTask, "Cookable workflow owner");
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
