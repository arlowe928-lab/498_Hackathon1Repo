const panel = document.querySelector("#workflow-panel");
const statusBar = document.querySelector("#workflow-status");
const statusText = document.querySelector("#status-text");

const state = {
  task: null,
  request: null,
  requestId: null,
  clientToken: null,
  clarificationGaps: [],
  revisionContext: "",
  revisionNotes: "",
  candidateResult: null,
  screenedMeals: [],
  rankedMeals: [],
  busy: false,
  activeIntakeMode: "T1",
  intakeReturnView: null,
  searchController: null,
};

document.querySelector("#start-button").addEventListener("click", () => {
  showIntake("T1");
});

function setTask(task, message) {
  state.task = task;
  statusText.textContent = message;
  statusBar.dataset.state = state.busy ? "working" : "ready";
}

function heading(task, title, detail, body) {
  panel.innerHTML = `
    <article class="task-card">
      <div class="task-heading">
        <div><p class="eyebrow">COOKABLE</p><h2 tabindex="-1">${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p></div>
      </div>
      ${body}
    </article>
    <p class="safety-note"><strong>A quick note:</strong> Always check the recipe and ingredient labels yourself, especially for allergies or dietary needs.</p>`;
  panel.querySelector(".task-heading h2")?.focus({ preventScroll: true });
}

function showIntake(mode, gaps = []) {
  const editing = mode === "T3";
  state.activeIntakeMode = mode;
  const req = state.request ?? {};
  const gapText = gaps.length
    ? `<div class="notice">A little more detail will help us find the right ideas: ${gaps.map(escapeHtml).join("; ")}.</div>`
    : "";
  const revisionText = state.revisionNotes
    ? `<div class="notice">Your requested update: “${escapeHtml(state.revisionNotes)}”</div>`
    : "";
  const intro = editing
    ? state.revisionContext || "Update the details below so we can look for recipes that fit."
    : "Add your ingredients and choose an answer for each dietary and cooking preference. If you’re not sure, choose “Not sure”—we won’t guess.";

  heading(
    mode,
    editing ? "What would you like to change?" : "What’s in your kitchen?",
    intro,
    `${gapText}${revisionText}
    <form id="request-form">
      <div class="field-grid">
        <div class="field full">
          <label for="ingredients">Ingredients you have</label>
          <textarea id="ingredients" name="ingredients" placeholder="For example: rice, canned beans, tomatoes">${escapeHtml((req.ingredients ?? []).join(", "))}</textarea>
          <span class="field-help">Separate ingredients with commas. Add one or more.</span>
        </div>
        <div class="field full">
          <label for="preferences">Anything else you enjoy? <span class="field-help">Optional, such as vegetarian or mild spice</span></label>
          <input id="preferences" name="preferences" value="${escapeHtml((req.preferences ?? []).join(", "))}" placeholder="e.g. vegetarian, quick cleanup">
        </div>
        ${declarationField("Allergies", "allergies", req.allergyStatus, req.allergies)}
        ${declarationField("Dietary restrictions", "dietary", req.dietStatus, req.dietaryRestrictions)}
        ${limitField("Cooking time", "time", req.timeStatus, req.timeValue, "minutes")}
        ${limitField("Budget", "budget", req.budgetStatus, req.budgetValue, "amount")}
      </div>
      <div id="form-error" class="inline-error" hidden></div>
      <div class="form-actions">
        <button class="button button-primary" type="submit">${editing ? "Update my ideas" : "Find recipe ideas"} <span aria-hidden="true">→</span></button>
        ${editing ? `<button class="button button-quiet" type="button" id="cancel-edit">${intakeBackLabel()}</button>` : ""}
      </div>
    </form>`,
  );

  document.querySelector("#request-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.request = collectRequest();
    state.revisionNotes = "";
    if (!state.requestId) state.requestId = makeId();
    if (!state.clientToken) state.clientToken = makeId();
    runValidation(editing ? "T3" : "T1");
  });
  document.querySelector("#cancel-edit")?.addEventListener("click", returnFromIntake);
}

function intakeBackLabel() {
  if (state.intakeReturnView === "screening") return "Back to recipe review";
  if (state.intakeReturnView === "results") return "Back to my ideas";
  return "Back to previous screen";
}

