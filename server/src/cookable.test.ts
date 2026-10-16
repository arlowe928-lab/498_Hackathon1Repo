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
      requestId: "request-1",
      ingredients: ["rice", "beans"],
      allergies: ["peanuts"],
      cookingTimeMinutes: 30,
      budget: 12,
    }),
    {
      requestId: "request-1",
      ingredients: ["rice", "beans"],
      allergies: ["peanuts"],
      cookingTimeMinutes: 30,
      budget: 12,
    },
  );
  assert.equal(parseMealRequest({ requestId: "request-1", ingredients: [] }), null);
  assert.equal(parseMealRequest({ requestId: "request-1", ingredients: ["rice"], allergies: [""] }), null);
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

  const result = await findCandidateMeals({ requestId: "request-1", ingredients: ["rice"] }, config, fetchMock);

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

  const result = await findCandidateMeals({ requestId: "request-1", ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "search_incomplete");
  assert.equal(result.candidates.length, 0);
  assert.equal(result.nextTask, "T6");
});

test("returns a handoff result when Claude inference fails", async () => {
  const fetchMock: typeof fetch = async () =>
    jsonResponse({ error: { message: "invalid API key" } }, 401);

  const result = await findCandidateMeals({ requestId: "request-1", ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "search_incomplete");
  assert.match(result.evidenceSummary, /HTTP 401/);
  assert.equal(result.nextTask, "T6");
});

test("allows each TheMealDB result to inform the next action and enforces both call limits", async () => {
  const requests: string[] = [];
  let inferenceCalls = 0;
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.includes("api.anthropic.com")) {
      inferenceCalls += 1;
      if (inferenceCalls <= 5) {
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: `search-${inferenceCalls}`,
            name: "search_mealdb_by_ingredient",
            input: { ingredient: ["rice", "beans", "tomato", "onion", "carrot"][inferenceCalls - 1] },
          }],
        });
      }
      return jsonResponse({
        content: [{
          type: "text",
          text: JSON.stringify({
            candidates: [],
            evidenceSummary: "No candidate was supported.",
            unresolvedIssues: [],
          }),
        }],
      });
    }
    return jsonResponse({ meals: [] });
  };

  const result = await findCandidateMeals({
    requestId: "request-1",
    ingredients: ["rice", "beans", "tomato", "onion", "carrot"],
  }, config, fetchMock);
  const mealDbCalls = requests.filter((url) => url.includes("themealdb.com")).length;

  assert.equal(result.status, "completed");
  assert.equal(mealDbCalls, 5);
  assert.equal(inferenceCalls, 6);
  assert.equal(result.nextTask, "T5");
  assert.equal(result.requestId, "request-1");
});

test("returns an empty completed candidate set when successful searches find no meals", async () => {
  let inferenceCalls = 0;
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.anthropic.com")) {
      inferenceCalls += 1;
      if (inferenceCalls === 1) {
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: "empty-search",
            name: "search_mealdb_by_ingredient",
            input: { ingredient: "rice" },
          }],
        });
      }
      return jsonResponse({
        content: [{
          type: "text",
          text: JSON.stringify({
            candidates: [],
            evidenceSummary: "The completed TheMealDB search returned no meals.",
            unresolvedIssues: [],
          }),
        }],
      });
    }
    return jsonResponse({ meals: null });
  };

  const result = await findCandidateMeals({ requestId: "request-1", ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "completed");
  assert.deepEqual(result.candidates, []);
  assert.equal(result.nextTask, "T5");
  assert.match(result.evidenceSummary, /search returned no meals/);
});

test("returns an empty completed candidate set when search results contain no supported candidate", async () => {
  let inferenceCalls = 0;
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.anthropic.com")) {
      inferenceCalls += 1;
      if (inferenceCalls === 1) {
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: "search-with-results",
            name: "search_mealdb_by_ingredient",
            input: { ingredient: "rice" },
          }],
        });
      }
      return jsonResponse({
        content: [{
          type: "text",
          text: JSON.stringify({
            candidates: [],
            evidenceSummary: "The completed search results did not support a relevant candidate.",
            unresolvedIssues: [],
          }),
        }],
      });
    }
    return jsonResponse({ meals: [{ idMeal: "17", strMeal: "Unrelated Dish" }] });
  };

  const result = await findCandidateMeals({ requestId: "request-1", ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "completed");
  assert.deepEqual(result.candidates, []);
  assert.equal(result.nextTask, "T5");
});

test("rejects ungrounded candidate IDs instead of treating them as an empty completed search", async () => {
  let inferenceCalls = 0;
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.anthropic.com")) {
      inferenceCalls += 1;
      if (inferenceCalls === 1) {
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: "search-grounding",
            name: "search_mealdb_by_ingredient",
            input: { ingredient: "rice" },
          }],
        });
      }
      return jsonResponse({
        content: [{
          type: "text",
          text: JSON.stringify({
            candidates: [{ mealId: "not-returned-by-search", reason: "Unsupported candidate." }],
            evidenceSummary: "Invalid candidate reference.",
            unresolvedIssues: [],
          }),
        }],
      });
    }
    return jsonResponse({ meals: [{ idMeal: "17", strMeal: "Test Dish" }] });
  };

  const result = await findCandidateMeals({ requestId: "request-1", ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "search_incomplete");
  assert.equal(result.candidates.length, 0);
  assert.equal(result.nextTask, "T6");
  assert.match(result.evidenceSummary, /not grounded/);
});

test("hands off an incomplete search when a TheMealDB request fails despite an earlier result", async () => {
  let inferenceCalls = 0;
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.anthropic.com")) {
      inferenceCalls += 1;
      if (inferenceCalls === 1) {
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: "search-before-failure",
            name: "search_mealdb_by_ingredient",
            input: { ingredient: "rice" },
          }],
        });
      }
      if (inferenceCalls === 2) {
        return jsonResponse({
          content: [{
            type: "tool_use",
            id: "lookup-failure",
            name: "lookup_mealdb_meal",
            input: { mealId: "42" },
          }],
        });
      }
      return jsonResponse({
        content: [{
          type: "text",
          text: JSON.stringify({
            candidates: [{ mealId: "42", reason: "A search returned this meal." }],
            evidenceSummary: "A candidate was found before the lookup failed.",
            unresolvedIssues: [],
          }),
        }],
      });
    }
    if (url.includes("filter.php")) {
      return jsonResponse({ meals: [{ idMeal: "42", strMeal: "Test Dish" }] });
    }
    return jsonResponse({ meals: null }, 503);
  };

  const result = await findCandidateMeals({ requestId: "request-1", ingredients: ["rice"] }, config, fetchMock);

  assert.equal(result.status, "search_incomplete");
  assert.equal(result.candidates.length, 0);
  assert.equal(result.nextTask, "T6");
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
