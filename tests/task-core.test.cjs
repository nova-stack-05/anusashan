const test = require('node:test');
const assert = require('node:assert/strict');
const TaskCore = require('../js/02-task-core.js');

test('pause and resume keep adding to the same task time', () => {
  const task = { id: 1, taskName: 'Study', workedMs: 0, isActive: false, runningSinceMs: null };
  const started = TaskCore.start(task, 1000);
  const paused = TaskCore.pause(started, 61_000);
  assert.equal(paused.workedMs, 60_000);
  const resumed = TaskCore.start(paused, 120_000);
  assert.equal(TaskCore.workedMs(resumed, 150_000), 90_000);
});

test('success and failure are terminal records and remove the task from active work', () => {
  for (const result of ['success', 'fail']) {
    const task = { id: 9, taskName: 'Read', workedMs: 12_000, isActive: false, runningSinceMs: null };
    const { tasks, record } = TaskCore.finish([task], 9, result, 50_000);
    assert.deepEqual(tasks, []);
    assert.equal(record.result, result);
    assert.equal(record.workedMs, 12_000);
    assert.equal(record.completedAt, new Date(50_000).toISOString());
  }
});

test('finishing an unknown task does not create a history record', () => {
  const task = { id: 1, taskName: 'Write', workedMs: 0, isActive: false, runningSinceMs: null };
  const result = TaskCore.finish([task], 2, 'success', 5_000);
  assert.equal(result.record, null);
  assert.deepEqual(result.tasks, [task]);
});
