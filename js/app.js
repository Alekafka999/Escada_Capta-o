const DEFAULT_STEP_VALUE = 10000;
const DEFAULT_MILESTONES = [100000];
const SETTINGS_STORAGE_KEY = "escada-captacao-settings";
const STORAGE_KEY = "escada-captacao-entries";
const MAX_STEPS = 100;
const MAX_MILESTONES = 20;

const state = {
  settings: loadSettings(),
  entries: loadEntries(),
};

const elements = {
  settingsForm: document.querySelector("[data-settings-form]"),
  settingsFeedback: document.querySelector("[data-settings-feedback]"),
  milestonesList: document.querySelector("[data-milestones-list]"),
  activeStageCopy: document.querySelector("[data-active-stage-copy]"),
  form: document.querySelector("[data-entry-form]"),
  feedback: document.querySelector("[data-form-feedback]"),
  totalCaptured: document.querySelector("[data-total-captured]"),
  totalGoal: document.querySelector("[data-total-goal]"),
  totalRemaining: document.querySelector("[data-total-remaining]"),
  staircaseTitle: document.querySelector("[data-staircase-title]"),
  progressCopy: document.querySelector("[data-progress-copy]"),
  progressStart: document.querySelector("[data-progress-start]"),
  progressGoal: document.querySelector("[data-progress-goal]"),
  progressFill: document.querySelector("[data-progress-fill]"),
  staircase: document.querySelector("[data-staircase]"),
  entriesList: document.querySelector("[data-entries-list]"),
  emptyState: document.querySelector("[data-empty-state]"),
  footerTotal: document.querySelector("[data-footer-total]"),
  goalBanner: document.querySelector("[data-goal-banner]"),
  goalHeadline: document.querySelector("[data-goal-headline]"),
  goalDescription: document.querySelector("[data-goal-description]"),
  clearAll: document.querySelector("[data-clear-all]"),
};

bootstrap();

function bootstrap() {
  bindEvents();
  syncSettingsInputs();
  render();
}

function bindEvents() {
  elements.settingsForm.addEventListener("submit", handleSettingsSubmit);
  elements.milestonesList.addEventListener("click", handleMilestoneListClick);
  elements.form.addEventListener("submit", handleSubmit);
  elements.entriesList.addEventListener("click", handleListClick);
  elements.clearAll.addEventListener("click", handleClearAll);
}

function handleSettingsSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.settingsForm);
  const rawStepValue = String(formData.get("stepValue") || "").trim();
  const rawMilestoneValue = String(formData.get("milestoneValue") || "").trim();
  const stepValue = parseCurrencyInput(rawStepValue);

  if (!Number.isFinite(stepValue) || stepValue <= 0) {
    setSettingsFeedback("Informe um valor valido para cada degrau.", true);
    return;
  }

  let milestones = state.settings.milestones.slice();

  if (rawMilestoneValue) {
    const milestoneValue = parseCurrencyInput(rawMilestoneValue);

    if (!Number.isFinite(milestoneValue) || milestoneValue <= 0) {
      setSettingsFeedback("Informe uma meta acumulada valida.", true);
      return;
    }

    if (milestones.some((milestone) => areSameNumber(milestone, milestoneValue))) {
      setSettingsFeedback("Essa meta ja existe na jornada.", true);
      return;
    }

    milestones.push(milestoneValue);
  }

  milestones = normalizeMilestones(milestones);

  if (milestones.length === 0) {
    setSettingsFeedback("Cadastre ao menos uma meta acumulada para montar a jornada.", true);
    return;
  }

  if (milestones.length > MAX_MILESTONES) {
    setSettingsFeedback(`Use no maximo ${MAX_MILESTONES} metas acumuladas.`, true);
    return;
  }

  const stageValidation = validateStages(stepValue, milestones);

  if (!stageValidation.valid) {
    setSettingsFeedback(
      `A etapa ate ${formatBRL(stageValidation.milestone)} precisa de mais de ${MAX_STEPS} degraus.`,
      true
    );
    return;
  }

  state.settings = {
    stepValue,
    milestones,
  };

  saveSettings();
  syncSettingsInputs();
  elements.settingsForm.elements.milestoneValue.value = "";

  const successMessage = rawMilestoneValue
    ? "Jornada atualizada e nova meta acumulada adicionada."
    : "Configuracao da jornada atualizada com sucesso.";

  setSettingsFeedback(successMessage, false);
  render();
}

function handleMilestoneListClick(event) {
  const button = event.target.closest("[data-remove-milestone]");

  if (!button) {
    return;
  }

  if (state.settings.milestones.length === 1) {
    setSettingsFeedback("A jornada precisa manter pelo menos uma meta acumulada.", true);
    return;
  }

  const milestoneValue = Number(button.dataset.removeMilestone);

  if (!Number.isFinite(milestoneValue)) {
    return;
  }

  const nextMilestones = state.settings.milestones.filter(
    (milestone) => !areSameNumber(milestone, milestoneValue)
  );

  const stageValidation = validateStages(state.settings.stepValue, nextMilestones);

  if (!stageValidation.valid) {
    setSettingsFeedback(
      `Sem esse marco, a etapa ate ${formatBRL(stageValidation.milestone)} passaria de ${MAX_STEPS} degraus.`,
      true
    );
    return;
  }

  state.settings.milestones = nextMilestones;

  saveSettings();
  setSettingsFeedback("Meta acumulada removida da jornada.", false);
  render();
}

