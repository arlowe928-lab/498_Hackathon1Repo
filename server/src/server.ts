import { createServer } from "node:http";
import { findCandidateMeals, parseMealRequest, type CookableConfig } from "./cookable.js";

const port = Number(process.env.PORT ?? "3000");

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json; charset=utf-8");

  if (request.method !== "POST" || request.url !== "/api/meals/candidates") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  let body: unknown;
  try {
    body = await readRequestBody(request);
  } catch (error) {
    sendJson(response, error instanceof RequestTooLargeError ? 413 : 400, {
      error: error instanceof RequestTooLargeError ? "Request body is too large." : "Request body must be valid JSON.",
    });
    return;
  }

  const mealRequest = parseMealRequest(body);
  if (!mealRequest) {
    sendJson(response, 400, {
      error: "Provide ingredients and valid optional preferences, constraints, and budget fields.",
    });
    return;
  }

  try {
    const config = readConfig();
    const result = await findCandidateMeals(mealRequest, config);
    sendJson(response, result.status === "completed" ? 200 : 502, result);
  } catch (error) {
    console.error("Cookable candidate search failed:", error instanceof Error ? error.message : "Unknown error");
    sendJson(response, 502, {
      error: "Candidate search could not be completed. Check server logs and service configuration.",
      requestId: mealRequest.requestId,
      status: "search_incomplete",
      candidates: [],
      evidenceSummary: "Candidate search failed before it could be completed.",
      unresolvedIssues: ["Check server logs and service configuration before retrying."],
      handoffNote: "The search is incomplete; this does not establish that no suitable meal exists.",
      nextTask: "T6",
    });
  }
});

server.listen(port, () => {
  console.log(`Cookable server listening on http://localhost:${port}`);
});

function readConfig(): CookableConfig {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const themealdbApiKey = process.env.THEMEALDB_API_KEY;
  const missing: string[] = [];
  if (!anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (!themealdbApiKey) missing.push("THEMEALDB_API_KEY");
  if (missing.length > 0) {
    throw new Error(`Missing required server environment variable(s): ${missing.join(", ")}`);
  }
  if (!anthropicApiKey || !themealdbApiKey) {
    throw new Error("The required server API keys are unavailable.");
  }
  return { anthropicApiKey, themealdbApiKey };
}

async function readRequestBody(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > 1_000_000) throw new RequestTooLargeError();
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status);
  response.end(JSON.stringify(body));
}

class RequestTooLargeError extends Error {}
