(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.TaskCore = core;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  function workedMs(task, now = Date.now()) {
    const saved = Math.max(0, Number(task.workedMs) || 0);
    return task.isActive && task.runningSinceMs ? saved + Math.max(0, now - task.runningSinceMs) : saved;
  }
  function start(task, now = Date.now()) {
    return { ...task, isActive: true, workedMs: workedMs(task, now), runningSinceMs: now };
  }
  function pause(task, now = Date.now()) {
    return { ...task, isActive: false, workedMs: workedMs(task, now), runningSinceMs: null };
  }
  function outcome(task, result, now = Date.now()) {
    if (!['success', 'fail'].includes(result)) throw new Error('Outcome must be success or fail');
    return { id: task.id, taskName: task.taskName, result, workedMs: workedMs(task, now), completedAt: new Date(now).toISOString() };
  }
  function finish(tasks, taskId, result, now = Date.now()) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return { tasks, record: null };
    const record = outcome(task, result, now);
    return { tasks: tasks.filter(item => item.id !== taskId), record };
  }
  return { workedMs, start, pause, outcome, finish };
});