function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.form);
  const label = String(formData.get("label") || "").trim();
  const rawAmount = String(formData.get("amount") || "").trim();
  const amount = parseCurrencyInput(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    setFeedback("Informe um valor valido, maior que zero.", true);
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
    setFeedback("Nao ha aportes registrados para limpar.", true);
    return;
  }

  state.entries = [];
  saveEntries();
  setFeedback("Todos os aportes foram removidos com sucesso.", false);
  render();
}

function render() {
  const totalCaptured = getTotalCaptured();
  const journey = getJourneySnapshot(totalCaptured);
  const remaining = Math.max(journey.currentMilestone - totalCaptured, 0);
  const stageProgressPercent =
    journey.stageGoal > 0 ? Math.min((journey.stageCaptured / journey.stageGoal) * 100, 100) : 100;

  elements.totalCaptured.textContent = formatBRL(totalCaptured);
  elements.totalGoal.textContent = formatBRL(journey.currentMilestone);
  elements.totalRemaining.textContent = formatBRL(remaining);
  elements.footerTotal.textContent = formatBRL(totalCaptured);
  elements.footerTotal.dataset.goalReached = String(totalCaptured >= journey.currentMilestone);
  elements.staircaseTitle.textContent = getStaircaseTitle(journey);
  elements.progressCopy.textContent = `${stageProgressPercent.toFixed(1).replace(".", ",")}% do estagio atual concluido`;
  elements.progressStart.textContent = formatBRL(journey.previousMilestone);
  elements.progressGoal.textContent = formatBRL(journey.currentMilestone);
  elements.progressFill.style.width = `${stageProgressPercent}%`;
  elements.activeStageCopy.textContent = `Etapa ${formatBRL(journey.previousMilestone)} -> ${formatBRL(journey.currentMilestone)}`;
  elements.goalBanner.hidden = !journey.allMilestonesCompleted;
  elements.goalHeadline.textContent = `Voce concluiu todas as metas ate ${formatBRL(journey.lastMilestone)}.`;
  elements.goalDescription.textContent = "Cadastre uma nova meta acumulada para abrir a proxima etapa.";

  renderMilestones(journey, totalCaptured);
  renderStaircase(journey.stepCapacities);
  renderEntries();
  updateStaircase(journey.stepCapacities, journey.stageCaptured);
}

