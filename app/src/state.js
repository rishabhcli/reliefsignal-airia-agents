import { buildResponseBrief } from "./exporter.js";
import { STAGES, generateResponsePlan } from "./planner.js";

function finalizeState(state) {
  return {
    ...state,
    briefPreview: buildResponseBrief(state)
  };
}

export function createWorkspace({
  workspaceName = "ReliefSignal Operations Desk",
  objective = "Protect affected households through the next 72 hours",
  sourceInput = "",
  baseDate = new Date(),
  mutateTasks
} = {}) {
  const plan = generateResponsePlan(sourceInput, { objective, baseDate });
  const tasks = typeof mutateTasks === "function" ? mutateTasks(plan.tasks) : plan.tasks;

  return finalizeState({
    workspaceName,
    objective,
    sourceInput,
    tasks,
    windows: plan.windows,
    windowLabel: plan.windowLabel,
    generatedAt: plan.generatedAt,
    summary: plan.summary
  });
}

export function regenerateWorkspace(state, baseDate = new Date()) {
  return createWorkspace({
    workspaceName: state.workspaceName,
    objective: state.objective,
    sourceInput: state.sourceInput,
    baseDate
  });
}

export function updateWorkspaceField(state, field, value) {
  return finalizeState({
    ...state,
    [field]: value
  });
}

export function moveTaskToStage(state, taskId, stage) {
  if (!STAGES.includes(stage)) {
    return state;
  }

  const tasks = state.tasks.map((task) => (task.id === taskId ? { ...task, stage } : task));
  return finalizeState({ ...state, tasks });
}

export function getMetrics(tasks) {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.stage === "Resolved").length;
  const activeTasks = tasks.filter((task) => task.stage === "Mobilizing").length;
  const averagePriority =
    totalTasks === 0
      ? 0
      : Math.round(tasks.reduce((total, task) => total + task.priority, 0) / totalTasks);

  return {
    totalTasks,
    doneTasks,
    activeTasks,
    averagePriority,
    immediateCount: tasks.filter((task) => task.priorityBand === "Immediate").length
  };
}

export function hydrateWorkspace(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const requiredFields = [
    "workspaceName",
    "objective",
    "sourceInput",
    "tasks",
    "windows",
    "windowLabel",
    "generatedAt",
    "summary"
  ];

  if (!requiredFields.every((field) => field in candidate)) {
    return null;
  }

  if (!Array.isArray(candidate.tasks) || !Array.isArray(candidate.windows)) {
    return null;
  }

  const stagesAreValid = candidate.tasks.every((task) => STAGES.includes(task.stage));
  if (!stagesAreValid) {
    return null;
  }

  return finalizeState(candidate);
}