function returnFromIntake() {
  const destination = state.intakeReturnView;
  state.intakeReturnView = null;
  if (destination === "screening") showScreening();
  else if (destination === "results") showResults();
  else showOutcome();
}

function declarationField(label, name, selected, values) {
  const currentStatus = selected ?? "";
  const currentValue = (values ?? []).join(", ");
  return `<div class="field">
    <label for="${name}-status">${label}</label>
    <select id="${name}-status" name="${name}Status">
      <option value="" ${currentStatus === "" ? "selected" : ""}>Choose one…</option>
      <option value="none" ${currentStatus === "none" ? "selected" : ""}>None</option>
      <option value="specified" ${currentStatus === "specified" ? "selected" : ""}>I have ${label.toLowerCase()}</option>
      <option value="unspecified" ${currentStatus === "unspecified" ? "selected" : ""}>Not sure</option>
    </select>
    <input class="sub-field" id="${name}-value" name="${name}" value="${escapeHtml(currentValue)}" placeholder="Separate entries with commas" style="margin-top:8px" ${currentStatus === "specified" ? "" : "hidden"}>
    <span class="field-help">Choose the closest answer.</span>
  </div>`;
}

function limitField(label, name, selected, value, unit) {
  const currentStatus = selected ?? "";
  const options = name === "time"
    ? [["no-limit", "No limit"], ["specified", "Set a time limit"], ["unspecified", "Not sure"]]
    : [["no-limit", "No limit"], ["specified", "Set a budget"], ["unspecified", "Not sure"]];
  return `<div class="field">
    <label for="${name}-status">${label}</label>
    <select id="${name}-status" name="${name}Status">
      <option value="" ${currentStatus === "" ? "selected" : ""}>Choose one…</option>
      ${options.map(([option, text]) => `<option value="${option}" ${currentStatus === option ? "selected" : ""}>${text}</option>`).join("")}
    </select>
    <div class="field-row sub-field" id="${name}-value-wrap" style="margin-top:8px" ${currentStatus === "specified" ? "" : "hidden"}>
      <input id="${name}-value" name="${name}" type="number" min="${name === "time" ? "1" : "0"}" step="${name === "time" ? "1" : "0.01"}" value="${escapeHtml(value ?? "")}" placeholder="${name === "time" ? "e.g. 30" : "e.g. 15.00"}" aria-label="${label} ${unit}">
      ${name === "budget" ? '            <select id="currency" name="currency" aria-label="Currency"><option value="USD" ${state.request?.currency === "USD" || !state.request?.currency ? "selected" : ""}>USD</option><option value="CAD" ${state.request?.currency === "CAD" ? "selected" : ""}>CAD</option><option value="EUR" ${state.request?.currency === "EUR" ? "selected" : ""}>EUR</option><option value="GBP" ${state.request?.currency === "GBP" ? "selected" : ""}>GBP</option></select>' : `<span class="field-help">${unit}</span>`}
    </div>
    <span class="field-help">Choose the closest answer.</span>
  </div>`;
}

function collectRequest() {
  const values = new FormData(document.querySelector("#request-form"));
  const split = (value) => String(value ?? "").split(/[,\n]/).map((part) => part.trim()).filter(Boolean);
  return {
    ingredients: split(values.get("ingredients")),
    preferences: split(values.get("preferences")),
    allergyStatus: String(values.get("allergiesStatus") ?? ""),
    allergies: split(values.get("allergies")),
    dietStatus: String(values.get("dietaryStatus") ?? ""),
    dietaryRestrictions: split(values.get("dietary")),
    timeStatus: String(values.get("timeStatus") ?? ""),
    timeValue: String(values.get("time") ?? ""),
    budgetStatus: String(values.get("budgetStatus") ?? ""),
    budgetValue: String(values.get("budget") ?? ""),
    currency: String(values.get("currency") ?? "USD"),
  };
}

panel.addEventListener("change", (event) => {
  const name = event.target.name;
  if (name === "allergiesStatus") toggleVisibility("#allergies-value", event.target.value === "specified");
  if (name === "dietaryStatus") toggleVisibility("#dietary-value", event.target.value === "specified");
  if (name === "timeStatus") toggleVisibility("#time-value-wrap", event.target.value === "specified");
  if (name === "budgetStatus") toggleVisibility("#budget-value-wrap", event.target.value === "specified");
});