function renderMilestones(journey, totalCaptured) {
  const markup = state.settings.milestones
    .map((milestone, index) => {
      const previousMilestone = index > 0 ? state.settings.milestones[index - 1] : 0;
      const stageValue = milestone - previousMilestone;
      const stageState = getMilestoneState(index, milestone, journey.activeIndex, totalCaptured);
      const badgeLabel = getMilestoneBadge(stageState);
      const subtitle = previousMilestone > 0
        ? `${formatBRL(previousMilestone)} -> ${formatBRL(milestone)} | Etapa de ${formatBRL(stageValue)}`
        : `Primeiro marco da jornada | Etapa de ${formatBRL(stageValue)}`;

      return `
        <article class="milestone-item" data-state="${stageState}">
          <span class="milestone-marker">${index + 1}</span>
          <div class="milestone-copy">
            <strong>${formatBRL(milestone)}</strong>
            <span>${subtitle}</span>
          </div>
          <div class="milestone-actions">
            <span class="milestone-badge">${badgeLabel}</span>
            <button
              class="danger-button milestone-remove"
              type="button"
              data-remove-milestone="${milestone}"
            >
              Remover
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.milestonesList.innerHTML = markup;
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

function renderStaircase(stepCapacities) {
  const markup = stepCapacities
    .map((capacity, index) => {
      const stepNumber = index + 1;
      const stepHeight = getStepHeight(index, stepCapacities.length);

      return `
        <div class="step" data-step="${stepNumber}" data-step-capacity="${capacity}" style="height:${stepHeight}px">
          <div class="step-fill" data-step-fill></div>
          <span class="step-label">${stepNumber}</span>
        </div>
      `;
    })
    .join("");

  elements.staircase.style.gridTemplateColumns = `repeat(${stepCapacities.length}, minmax(52px, 1fr))`;
  elements.staircase.innerHTML = markup;
}

function updateStaircase(stepCapacities, stageCaptured) {
  const steps = elements.staircase.querySelectorAll("[data-step]");
  let remainingCaptured = stageCaptured;

  steps.forEach((stepElement, index) => {
    const capacity = stepCapacities[index];
    const fill = stepElement.querySelector("[data-step-fill]");
    const fillRatio = Math.max(0, Math.min(remainingCaptured / capacity, 1));
    const isFull = fillRatio >= 1;
    const isPartial = fillRatio > 0 && fillRatio < 1;

    stepElement.dataset.state = isFull ? "full" : isPartial ? "partial" : "empty";
    fill.style.height = `${fillRatio * 100}%`;
    remainingCaptured -= capacity;
  });
}

function getJourneySnapshot(totalCaptured) {
  const milestones = state.settings.milestones;
  const firstIncompleteIndex = milestones.findIndex((milestone) => totalCaptured < milestone);
  const activeIndex = firstIncompleteIndex === -1 ? milestones.length - 1 : firstIncompleteIndex;
  const previousMilestone = activeIndex > 0 ? milestones[activeIndex - 1] : 0;
  const currentMilestone = milestones[activeIndex];
  const lastMilestone = milestones[milestones.length - 1];
  const allMilestonesCompleted = totalCaptured >= lastMilestone;
  const stageGoal = Math.max(currentMilestone - previousMilestone, 0);
  const rawStageCaptured = totalCaptured - previousMilestone;
  const stageCaptured = allMilestonesCompleted
    ? stageGoal
    : Math.max(0, Math.min(rawStageCaptured, stageGoal));

  return {
    activeIndex,
    allMilestonesCompleted,
    currentMilestone,
    lastMilestone,
    previousMilestone,
    stageCaptured,
    stageGoal,
    stepCapacities: getStepCapacities(stageGoal),
  };
}

function getTotalCaptured() {
  return state.entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function getStepCapacities(stageGoal) {
  const capacities = [];
  let remainingGoal = stageGoal;

  while (remainingGoal > 0 && capacities.length < MAX_STEPS) {
    const capacity = Math.min(state.settings.stepValue, remainingGoal);
    capacities.push(capacity);
    remainingGoal -= capacity;
  }

  return capacities.length > 0 ? capacities : [state.settings.stepValue];
}

function getStepHeight(index, totalSteps) {
  const minHeight = 48;
  const maxHeight = 280;
  const denominator = Math.max(totalSteps - 1, 1);

  return Math.round(minHeight + (index / denominator) * (maxHeight - minHeight));
}

function getStaircaseTitle(journey) {
  const totalSteps = journey.stepCapacities.length;
  return `${totalSteps} degraus entre ${formatBRL(journey.previousMilestone)} e ${formatBRL(journey.currentMilestone)}`;
}

function getMilestoneState(index, milestone, activeIndex, totalCaptured) {
  if (totalCaptured >= milestone) {
    return "completed";
  }

  if (index === activeIndex) {
    return "current";
  }

  return "upcoming";
}

function getMilestoneBadge(stateValue) {
  if (stateValue === "completed") {
    return "Concluida";
  }

  if (stateValue === "current") {
    return "Atual";
  }

  return "Proxima";
}

function validateStages(stepValue, milestones) {
  let previousMilestone = 0;

  for (const milestone of milestones) {
    const stageValue = milestone - previousMilestone;
    const stageSteps = Math.ceil(stageValue / stepValue);

    if (stageSteps > MAX_STEPS) {
      return {
        valid: false,
        milestone,
      };
    }

    previousMilestone = milestone;
  }

  return { valid: true };
}

function normalizeMilestones(values) {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right)
    .filter((value, index, array) => index === 0 || !areSameNumber(value, array[index - 1]));
}

function areSameNumber(left, right) {
  return Math.abs(left - right) < 0.0001;
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

function formatNumberInput(value) {
  const hasFraction = !Number.isInteger(value);

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponivel";
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

function setSettingsFeedback(message, isError) {
  elements.settingsFeedback.textContent = message;
  elements.settingsFeedback.dataset.state = isError ? "error" : "success";
}

function syncSettingsInputs() {
  elements.settingsForm.elements.stepValue.value = formatNumberInput(state.settings.stepValue);
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function getDefaultSettings() {
  return {
    stepValue: DEFAULT_STEP_VALUE,
    milestones: DEFAULT_MILESTONES.slice(),
  };
}

function loadSettings() {
  try {
    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!rawSettings) {
      return getDefaultSettings();
    }

    const parsedSettings = JSON.parse(rawSettings);
    const stepValue = Number(parsedSettings?.stepValue);
    const rawMilestones = Array.isArray(parsedSettings?.milestones)
      ? parsedSettings.milestones
      : [parsedSettings?.goalValue];
    const milestones = normalizeMilestones(rawMilestones);

    if (!Number.isFinite(stepValue) || stepValue <= 0) {
      return getDefaultSettings();
    }

    if (milestones.length === 0 || milestones.length > MAX_MILESTONES) {
      return getDefaultSettings();
    }

    if (!validateStages(stepValue, milestones).valid) {
      return getDefaultSettings();
    }

    return {
      stepValue,
      milestones,
    };
  } catch {
    return getDefaultSettings();
  }
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
