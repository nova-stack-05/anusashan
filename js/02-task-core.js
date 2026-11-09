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
    return { number: (task.attempts || []).length + 1, result, reason: task.finishReason || (result === 'success' ? 'Marked successful' : 'Marked failed'), workedMs: workedMs(task, now), distractions: Math.max(0, Number(task.distractions) || 0), completedAt: new Date(now).toISOString() };
  }
  function recordDistraction(task) {
    task.distractions = Math.max(0, Number(task.distractions) || 0) + 1;
    return { count: task.distractions, exceeded: task.distractions > Math.max(0, Number(task.allowedDistractions) || 0) };
  }
  function finish(tasks, taskId, result, reason, now = Date.now()) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return { tasks, record: null };
    if ((task.attempts || []).length >= 3) return { tasks, record: null, retryAvailable: false };
    const attempt = outcome(task, result, now);
    if (reason) attempt.reason = reason;
    const attempts = [...(task.attempts || []), attempt];
    const record = { id: task.id, taskName: task.taskName, durationMinutes: task.durationMinutes, allowedDistractions: task.allowedDistractions, result: attempts.some(item => item.result === 'success') ? 'success' : 'fail', attempts, workedMs: attempts.reduce((sum, item) => sum + item.workedMs, 0), distractions: attempts.reduce((sum, item) => sum + item.distractions, 0), completedAt: attempt.completedAt, reattemptsLeft: Math.max(0, 3 - attempts.length) };
    const remaining = canRetry(record);
    return { tasks: tasks.filter(item => item.id !== taskId), record, attempt, retryAvailable: remaining };
  }
  function canRetry(record) { return record?.result === 'fail' && (record.attempts || []).length < 3; }
  return { workedMs, start, pause, outcome, finish, recordDistraction, canRetry };
});
