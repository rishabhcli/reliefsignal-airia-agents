import { copyText, downloadBrief } from "./exporter.js";
import { createDemoWorkspace } from "./demo.js";
import { STAGES, groupTasksByStage, groupTasksByWindow } from "./planner.js";
import {
  createWorkspace,
  getMetrics,
  hydrateWorkspace,
  moveTaskToStage,
  updateWorkspaceField
} from "./state.js";
import { clearWorkspaceSnapshot, loadWorkspaceSnapshot, saveWorkspaceSnapshot } from "./storage.js";

const elements = {
  workspaceName: document.querySelector("#workspaceName"),
  objectiveInput: document.querySelector("#objectiveInput"),
  sourceInput: document.querySelector("#sourceInput"),
  generateButton: document.querySelector("#generateButton"),
  demoButton: document.querySelector("#demoButton"),
  resetButton: document.querySelector("#resetButton"),
  statusLine: document.querySelector("#statusLine"),
  heroHeadline: document.querySelector("#heroHeadline"),
  heroSubline: document.querySelector("#heroSubline"),
  heroPreviewStrip: document.querySelector("#heroPreviewStrip"),
  statsGrid: document.querySelector("#statsGrid"),
  priorityBands: document.querySelector("#priorityBands"),
  spotlightList: document.querySelector("#spotlightList"),
  categoryBars: document.querySelector("#categoryBars"),
  insightCards: document.querySelector("#insightCards"),
  boardColumns: document.querySelector("#boardColumns"),
  roadmapGrid: document.querySelector("#roadmapGrid"),
  briefPreview: document.querySelector("#briefPreview"),
  copyBriefButton: document.querySelector("#copyBriefButton"),
  downloadBriefButton: document.querySelector("#downloadBriefButton"),
  toast: document.querySelector("#toast")
};

let state = hydrateWorkspace(loadWorkspaceSnapshot()) ?? createDemoWorkspace(new Date());
let draggedSignalId = null;
let toastTimer = null;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2200);
}

function persist() {
  saveWorkspaceSnapshot(state);
}

function getSortedTasks(tasks = state.tasks) {
  return [...tasks].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return right.urgency - left.urgency;
  });
}

function scorePill(label, value) {
  return `<span class="score-pill"><strong>${escapeHtml(label)}</strong> ${escapeHtml(String(value))}</span>`;
}

function stageCopy(stage) {
  if (stage === "Incoming") {
    return "New field signals waiting on verification.";
  }

  if (stage === "Verified") {
    return "Cleared and ready for assignment.";
  }

  if (stage === "Mobilizing") {
    return "Crews, comms, and supplies are in motion.";
  }

  return "Closed with a documented follow-through.";
}

