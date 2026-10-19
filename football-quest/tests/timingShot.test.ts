import { describe, expect, it } from 'vitest';
import { TIMING_SHOT_CONFIG, timingShotMaxScore } from '../src/config/minigames';
import { TimingShot } from '../src/minigames/TimingShot';

const C = TIMING_SHOT_CONFIG;
/** rng that always returns 0.5 → target is exactly the middle of [targetMin, targetMax] = 0.5. */
const mid = () => 0.5;

/** Advances the needle so that meterValue() == value (on the rising half of the sweep). */
function aimAt(game: TimingShot, value: number): void {
  const elapsedNow = (game.meterValue() * game.sweepMs()) / 2;
  game.tick(Math.max(1e-6, (value * game.sweepMs()) / 2 - elapsedNow));
}

function finishResolve(game: TimingShot): void {
  game.tick(C.resolveDelayMs + 1);
}

function playShots(game: TimingShot, values: number[]): void {
  for (const v of values) {
    aimAt(game, v);
    expect(game.shoot()).not.toBeNull();
    finishResolve(game);
  }
}

describe('TimingShot', () => {
  it('follows start → active → success', () => {
    const g = new TimingShot(mid, 'run1');
    expect(g.snapshot().state).toBe('start');
    expect(g.shoot()).toBeNull(); // input ignored before start
    expect(g.start()).toBe(true);
    expect(g.start()).toBe(false);
    playShots(g, [0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(g.snapshot().state).toBe('success');
    expect(g.result()).toEqual({ runId: 'run1', gameId: 'timing_shot', success: true, score: timingShotMaxScore(), durationMs: expect.any(Number) });
  });

  it('grades perfect / good / saved by distance to target', () => {
    const g = new TimingShot(mid, 'r');
    g.start();
    aimAt(g, 0.5 + C.perfectWindow * 0.5);
    expect(g.shoot()!.grade).toBe('perfect');
    finishResolve(g);
    aimAt(g, 0.5 + (C.perfectWindow + C.goodWindow) / 2);
    expect(g.shoot()!.grade).toBe('good');
    finishResolve(g);
    aimAt(g, 0.5 + C.goodWindow + 0.05);
    const saved = g.shoot()!;
    expect(saved.grade).toBe('saved');
    expect(saved.goal).toBe(false);
    expect(saved.points).toBe(0);
  });

  it('scores with streak bonus and resets streak on a save', () => {
    const g = new TimingShot(mid, 'r');
    g.start();
    playShots(g, [0.5, 0.5, 0.95, 0.5, 0.95]);
    // 3 + (3+1) + 0 + 3 + 0
    expect(g.snapshot().score).toBe(10);
    expect(g.snapshot().goals).toBe(3);
    expect(g.snapshot().state).toBe('success');
  });

  it('fails when fewer than the required goals are scored', () => {
    const g = new TimingShot(mid, 'r');
    g.start();
    playShots(g, [0.5, 0.95, 0.95, 0.5, 0.95]);
    expect(g.snapshot().state).toBe('failure');
    expect(g.result()!.success).toBe(false);
  });

  it('ignores rapid repeated taps while a shot is resolving', () => {
    const g = new TimingShot(mid, 'r');
    g.start();
    aimAt(g, 0.5);
    expect(g.shoot()).not.toBeNull();
    for (let i = 0; i < 20; i++) expect(g.shoot()).toBeNull();
    expect(g.snapshot().history).toHaveLength(1);
  });

  it('freezes time while paused and rejects input', () => {
    const g = new TimingShot(mid, 'r');
    g.start();
    g.tick(200);
    const before = g.meterValue();
    expect(g.pause()).toBe(true);
    g.tick(5000);
    expect(g.meterValue()).toBe(before);
    expect(g.shoot()).toBeNull();
    expect(g.resume()).toBe(true);
    expect(g.resume()).toBe(false);
  });

  it('abort produces no result and blocks further input', () => {
    const g = new TimingShot(mid, 'r');
    g.start();
    expect(g.abort()).toBe(true);
    expect(g.result()).toBeNull();
    expect(g.shoot()).toBeNull();
    expect(g.start()).toBe(false);
  });

  it('can be restarted by creating a new run', () => {
    const a = new TimingShot(mid, 'a');
    a.start();
    playShots(a, [0.9, 0.9, 0.9, 0.9, 0.9]);
    expect(a.snapshot().state).toBe('failure');
    const b = new TimingShot(mid, 'b');
    expect(b.start()).toBe(true);
    expect(b.snapshot().score).toBe(0);
  });

  it('speeds up the needle each shot but respects the minimum sweep', () => {
    const g = new TimingShot(mid, 'r', { ...C, shots: 20, baseSweepMs: 1000, sweepSpeedupMs: 200, minSweepMs: 500 });
    g.start();
    expect(g.sweepMs()).toBe(1000);
    playShots(g, [0.5]);
    expect(g.sweepMs()).toBe(800);
    playShots(g, [0.5, 0.5, 0.5, 0.5]);
    expect(g.sweepMs()).toBe(500);
  });

  it('ignores non-positive or NaN deltas', () => {
    const g = new TimingShot(mid, 'r');
    g.start();
    g.tick(-100);
    g.tick(Number.NaN);
    expect(g.meterValue()).toBe(0);
  });
});