function toggleVisibility(selector, visible) {
  const element = document.querySelector(selector);
  if (element) element.hidden = !visible;
}

function runValidation(mode) {
  const gaps = [];
  const request = state.request;
  if (!request.ingredients.length) gaps.push("at least one ingredient");
  if (!request.allergyStatus) gaps.push("whether you have any allergies");
  if (request.allergyStatus === "specified" && !request.allergies.length) gaps.push("which allergies apply");
  if (!request.dietStatus) gaps.push("whether you have any dietary restrictions");
  if (request.dietStatus === "specified" && !request.dietaryRestrictions.length) gaps.push("which dietary restrictions apply");
  if (!request.timeStatus) gaps.push("your cooking-time preference");
  if (request.timeStatus === "specified" && (!Number.isFinite(Number(request.timeValue)) || Number(request.timeValue) <= 0)) gaps.push("a cooking time greater than zero minutes");
  if (!request.budgetStatus) gaps.push("your budget preference");
  if (request.budgetStatus === "specified" && (!Number.isFinite(Number(request.budgetValue)) || Number(request.budgetValue) < 0)) gaps.push("a valid budget amount");

  if (gaps.length) {
    state.clarificationGaps = gaps;
    state.revisionContext = "";
    showIntake(mode, gaps);
    setTask("T3", "A few details need your attention.");
    return;
  }
  state.clarificationGaps = [];
  searchCandidates();
}

async function searchCandidates() {
  const apiRequest = {
    requestId: state.requestId,
    ingredients: state.request.ingredients,
    preferences: state.request.preferences,
    allergies: state.request.allergyStatus === "none" ? [] : state.request.allergies,
    dietaryRestrictions: state.request.dietStatus === "none" ? [] : state.request.dietaryRestrictions,
    ...(state.request.timeStatus === "specified" && { cookingTimeMinutes: Number(state.request.timeValue) }),
    ...(state.request.budgetStatus === "specified" && { budget: Number(state.request.budgetValue) }),
    currency: state.request.currency,
  };

  state.busy = true;
  const controller = new AbortController();
  state.searchController = controller;
  statusBar.dataset.state = "working";
  heading("T4", "Finding something delicious.", "We’re looking for recipes that make the most of your ingredients.", `
    <div class="search-indicator"><span class="spinner" aria-hidden="true"></span><span>Looking through recipes…</span></div>
    <p class="field-help">This may take a few moments.</p>
    <div class="form-actions"><button class="button button-quiet" id="search-back" type="button">Back to my details</button></div>`);
  setTask("T4", "Looking for recipe ideas…");
  state.busy = true;
  statusBar.dataset.state = "working";
  document.querySelector("#search-back").addEventListener("click", () => controller.abort());

  try {
    const response = await fetch("/api/meals/candidates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(apiRequest),
      signal: controller.signal,
    });
    state.searchController = null;
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") throw new Error("Invalid response.");
    state.candidateResult = payload;
    state.busy = false;
    if (payload.requestId !== state.requestId) throw new Error("The search response did not match this request.");
    if (payload.status === "search_incomplete") {
      showOutcome();
      return;
    }
    if (!response.ok || payload.status !== "completed" || !Array.isArray(payload.candidates)) {
      throw new Error("Recipe search unavailable.");
    }
    runScreening();
  } catch (error) {
    state.busy = false;
    state.searchController = null;
    if (controller.signal.aborted) {
      showIntake(state.activeIntakeMode);
      return;
    }
    state.candidateResult = {
      requestId: state.requestId,
      status: "search_incomplete",
      candidates: [],
      failureCode: error instanceof TypeError ? "connection" : "unknown",
      evidenceSummary: "Recipe search unavailable.",
      unresolvedIssues: ["Please try again."],
      handoffNote: "The search is incomplete; this does not establish that no suitable meal exists.",
      nextTask: "T6",
    };
    showOutcome();
  }
}

