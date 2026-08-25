/** State pattern: each workflow owns its allowed state transitions. */
const workflows = {
  report: {
    Pending: ["Acknowledged"],
    Acknowledged: ["Resolved"],
    Resolved: [],
  },
  task: {
    "To Do": ["In Progress"],
    "In Progress": ["En Route", "Completed"],
    "En Route": ["Completed"],
    Completed: [],
  },
};

export function canTransition(workflow, from, to) {
  return from === to || Boolean(workflows[workflow]?.[from]?.includes(to));
}

export function assertTransition(workflow, from, to) {
  if (!canTransition(workflow, from, to)) {
    throw new Error(`Cannot move ${workflow} from '${from}' to '${to}'.`);
  }
}

export function allowedTransitions(workflow, from) {
  return [...(workflows[workflow]?.[from] || [])];
}
