import { useEffect, useState } from "react";
import "./style/styles.css";

const DEFAULT_STEP_VALUE = 10000;
const DEFAULT_MILESTONES = [100000];
const SETTINGS_STORAGE_KEY = "escada-captacao-settings";
const ENTRIES_STORAGE_KEY = "escada-captacao-entries";
const MAX_STEPS = 100;
const MAX_MILESTONES = 20;

export default function InvestmentStaircase() {
  const [settings, setSettings] = useState(loadSettings);
  const [entries, setEntries] = useState(loadEntries);
  const [stepInput, setStepInput] = useState(() => formatNumberInput(loadSettings().stepValue));
  const [milestoneInput, setMilestoneInput] = useState("");
  const [entryLabel, setEntryLabel] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [settingsFeedback, setSettingsFeedback] = useState({ message: "", isError: false });
  const [entryFeedback, setEntryFeedback] = useState({ message: "", isError: false });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    setStepInput(formatNumberInput(settings.stepValue));
  }, [settings.stepValue]);

  const totalCaptured = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const journey = getJourneySnapshot(settings, totalCaptured);
  const remaining = Math.max(journey.currentMilestone - totalCaptured, 0);
  const stageProgressPercent =
    journey.stageGoal > 0 ? Math.min((journey.stageCaptured / journey.stageGoal) * 100, 100) : 100;

  function handleSettingsSubmit(event) {
    event.preventDefault();

    const stepValue = parseCurrencyInput(stepInput);

    if (!Number.isFinite(stepValue) || stepValue <= 0) {
      setSettingsFeedback({
        message: "Informe um valor valido para cada degrau.",
        isError: true,
      });
      return;
    }

    let milestones = settings.milestones.slice();

    if (milestoneInput.trim()) {
      const milestoneValue = parseCurrencyInput(milestoneInput);

      if (!Number.isFinite(milestoneValue) || milestoneValue <= 0) {
        setSettingsFeedback({
          message: "Informe uma meta acumulada valida.",
          isError: true,
        });
        return;
      }

      if (milestones.some((milestone) => areSameNumber(milestone, milestoneValue))) {
        setSettingsFeedback({
          message: "Essa meta ja existe na jornada.",
          isError: true,
        });
        return;
      }

      milestones.push(milestoneValue);
    }

    milestones = normalizeMilestones(milestones);

    if (milestones.length === 0) {
      setSettingsFeedback({
        message: "Cadastre ao menos uma meta acumulada para montar a jornada.",
        isError: true,
      });
      return;
    }

    if (milestones.length > MAX_MILESTONES) {
      setSettingsFeedback({
        message: `Use no maximo ${MAX_MILESTONES} metas acumuladas.`,
        isError: true,
      });
      return;
    }

    const stageValidation = validateStages(stepValue, milestones);

    if (!stageValidation.valid) {
      setSettingsFeedback({
        message: `A etapa ate ${formatBRL(stageValidation.milestone)} precisa de mais de ${MAX_STEPS} degraus.`,
        isError: true,
      });
      return;
    }

    setSettings({
      stepValue,
      milestones,
    });
    setMilestoneInput("");
    setSettingsFeedback({
      message: milestoneInput.trim()
        ? "Jornada atualizada e nova meta acumulada adicionada."
        : "Configuracao da jornada atualizada com sucesso.",
      isError: false,
    });
  }

  function handleRemoveMilestone(milestoneValue) {
    if (settings.milestones.length === 1) {
      setSettingsFeedback({
        message: "A jornada precisa manter pelo menos uma meta acumulada.",
        isError: true,
      });
      return;
    }

    const nextMilestones = settings.milestones.filter(
      (milestone) => !areSameNumber(milestone, milestoneValue)
    );
    const stageValidation = validateStages(settings.stepValue, nextMilestones);

    if (!stageValidation.valid) {
      setSettingsFeedback({
        message: `Sem esse marco, a etapa ate ${formatBRL(stageValidation.milestone)} passaria de ${MAX_STEPS} degraus.`,
        isError: true,
      });
      return;
    }

    setSettings((current) => ({
      ...current,
      milestones: nextMilestones,
    }));
    setSettingsFeedback({
      message: "Meta acumulada removida da jornada.",
      isError: false,
    });
  }

  function handleAddEntry(event) {
    event.preventDefault();

    const amount = parseCurrencyInput(entryAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setEntryFeedback({
        message: "Informe um valor valido, maior que zero.",
        isError: true,
      });
      return;
    }

    setEntries((current) => [
      ...current,
      {
        id: createId(),
        label: entryLabel.trim() || `Aporte ${current.length + 1}`,
        amount,
        createdAt: new Date().toISOString(),
      },
    ]);
    setEntryLabel("");
    setEntryAmount("");
    setEntryFeedback({
      message: "Aporte registrado com sucesso.",
      isError: false,
    });
  }

  function handleRemoveEntry(entryId) {
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
    setEntryFeedback({
      message: "Aporte removido com sucesso.",
      isError: false,
    });
  }

  function handleClearAll() {
    if (entries.length === 0) {
      setEntryFeedback({
        message: "Nao ha aportes registrados para limpar.",
        isError: true,
      });
      return;
    }

    setEntries([]);
    setEntryFeedback({
      message: "Todos os aportes foram removidos com sucesso.",
      isError: false,
    });
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="hero">
          <p className="eyebrow">Assessoria de investimentos</p>
          <h1>Escada de Captacao</h1>
          <div className="hero-rule" aria-hidden="true" />
        </header>

        <section className="summary-grid" aria-label="Resumo da captacao">
          <article className="summary-card">
            <p className="summary-label">Total captado</p>
            <strong className="summary-value">{formatBRL(totalCaptured)}</strong>
          </article>
          <article className="summary-card">
            <p className="summary-label">Meta atual</p>
            <strong className="summary-value">{formatBRL(journey.currentMilestone)}</strong>
          </article>
          <article className="summary-card">
            <p className="summary-label">Falta captar</p>
            <strong className="summary-value">{formatBRL(remaining)}</strong>
          </article>
        </section>

        <section className="panel" aria-labelledby="settings-title">
          <div className="panel-header">
            <p id="settings-title" className="panel-title">Configurar jornada</p>
          </div>
          <form className="settings-form" onSubmit={handleSettingsSubmit}>
            <label className="field">
              <span>Valor de cada degrau</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 10000"
                value={stepInput}
                onChange={(event) => setStepInput(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Nova meta acumulada</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 50000"
                value={milestoneInput}
                onChange={(event) => setMilestoneInput(event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit">Salvar jornada</button>
          </form>
          <p className="settings-help">As metas sao acumuladas. Exemplo: 10.000, 50.000 e 100.000.</p>
          <div className="milestones-panel">
            <div className="panel-header compact-header">
              <p className="panel-title">Marcos visiveis</p>
              <span className="progress-copy">
                {`Etapa ${formatBRL(journey.previousMilestone)} -> ${formatBRL(journey.currentMilestone)}`}
              </span>
            </div>
            <div className="milestones-list">
              {settings.milestones.map((milestone, index) => {
                const previousMilestone = index > 0 ? settings.milestones[index - 1] : 0;
                const stageValue = milestone - previousMilestone;
                const stateValue = getMilestoneState(index, milestone, journey.activeIndex, totalCaptured);

                return (
                  <article key={milestone} className="milestone-item" data-state={stateValue}>
                    <span className="milestone-marker">{index + 1}</span>
                    <div className="milestone-copy">
                      <strong>{formatBRL(milestone)}</strong>
                      <span>
                        {previousMilestone > 0
                          ? `${formatBRL(previousMilestone)} -> ${formatBRL(milestone)} | Etapa de ${formatBRL(stageValue)}`
                          : `Primeiro marco da jornada | Etapa de ${formatBRL(stageValue)}`}
                      </span>
                    </div>
                    <div className="milestone-actions">
                      <span className="milestone-badge">{getMilestoneBadge(stateValue)}</span>
                      <button
                        className="danger-button milestone-remove"
                        type="button"
                        onClick={() => handleRemoveMilestone(milestone)}
                      >
                        Remover
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <p className="form-feedback" data-state={settingsFeedback.isError ? "error" : "success"}>
            {settingsFeedback.message}
          </p>
        </section>

        <section className="panel staircase-panel" aria-labelledby="staircase-title">
          <div className="panel-header">
            <p id="staircase-title" className="panel-title">
              {`${journey.stepCapacities.length} degraus entre ${formatBRL(journey.previousMilestone)} e ${formatBRL(journey.currentMilestone)}`}
            </p>
            <span className="progress-copy">
              {`${stageProgressPercent.toFixed(1).replace(".", ",")}% do estagio atual concluido`}
            </span>
          </div>
          <div
            className="staircase"
            aria-hidden="true"
            style={{ gridTemplateColumns: `repeat(${journey.stepCapacities.length}, minmax(52px, 1fr))` }}
          >
            {journey.stepCapacities.map((capacity, index) => {
              const stepHeight = getStepHeight(index, journey.stepCapacities.length);
              const fillRatio = Math.max(0, Math.min((journey.stageCaptured - sumUntil(journey.stepCapacities, index)) / capacity, 1));
              const stateValue = fillRatio >= 1 ? "full" : fillRatio > 0 ? "partial" : "empty";

              return (
                <div
                  key={`${capacity}-${index}`}
                  className="step"
                  data-state={stateValue}
                  style={{ height: `${stepHeight}px` }}
                >
                  <div className="step-fill" style={{ height: `${fillRatio * 100}%` }} />
                  <span className="step-label">{index + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="progress-block">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${stageProgressPercent}%` }} />
            </div>
            <div className="progress-labels">
              <span>{formatBRL(journey.previousMilestone)}</span>
              <span>{formatBRL(journey.currentMilestone)}</span>
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="form-title">
          <div className="panel-header">
            <p id="form-title" className="panel-title">Registrar aporte</p>
          </div>
          <form className="entry-form" onSubmit={handleAddEntry}>
            <label className="field">
              <span>Descricao</span>
              <input
                type="text"
                maxLength={80}
                placeholder="Ex.: Cliente XPTO"
                value={entryLabel}
                onChange={(event) => setEntryLabel(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Valor</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 15000,50"
                required
                value={entryAmount}
                onChange={(event) => setEntryAmount(event.target.value)}
              />
            </label>
            <button className="primary-button" type="submit">Adicionar aporte</button>
          </form>
          <p className="form-feedback" data-state={entryFeedback.isError ? "error" : "success"}>
            {entryFeedback.message}
          </p>
        </section>

        <section className="panel entries-panel" aria-labelledby="entries-title">
          <div className="panel-header">
            <p id="entries-title" className="panel-title">Aportes registrados</p>
            <button className="ghost-button" type="button" disabled={entries.length === 0} onClick={handleClearAll}>
              Limpar registros
            </button>
          </div>
          {entries.length > 0 ? (
            <div className="entries-list">
              {[...entries].reverse().map((entry, index) => {
                const position = entries.length - index;

                return (
                  <article key={entry.id} className="entry-item">
                    <div className="entry-meta">
                      <span className="entry-index">{position}</span>
                      <div>
                        <strong>{entry.label}</strong>
                        <p>{formatDate(entry.createdAt)}</p>
                      </div>
                    </div>
                    <div className="entry-actions">
                      <strong>{formatBRL(entry.amount)}</strong>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => handleRemoveEntry(entry.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="entries-empty">Nenhum aporte registrado ate o momento.</div>
          )}
          <footer className="entries-footer">
            <span>Total captado</span>
            <strong data-goal-reached={String(journey.allMilestonesCompleted)}>{formatBRL(totalCaptured)}</strong>
          </footer>
        </section>

        {journey.allMilestonesCompleted && (
          <section className="goal-banner">
            <p className="goal-badge">Jornada concluida</p>
            <h2>{`Voce concluiu todas as metas ate ${formatBRL(journey.lastMilestone)}.`}</h2>
            <p>Cadastre uma nova meta acumulada para abrir a proxima etapa.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function getJourneySnapshot(settings, totalCaptured) {
  const milestones = settings.milestones;
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
    stepCapacities: getStepCapacities(settings.stepValue, stageGoal),
  };
}

function getStepCapacities(stepValue, stageGoal) {
  const capacities = [];
  let remainingGoal = stageGoal;

  while (remainingGoal > 0 && capacities.length < MAX_STEPS) {
    const capacity = Math.min(stepValue, remainingGoal);
    capacities.push(capacity);
    remainingGoal -= capacity;
  }

  return capacities.length > 0 ? capacities : [stepValue];
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

function getStepHeight(index, totalSteps) {
  const minHeight = 48;
  const maxHeight = 280;
  const denominator = Math.max(totalSteps - 1, 1);

  return Math.round(minHeight + (index / denominator) * (maxHeight - minHeight));
}

function sumUntil(values, index) {
  let total = 0;

  for (let position = 0; position < index; position += 1) {
    total += values[position];
  }

  return total;
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

function loadSettings() {
  if (typeof window === "undefined") {
    return getDefaultSettings();
  }

  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

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
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawEntries = window.localStorage.getItem(ENTRIES_STORAGE_KEY);

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

function getDefaultSettings() {
  return {
    stepValue: DEFAULT_STEP_VALUE,
    milestones: DEFAULT_MILESTONES.slice(),
  };
}

function createId() {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