function runScreening() {
  setTask("T5", "Checking the recipe details…");
  const candidates = state.candidateResult.candidates;
  state.screenedMeals = candidates.map((meal) => {
    const reasons = [];
    const ingredientsKnown = Array.isArray(meal.ingredients);
    const ingredientNames = (meal.ingredients ?? []).map((ingredient) => ingredient.name);
    const restrictionMatches = ingredientsKnown
      ? state.request.dietaryRestrictions.filter((restriction) =>
        ingredientNames.some((name) => matchesIngredient(restriction, name))
      )
      : [];
    const dietaryNote = state.request.dietStatus === "specified"
      ? ingredientsKnown
        ? restrictionMatches.length
          ? ""
          : `No listed ingredient matched “${state.request.dietaryRestrictions.join(", ")}”. Check the full recipe; ingredient lists may be incomplete.`
        : `We couldn’t check “${state.request.dietaryRestrictions.join(", ")}” because ingredient details aren’t available.`
      : "";

    if (!ingredientsKnown) reasons.push("The recipe’s ingredient list isn’t available.");
    if (state.request.allergyStatus === "unspecified" || state.request.dietStatus === "unspecified") {
      reasons.push("One of your dietary answers is marked “Not sure.”");
    }
    if (state.request.allergyStatus === "specified") {
      reasons.push("Allergy safety can’t be confirmed from this ingredient list. Check the full recipe and food labels.");
    }
    if (restrictionMatches.length) {
      reasons.push(`Contains ${restrictionMatches.map((restriction) => `“${restriction}”`).join(", ")}, which you listed as a dietary restriction.`);
    }
    if (state.request.timeStatus === "unspecified" || state.request.budgetStatus === "unspecified") {
      reasons.push("One of your time or budget answers is marked “Not sure.”");
    }
    if (state.request.timeStatus === "specified") reasons.push("The recipe doesn’t include a cooking-time estimate.");
    if (state.request.budgetStatus === "specified") reasons.push("The recipe doesn’t include a cost estimate.");

    const matchNames = (meal.ingredients ?? []).map((ingredient) => ingredient.name);
    const available = state.request.ingredients.map(normalize);
    const distinctNames = [...new Map(matchNames.map((name) => [normalize(name), name])).values()];
    const matched = distinctNames.filter((name) => available.includes(normalize(name)));
    const missing = distinctNames.filter((name) => !available.includes(normalize(name)));
    return {
      meal,
      status: restrictionMatches.length
        ? "excluded"
        : reasons.length
          ? "unable_to_assess"
          : "feasible",
      reasons,
      dietaryNote,
      matched,
      missing,
    };
  });

  if (!state.screenedMeals.some((meal) => meal.status === "feasible")) {
    showOutcome();
    return;
  }
  showScreening();
}

function showScreening() {
  const cards = state.screenedMeals.map((item, index) => screeningCard(item, index)).join("");
  heading("T5", "A quick look at these recipes.", "Check the ingredients and choose which recipes you’d like to keep.", `
    <div class="notice">Please check the full recipe and food labels yourself, especially if you have an allergy or dietary restriction. We can’t confirm that a recipe is safe for you.</div>
    <p class="field-help" style="margin:18px 0 7px">Keep a recipe if it looks right for you, skip it if you spot a concern, or mark it unsure.</p>
    <div class="meal-grid">${cards}</div>
    <div id="form-error" class="inline-error" hidden></div>
    <div class="form-actions"><button id="screen-submit" class="button button-primary" type="button">Show my ideas <span aria-hidden="true">→</span></button><button id="screen-back" class="button button-quiet" type="button">Back to my details</button></div>`);
  document.querySelector("#screen-back").addEventListener("click", () => {
    state.intakeReturnView = "screening";
    showIntake("T3");
  });
  document.querySelectorAll(".screen-status").forEach((select) => {
    select.addEventListener("change", () => {
      const reason = document.querySelector(`#reason-${select.dataset.index}`);
      reason.hidden = select.value !== "excluded";
    });
  });
  document.querySelector("#screen-submit").addEventListener("click", () => {
    const firstMissingReason = state.screenedMeals.findIndex((item, index) =>
      document.querySelector(`#screen-status-${index}`)?.value === "excluded" &&
      item.status !== "excluded" &&
      !document.querySelector(`#reason-${index}`)?.value.trim()
    );
    if (firstMissingReason >= 0) {
      showFormError(`Please add the evidence for excluding ${state.screenedMeals[firstMissingReason].meal.name}.`);
      return;
    }
    state.screenedMeals = state.screenedMeals.map((item, index) => {
      const select = document.querySelector(`#screen-status-${index}`);
      const reason = document.querySelector(`#reason-${index}`);
      const status = select?.value ?? item.status;
      const customReason = reason?.value.trim();
      return { ...item, status, reasons: customReason ? [customReason] : item.reasons };
    });
    if (state.screenedMeals.some((item) => item.status === "feasible")) {
      rankMeals();
    } else {
      state.candidateResult.status = "completed";
      showOutcome();
    }
  });
}

