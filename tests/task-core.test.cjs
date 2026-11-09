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
    const { tasks, record } = TaskCore.finish([task], 9, result, 'test reason', 50_000);
    assert.deepEqual(tasks, []);
    assert.equal(record.result, result);
    assert.equal(record.workedMs, 12_000);
    assert.equal(record.completedAt, new Date(50_000).toISOString());
    assert.equal(record.attempts[0].reason, 'test reason');
  }
});

test('finishing an unknown task does not create a history record', () => {
  const task = { id: 1, taskName: 'Write', workedMs: 0, isActive: false, runningSinceMs: null };
  const result = TaskCore.finish([task], 2, 'success', 'done', 5_000);
  assert.equal(result.record, null);
  assert.deepEqual(result.tasks, [task]);
});

test('distraction allowance is inclusive and only the next distraction exceeds it', () => {
  const task = { id: 10, taskName: 'Write', allowedDistractions: 2, distractions: 0 };
  assert.deepEqual(TaskCore.recordDistraction(task), { count: 1, exceeded: false });
  assert.deepEqual(TaskCore.recordDistraction(task), { count: 2, exceeded: false });
  assert.deepEqual(TaskCore.recordDistraction(task), { count: 3, exceeded: true });
});

test('finished task history keeps the distraction count', () => {
  const task = { id: 11, taskName: 'Study', allowedDistractions: 1, distractions: 2, workedMs: 5_000, isActive: false, runningSinceMs: null };
  const { record } = TaskCore.finish([task], task.id, 'fail', 'too many distractions', 8_000);
  assert.equal(record.result, 'fail');
  assert.equal(record.distractions, 2);
  assert.equal(record.attempts[0].reason, 'too many distractions');
});

test('a task allows three total attempts and any success makes the overall result successful', () => {
  const first = TaskCore.finish([{ id: 12, taskName: 'Practice', attempts: [], workedMs: 1000, distractions: 1 }], 12, 'fail', 'missed the goal', 10_000);
  assert.equal(first.retryAvailable, true);
  assert.equal(first.record.reattemptsLeft, 2);
  const second = TaskCore.finish([{ id: 12, taskName: 'Practice', attempts: first.record.attempts, workedMs: 2000, distractions: 0 }], 12, 'fail', 'ran out of time', 20_000);
  assert.equal(second.record.reattemptsLeft, 1);
  const third = TaskCore.finish([{ id: 12, taskName: 'Practice', attempts: second.record.attempts, workedMs: 3000, distractions: 1 }], 12, 'success', 'finished it', 30_000);
  assert.equal(third.record.attempts.length, 3);
  assert.equal(third.record.result, 'success');
  assert.equal(third.record.reattemptsLeft, 0);
  assert.equal(TaskCore.canRetry(third.record), false);
});

test('a task cannot be retried after three failed attempts', () => {
  const attempts = [1, 2, 3].map(number => ({ number, result: 'fail', reason: `reason ${number}`, workedMs: 1000, distractions: 0 }));
  const thirdAttempt = TaskCore.finish([{ id: 13, taskName: 'Review', attempts: attempts.slice(0, 2), workedMs: 1000, distractions: 0 }], 13, 'fail', 'third failure', 39_000);
  assert.equal(thirdAttempt.record.attempts.length, 3);
  assert.equal(thirdAttempt.record.reattemptsLeft, 0);
  assert.equal(thirdAttempt.retryAvailable, false);
  const task = { id: 13, taskName: 'Review', attempts, workedMs: 1000, distractions: 0 };
  const { record, retryAvailable, tasks: unchanged } = TaskCore.finish([task], 13, 'fail', 'should not happen', 40_000);
  assert.equal(record, null);
  assert.equal(retryAvailable, false);
  assert.deepEqual(unchanged, [task]);
  assert.equal(TaskCore.canRetry({ result: 'fail', attempts }), false);
});
