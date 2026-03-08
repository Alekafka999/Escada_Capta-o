const STEP_VALUE = 10000;
const TOTAL_STEPS = 10;
const TOTAL_GOAL = STEP_VALUE * TOTAL_STEPS;
const STORAGE_KEY = "escada-captacao-entries";

const state = {
  entries: loadEntries(),
};

const elements = {
  form: document.querySelector("[data-entry-form]"),
  feedback: document.querySelector("[data-form-feedback]"),
  totalCaptured: document.querySelector("[data-total-captured]"),
  totalGoal: document.querySelector("[data-total-goal]"),
  totalRemaining: document.querySelector("[data-total-remaining]"),
  progressCopy: document.querySelector("[data-progress-copy]"),
  progressFill: document.querySelector("[data-progress-fill]"),
  staircase: document.querySelector("[data-staircase]"),
  entriesList: document.querySelector("[data-entries-list]"),
  emptyState: document.querySelector("[data-empty-state]"),
  footerTotal: document.querySelector("[data-footer-total]"),
  goalBanner: document.querySelector("[data-goal-banner]"),
  clearAll: document.querySelector("[data-clear-all]"),
};

bootstrap();

function bootstrap() {
  renderStaircase();
  bindEvents();
  render();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleSubmit);
  elements.entriesList.addEventListener("click", handleListClick);
  elements.clearAll.addEventListener("click", handleClearAll);
}

function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.form);
  const label = String(formData.get("label") || "").trim();
  const rawAmount = String(formData.get("amount") || "").trim();
  const amount = parseCurrencyInput(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    setFeedback("Informe um valor válido, maior que zero.", true);
    return;
  }

  state.entries.push({
    id: createId(),
    label: label || `Aporte ${state.entries.length + 1}`,
    amount,
    createdAt: new Date().toISOString(),
  });

  saveEntries();
  elements.form.reset();
  setFeedback("Aporte registrado com sucesso.", false);
  render();
}

function handleListClick(event) {
  const button = event.target.closest("[data-remove-entry]");

  if (!button) {
    return;
  }

  const { entryId } = button.dataset;
  state.entries = state.entries.filter((entry) => entry.id !== entryId);
  saveEntries();
  setFeedback("Aporte removido com sucesso.", false);
  render();
}

function handleClearAll() {
  if (state.entries.length === 0) {
    setFeedback("Não há aportes registrados para limpar.", true);
    return;
  }

  state.entries = [];
  saveEntries();
  setFeedback("Todos os aportes foram removidos com sucesso.", false);
  render();
}

function render() {
  const total = getTotalCaptured();
  const filledSteps = Math.min(Math.floor(total / STEP_VALUE), TOTAL_STEPS);
  const partialFill = Math.min((total % STEP_VALUE) / STEP_VALUE, 1);
  const progressPercent = Math.min((total / TOTAL_GOAL) * 100, 100);
  const remaining = Math.max(TOTAL_GOAL - total, 0);

  elements.totalCaptured.textContent = formatBRL(total);
  elements.totalGoal.textContent = formatBRL(TOTAL_GOAL);
  elements.totalRemaining.textContent = formatBRL(remaining);
  elements.footerTotal.textContent = formatBRL(total);
  elements.footerTotal.dataset.goalReached = String(total >= TOTAL_GOAL);
  elements.progressCopy.textContent = `${progressPercent.toFixed(1).replace(".", ",")}% da meta atingida`;
  elements.progressFill.style.width = `${progressPercent}%`;
  elements.goalBanner.hidden = total < TOTAL_GOAL;

  renderEntries();
  updateStaircase(filledSteps, partialFill);
}

function renderEntries() {
  if (state.entries.length === 0) {
    elements.entriesList.innerHTML = "";
    elements.entriesList.hidden = true;
    elements.emptyState.hidden = false;
    elements.clearAll.disabled = true;
    return;
  }

  const markup = state.entries
    .slice()
    .reverse()
    .map((entry, index) => {
      const position = state.entries.length - index;
      return `
        <article class="entry-item">
          <div class="entry-meta">
            <span class="entry-index">${position}</span>
            <div>
              <strong>${escapeHtml(entry.label)}</strong>
              <p>${formatDate(entry.createdAt)}</p>
            </div>
          </div>
          <div class="entry-actions">
            <strong>${formatBRL(entry.amount)}</strong>
            <button class="danger-button" type="button" data-remove-entry data-entry-id="${entry.id}">
              Remover
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.entriesList.innerHTML = markup;
  elements.entriesList.hidden = false;
  elements.emptyState.hidden = true;
  elements.clearAll.disabled = false;
}

function renderStaircase() {
  const markup = Array.from({ length: TOTAL_STEPS }, (_, index) => {
    const stepNumber = index + 1;
    const stepHeight = 28 + index * 24;

    return `
      <div class="step" data-step="${stepNumber}" style="height:${stepHeight}px">
        <div class="step-fill" data-step-fill></div>
        <span class="step-label">${stepNumber}</span>
      </div>
    `;
  }).join("");

  elements.staircase.innerHTML = markup;
}

function updateStaircase(filledSteps, partialFill) {
  const steps = elements.staircase.querySelectorAll("[data-step]");

  steps.forEach((stepElement, index) => {
    const stepNumber = index + 1;
    const fill = stepElement.querySelector("[data-step-fill]");
    const isFull = stepNumber <= filledSteps;
    const isPartial = stepNumber === filledSteps + 1 && partialFill > 0;

    stepElement.dataset.state = isFull ? "full" : isPartial ? "partial" : "empty";
    fill.style.height = isFull ? "100%" : isPartial ? `${partialFill * 100}%` : "0%";
  });
}

function getTotalCaptured() {
  return state.entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function parseCurrencyInput(value) {
  if (!value) {
    return Number.NaN;
  }

  const sanitized = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return Number.parseFloat(sanitized);
}

function formatBRL(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function setFeedback(message, isError) {
  elements.feedback.textContent = message;
  elements.feedback.dataset.state = isError ? "error" : "success";
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function loadEntries() {
  try {
    const rawEntries = localStorage.getItem(STORAGE_KEY);

    if (!rawEntries) {
      return [];
    }

    const parsedEntries = JSON.parse(rawEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries
      .filter((entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.label === "string" &&
        Number.isFinite(entry.amount)
      )
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        amount: entry.amount,
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