function screeningCard(item, index) {
  const meal = item.meal;
  const suggested = item.status;
  const canBeFeasible = suggested === "feasible";
  const options = [
    ["feasible", canBeFeasible ? "Keep — no listed conflict found" : "Can’t keep — listed restriction found", !canBeFeasible],
    ["excluded", "Skip — I found a concern"],
    ["unable_to_assess", "Not sure — I need to check"],
  ];
  const ingredients = meal.ingredients?.map((value) => `${escapeHtml(value.name)}${value.measure ? ` · ${escapeHtml(value.measure)}` : ""}`).join("<br>") ?? "Ingredient details aren’t available.";
  return `<article class="meal-card">
    ${safeHttpUrl(meal.thumbnail) ? `<img class="meal-image" src="${escapeAttr(safeHttpUrl(meal.thumbnail))}" alt="" loading="lazy">` : '<div class="meal-image-placeholder">Recipe photo not available</div>'}
    <div class="meal-body">
      <div class="meal-title-row"><h3>${escapeHtml(meal.name)}</h3></div>
      <p class="meal-meta">${escapeHtml(meal.reason || "A recipe using some of your ingredients.")}</p>
      <div class="meal-ingredients"><b>Recipe ingredients</b>${ingredients}</div>
      ${safeHttpUrl(meal.sourceUrl) ? `<a class="meal-link" href="${escapeAttr(safeHttpUrl(meal.sourceUrl))}" target="_blank" rel="noreferrer">Open recipe source ↗</a>` : ""}
      <div class="meal-review">
        <label class="field-label" for="screen-status-${index}">Would you make this?</label>
        <select class="screen-status" id="screen-status-${index}" data-index="${index}">
          ${options.map(([value, label, disabled]) => `<option value="${value}" ${suggested === value ? "selected" : ""} ${disabled ? "disabled" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
        <p class="field-help">${escapeHtml(item.reasons.join(" ") || item.dietaryNote || `Uses ${item.matched.length} ingredient${item.matched.length === 1 ? "" : "s"} you listed; ${item.missing.length} more ${item.missing.length === 1 ? "ingredient is" : "ingredients are"} listed in the recipe. You may already have some of them.`)}</p>
        <input class="text-input review-reason" id="reason-${index}" type="text" placeholder="Reason for exclusion (required if excluded)" hidden>
      </div>
    </div>
  </article>`;
}

function rankMeals() {
  setTask("T7", "Putting your closest matches first…");
  state.rankedMeals = state.screenedMeals.filter((item) => item.status === "feasible");
  state.rankedMeals.sort((a, b) => {
    if (a.matched.length !== b.matched.length) return b.matched.length - a.matched.length;
    if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
    return 0;
  });
  showResults();
}

function showResults() {
  const cards = state.rankedMeals.map((item, index) => resultCard(item, index + 1)).join("");
  heading("T8", "Here are your meal ideas.", "Recipes that use more of what you have are shown first. Some may need a few extra ingredients.", `
    <div class="notice">Please check the full recipe and food labels yourself, especially if you have an allergy or dietary restriction.</div>
    <div class="meal-grid">${cards}</div>
    <form id="refinement-form">
      <div class="field">
        <label for="refinement">Want to change your request?</label>
        <textarea id="refinement" name="refinement" placeholder="For example: use less spice, avoid dairy, or add lentils"></textarea>
      </div>
      <div class="form-actions">
        <button class="button button-primary" type="submit">Refine these ideas <span aria-hidden="true">→</span></button>
        <button class="button button-secondary" type="button" id="finish-button">Finish</button>
        <button class="button button-quiet" type="button" id="results-back">Back to recipe review</button>
      </div>
    </form>`);
  document.querySelector("#results-back").addEventListener("click", showScreening);
  document.querySelector("#refinement-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.revisionNotes = document.querySelector("#refinement").value.trim();
    if (!state.revisionNotes) {
      showFormError("Tell us what you would like to change, or choose Finish.");
      return;
    }
    state.revisionContext = "Update the details below and we’ll look for a fresh set of ideas.";
    state.intakeReturnView = "results";
    showIntake("T3");
    setTask("T3", "Tell us what you’d like to change.");
  });
  document.querySelector("#finish-button").addEventListener("click", () => {
    heading("T8", "You’re all set.", "Come back any time you’d like another idea.", `
    <div class="empty-state"><h3>Happy cooking.</h3><p>We hope you found something delicious to try.</p></div>
    <div class="form-actions"><button id="new-request" class="button button-primary" type="button">Find another recipe</button></div>`);
    document.querySelector("#new-request").addEventListener("click", resetWorkflow);
  });
}

function resultCard(item, rank) {
  const meal = item.meal;
  const ingredientNames = [...new Set(meal.ingredients?.map((ingredient) => normalize(ingredient.name)) ?? [])];
  const available = state.request.ingredients.map(normalize);
  const matched = ingredientNames.filter((name) => available.includes(name));
  const missing = ingredientNames.filter((name) => !available.includes(name));
  const ingredientSection = meal.ingredients
    ? `<div class="meal-ingredients"><b>Already have (${matched.length})</b>${matched.length ? matched.map(escapeHtml).join(", ") : "No ingredients matched by name"}
       <b style="margin-top:9px">Also in the recipe (${missing.length})</b>${missing.length ? missing.map(escapeHtml).join(", ") : "None"}</div>`
    : `<div class="meal-ingredients"><b>Ingredients</b>Ingredient details aren’t available.</div>`;
  return `<article class="meal-card">
    ${safeHttpUrl(meal.thumbnail) ? `<img class="meal-image" src="${escapeAttr(safeHttpUrl(meal.thumbnail))}" alt="" loading="lazy">` : '<div class="meal-image-placeholder">Recipe photo not available</div>'}
    <div class="meal-body">
      <div class="meal-title-row"><h3>${escapeHtml(meal.name)}</h3><span class="meal-rank">#${rank}</span></div>
      <p class="meal-meta">${escapeHtml(meal.reason || "A recipe using some of your ingredients.")}</p>
      ${ingredientSection}
      ${item.dietaryNote ? `<p class="meal-meta">${escapeHtml(item.dietaryNote)}</p>` : ""}
        <p class="meal-meta">Cooking time: not listed · Cost: not listed</p>
      ${meal.instructions ? `<details><summary class="meal-link">View recipe instructions</summary><p class="meal-instructions">${escapeHtml(meal.instructions)}</p></details>` : ""}
      ${safeHttpUrl(meal.sourceUrl) ? `<a class="meal-link" href="${escapeAttr(safeHttpUrl(meal.sourceUrl))}" target="_blank" rel="noreferrer">Open recipe source ↗</a>` : ""}
    </div>
  </article>`;
}

function showOutcome() {
  const result = state.candidateResult;
  const incomplete = result?.status === "search_incomplete";
  setTask("T6", incomplete ? "We couldn’t finish finding recipes." : "No recipe ideas to show yet.");
  const title = incomplete ? "We couldn’t finish looking." : "No recipe ideas this time.";
  const detail = incomplete
    ? "Something interrupted the search. Please try again, or change your ingredients."
    : state.candidateResult?.candidates?.length
      ? "None of the recipes we found looked like a good fit. You can adjust your request and try again."
      : "We couldn’t find recipes for that combination this time. Try adding another ingredient or changing your request.";
  const evidence = incomplete
    ? `<div class="notice danger">Your request hasn’t been lost. ${escapeHtml(explainSearchFailure(result))}</div>`
    : "";
  const list = !incomplete && state.screenedMeals.length
    ? `<div class="summary-item" style="margin-top:14px"><span>Why these didn’t make the list</span><b>${state.screenedMeals.map((item) => `${escapeHtml(item.meal.name)}: ${escapeHtml(item.reasons.join(" ") || item.status)}`).join("<br>")}</b></div>`
    : "";
  const incompleteChoices = incomplete
    ? `<button id="retry-button" class="button button-primary" type="button">Try again</button><button id="revise-button" class="button button-secondary" type="button">Change my ingredients</button><button id="close-button" class="button button-quiet" type="button">Done for now</button>`
    : `<button id="revise-button" class="button button-primary" type="button">Change my ingredients</button><button id="close-button" class="button button-secondary" type="button">Done for now</button>`;
  heading("T6", title, detail, `
    ${evidence}${list}
    <div class="outcome-actions">${incompleteChoices}</div>`);
  document.querySelector("#retry-button")?.addEventListener("click", searchCandidates);
  document.querySelector("#revise-button").addEventListener("click", () => {
    state.revisionContext = incomplete
      ? "Update the details below and we’ll look again."
      : "Try different ingredients or preferences and we’ll look again.";
    state.revisionNotes = "";
    state.intakeReturnView = "outcome";
    showIntake("T3");
  });
  document.querySelector("#close-button").addEventListener("click", () => {
    heading("T6", "No problem.", "You can come back and look for ideas whenever you like.", `
      <div class="empty-state"><h3>${incomplete ? "Nothing has been changed." : "Your request is all yours."}</h3><p>No recipe was selected. You can start fresh whenever you’re ready.</p></div>
      <div class="form-actions"><button id="new-request" class="button button-primary" type="button">Start over</button></div>`);
    document.querySelector("#new-request").addEventListener("click", resetWorkflow);
  });
}

function explainSearchFailure(result) {
  const details = [
    result?.error,
    result?.evidenceSummary,
    ...(Array.isArray(result?.unresolvedIssues) ? result.unresolvedIssues : []),
  ].filter((value) => typeof value === "string").join(" ").toLocaleLowerCase();

  if (/missing required.*environment|service configuration|server logs/.test(details)) {
    return "The search service may not be configured correctly. Check the terminal where Cookable is running, then verify its local setup. Never share your keys.";
  }
  if (/claude api request failed with http (401|403)/.test(details)) {
    return "The recipe search service couldn’t sign in. Check that its Claude key is valid in your local setup.";
  }
  if (/themealdb.*http (401|403)/.test(details)) {
    return "The recipe catalog couldn’t be reached with the current setup. Check the local MealDB key.";
  }
  if (/http 429|rate limit|quota/.test(details)) {
    return "The recipe search service is temporarily busy or has reached a usage limit. Wait a little and try again.";
  }
  if (/timed out|call limits were reached/.test(details)) {
    return "The search took too long to finish. Try again in a moment, or search with fewer ingredients.";
  }
  if (/http 5\d\d|temporarily unavailable/.test(details)) {
    return "A recipe search service is temporarily unavailable. Wait a little and try again.";
  }
  if (result?.failureCode === "connection") {
    return "Cookable couldn’t connect to the search service. Make sure the app is running, then try again.";
  }
  return "The recipe search service didn’t finish. Try again; if this keeps happening, check the terminal where Cookable is running.";
}

function resetWorkflow() {
  window.location.reload();
}

function showFormError(message) {
  const error = document.querySelector("#form-error");
  if (!error) return;
  error.hidden = false;
  error.textContent = message;
}

function normalize(value) {
  return String(value).trim().toLocaleLowerCase();
}

function matchesIngredient(restriction, ingredientName) {
  const words = (value) => normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word);
  const requested = words(restriction);
  const listed = words(ingredientName);
  if (!requested.length || !listed.length) return false;
  if (requested.length === 1) return listed.includes(requested[0]);
  const shorter = requested.length <= listed.length ? requested : listed;
  const longer = shorter === requested ? listed : requested;
  return shorter.every((word) => longer.includes(word));
}

function makeId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function safeHttpUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