function renderStats() {
  const metrics = getMetrics(state.tasks);
  const cards = [
    {
      label: "Signals",
      value: metrics.totalTasks,
      detail: `${metrics.immediateCount} immediate`,
      meter: metrics.totalTasks / 10
    },
    {
      label: "Priority",
      value: metrics.averagePriority,
      detail: "Average triage score",
      meter: metrics.averagePriority / 100
    },
    {
      label: "Mobilizing",
      value: metrics.activeTasks,
      detail: "Actions in motion",
      meter: metrics.activeTasks / 4
    },
    {
      label: "Resolved",
      value: metrics.doneTasks,
      detail: "Closed loop",
      meter: metrics.doneTasks / 4
    }
  ];

  elements.statsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <p>${escapeHtml(card.label)}</p>
          <strong>${escapeHtml(String(card.value))}</strong>
          <span>${escapeHtml(card.detail)}</span>
          <div class="stat-meter" aria-hidden="true">
            <span style="width:${Math.max(16, Math.min(100, Math.round(card.meter * 100)))}%"></span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderHeroPreview() {
  const sorted = getSortedTasks();
  const topTask = sorted[0];
  const checklist = state.summary.checklist.slice(0, 3);

  elements.heroHeadline.textContent = topTask
    ? `${topTask.title} needs coordination now.`
    : "ReliefSignal surfaces the highest-risk field signal here.";
  elements.heroSubline.textContent = topTask
    ? `${topTask.dueLabel} · ${topTask.timebox} · ${topTask.priorityBand}`
    : "Load the demo operation or paste incoming updates to build a response queue.";

  elements.heroPreviewStrip.innerHTML = checklist
    .map(
      (item, index) => `
        <article class="preview-chip">
          <span>0${index + 1}</span>
          <strong>${escapeHtml(item)}</strong>
        </article>
      `
    )
    .join("");
}

function renderPriorityBands() {
  const counts = new Map([
    ["Immediate", 0],
    ["Queued", 0],
    ["Monitor", 0]
  ]);

  for (const task of state.tasks) {
    counts.set(task.priorityBand, (counts.get(task.priorityBand) ?? 0) + 1);
  }

  const total = Math.max(state.tasks.length, 1);
  elements.priorityBands.innerHTML = [...counts.entries()]
    .map(([label, count]) => {
      const share = Math.max(12, Math.round((count / total) * 100));
      return `
        <article class="band-card band-${label.toLowerCase()}">
          <header>
            <p>${escapeHtml(label)}</p>
            <strong>${count}</strong>
          </header>
          <div class="band-bar">
            <span style="width:${share}%"></span>
          </div>
          <small>${Math.round((count / total) * 100)}% of current response load</small>
        </article>
      `;
    })
    .join("");
}

function renderSpotlight() {
  const spotlight = getSortedTasks().slice(0, 3);

  elements.spotlightList.innerHTML = spotlight
    .map(
      (task, index) => `
        <article class="spotlight-card">
          <div class="spotlight-rank">0${index + 1}</div>
          <div>
            <div class="spotlight-topline">
              <strong>${escapeHtml(task.title)}</strong>
              <span>${escapeHtml(task.priorityBand)}</span>
            </div>
            <div class="spotlight-meta">
              <span>${escapeHtml(task.category)}</span>
              <span>${escapeHtml(task.dueLabel)}</span>
              <span>${escapeHtml(task.timebox)}</span>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCategoryBars() {
  const totals = new Map();
  for (const task of state.tasks) {
    totals.set(task.category, (totals.get(task.category) ?? 0) + 1);
  }

  const sorted = [...totals.entries()].sort((left, right) => right[1] - left[1]);
  const maxCount = sorted[0]?.[1] ?? 1;

  elements.categoryBars.innerHTML = sorted
    .map(
      ([label, count]) => `
        <article class="category-row">
          <div class="category-row-label">
            <strong>${escapeHtml(label)}</strong>
            <span>${count} signal${count === 1 ? "" : "s"}</span>
          </div>
          <div class="category-track">
            <span style="width:${Math.max(16, Math.round((count / maxCount) * 100))}%"></span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderInsights() {
  const cards = [
    {
      label: "Critical lane",
      value: state.summary.focus,
      accent: "focus"
    },
    {
      label: "Field checklist",
      value: state.summary.checklist.join(" / "),
      accent: "quick"
    },
    {
      label: "Partner outreach",
      value: state.summary.outreach,
      accent: "tempo"
    },
    {
      label: "Risk watch",
      value: state.summary.risk,
      accent: "risk"
    }
  ];

  elements.insightCards.innerHTML = cards
    .map(
      (card) => `
        <article class="insight-card insight-${card.accent}">
          <p>${escapeHtml(card.label)}</p>
          <strong>${escapeHtml(card.value)}</strong>
        </article>
      `
    )
    .join("");
}

function renderBoard() {
  const stageGroups = groupTasksByStage(state.tasks);

  elements.boardColumns.innerHTML = stageGroups
    .map(
      ({ stage, tasks }) => `
        <section class="board-column board-column-${escapeHtml(stage.toLowerCase().replace(/\s+/g, "-"))}" data-stage="${escapeHtml(stage)}">
          <header class="board-column-header">
            <div>
              <h3>${escapeHtml(stage)}</h3>
              <p>${escapeHtml(stageCopy(stage))}</p>
            </div>
            <span class="column-count">${tasks.length}</span>
          </header>

          <div class="column-dropzone" data-stage="${escapeHtml(stage)}">
            ${
              tasks.length > 0
                ? tasks
                    .map(
                      (task) => `
                        <article class="task-card task-card-${escapeHtml(task.priorityBand.toLowerCase())}" draggable="true" data-task-id="${escapeHtml(task.id)}">
                          <div class="task-card-top">
                            <div class="task-chip-row">
                              <span class="task-chip task-chip-category">${escapeHtml(task.category)}</span>
                              <span class="task-chip task-chip-band">${escapeHtml(task.priorityBand)}</span>
                            </div>
                            <label class="stage-picker">
                              <span class="sr-only">Move signal</span>
                              <select data-task-stage="${escapeHtml(task.id)}" aria-label="Move ${escapeHtml(task.title)}">
                                ${STAGES.map(
                                  (stageOption) => `
                                    <option value="${escapeHtml(stageOption)}" ${
                                      stageOption === task.stage ? "selected" : ""
                                    }>
                                      ${escapeHtml(stageOption)}
                                    </option>
                                  `
                                ).join("")}
                              </select>
                            </label>
                          </div>

                          <h4>${escapeHtml(task.title)}</h4>
                          <p>${escapeHtml(task.description)}</p>

                          <div class="score-grid">
                            ${scorePill("Urgency", task.urgency)}
                            ${scorePill("Impact", task.impact)}
                            ${scorePill("Effort", task.effort)}
                          </div>

                          <div class="task-meta">
                            <span>${escapeHtml(task.timebox)}</span>
                            <span>${escapeHtml(task.dueLabel)}</span>
                          </div>
                        </article>
                      `
                    )
                    .join("")
                : '<p class="column-empty">Drop a signal here or leave this lane clear for incoming work.</p>'
            }
          </div>
        </section>
      `
    )
    .join("");
}

function renderTimeline() {
  const windows = groupTasksByWindow(state.tasks, state.windows);

  elements.roadmapGrid.innerHTML = windows
    .map(
      (window) => `
        <article class="roadmap-day">
          <header>
            <p>${escapeHtml(window.label)}</p>
            <strong>${escapeHtml(window.dateLabel)}</strong>
          </header>
          <small class="window-emphasis">${escapeHtml(window.emphasis)}</small>
          <ul>
            ${
              window.tasks.length > 0
                ? window.tasks
                    .map(
                      (task) => `
                        <li>
                          <span>${escapeHtml(task.title)}</span>
                          <small>${escapeHtml(task.timebox)}</small>
                        </li>
                      `
                    )
                    .join("")
                : '<li class="roadmap-empty">Hold this window for reassessment, public guidance, and recovery handoff.</li>'
            }
          </ul>
        </article>
      `
    )
    .join("");
}

function renderStatus() {
  const generated = new Date(state.generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  elements.statusLine.textContent = `Last rebuilt ${generated}. Field edits save instantly; click Build response queue to refresh priorities.`;
}

function render() {
  elements.workspaceName.value = state.workspaceName;
  elements.objectiveInput.value = state.objective;
  elements.sourceInput.value = state.sourceInput;
  elements.briefPreview.value = state.briefPreview;
  renderHeroPreview();
  renderStats();
  renderPriorityBands();
  renderSpotlight();
  renderCategoryBars();
  renderInsights();
  renderBoard();
  renderTimeline();
  renderStatus();
}

function rebuildWorkspace() {
  state = createWorkspace({
    workspaceName: state.workspaceName,
    objective: state.objective,
    sourceInput: state.sourceInput,
    baseDate: new Date()
  });
  persist();
  render();
  showToast("Response queue refreshed");
}

elements.generateButton.addEventListener("click", () => {
  rebuildWorkspace();
});

elements.demoButton.addEventListener("click", () => {
  state = createDemoWorkspace(new Date());
  persist();
  render();
  showToast("Flood response demo loaded");
});

elements.resetButton.addEventListener("click", () => {
  if (!window.confirm("Reset the operation back to the ReliefSignal demo data?")) {
    return;
  }

  clearWorkspaceSnapshot();
  state = createDemoWorkspace(new Date());
  persist();
  render();
  showToast("Operation reset");
});

elements.workspaceName.addEventListener("input", (event) => {
  state = updateWorkspaceField(state, "workspaceName", event.target.value);
  persist();
  elements.briefPreview.value = state.briefPreview;
});

elements.objectiveInput.addEventListener("input", (event) => {
  state = updateWorkspaceField(state, "objective", event.target.value);
  persist();
  elements.briefPreview.value = state.briefPreview;
});

elements.sourceInput.addEventListener("input", (event) => {
  state = updateWorkspaceField(state, "sourceInput", event.target.value);
  persist();
});

elements.copyBriefButton.addEventListener("click", async () => {
  await copyText(state.briefPreview);
  showToast("Response brief copied");
});

elements.downloadBriefButton.addEventListener("click", () => {
  downloadBrief(state.workspaceName, state.briefPreview);
  showToast("Response brief downloaded");
});

elements.boardColumns.addEventListener("change", (event) => {
  const select = event.target.closest("[data-task-stage]");
  if (!select) {
    return;
  }

  state = moveTaskToStage(state, select.dataset.taskStage, select.value);
  persist();
  render();
  showToast("Signal moved");
});

elements.boardColumns.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-task-id]");
  if (!card) {
    return;
  }

  draggedSignalId = card.dataset.taskId;
  card.classList.add("dragging");
});

elements.boardColumns.addEventListener("dragend", (event) => {
  const card = event.target.closest("[data-task-id]");
  if (card) {
    card.classList.remove("dragging");
  }

  draggedSignalId = null;
  document.querySelectorAll(".board-column.drag-over").forEach((column) => column.classList.remove("drag-over"));
});

elements.boardColumns.addEventListener("dragover", (event) => {
  const column = event.target.closest(".board-column");
  if (!column || !draggedSignalId) {
    return;
  }

  event.preventDefault();
  column.classList.add("drag-over");
});

elements.boardColumns.addEventListener("dragleave", (event) => {
  const column = event.target.closest(".board-column");
  if (column) {
    column.classList.remove("drag-over");
  }
});

elements.boardColumns.addEventListener("drop", (event) => {
  const column = event.target.closest(".board-column");
  if (!column || !draggedSignalId) {
    return;
  }

  event.preventDefault();
  column.classList.remove("drag-over");
  state = moveTaskToStage(state, draggedSignalId, column.dataset.stage);
  persist();
  render();
  showToast("Signal moved");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      console.warn("ReliefSignal service worker registration failed");
    });
  });
}

render();
