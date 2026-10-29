import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_LAYOUTS } from '../arenas/layouts.ts';
import { areCirclesTouching, isDashReady, isTransferEligible, shouldStartNextRound } from './rules.ts';

describe('dash cooldown', () => {
  it('allows a dash at or after cooldown expiry', () => {
    assert.equal(isDashReady(4999, 5000), false);
    assert.equal(isDashReady(5000, 5000), true);
  });
});

describe('bomb transfer eligibility', () => {
  it('requires live players, active play, expired protection, and fresh contact', () => {
    assert.equal(isTransferEligible('playing', true, true, 1000, 1000, false), true);
    assert.equal(isTransferEligible('intermission', true, true, 0, 1000, false), false);
    assert.equal(isTransferEligible('playing', true, true, 1001, 1000, false), false);
    assert.equal(isTransferEligible('playing', true, true, 0, 1000, true), false);
    assert.equal(isTransferEligible('playing', false, true, 0, 1000, false), false);
  });

  it('treats physics-resolved edge contact as a collision', () => {
    assert.equal(areCirclesTouching(100, 100, 152, 100, 52), true);
    assert.equal(areCirclesTouching(100, 100, 156, 100, 52), true);
    assert.equal(areCirclesTouching(100, 100, 157, 100, 52), false);
  });
});

describe('round transitions', () => {
  it('only advances an elapsed intermission', () => {
    assert.equal(shouldStartNextRound('intermission', 2500, 2500), true);
    assert.equal(shouldStartNextRound('playing', 2500, 2500), false);
    assert.equal(shouldStartNextRound('intermission', 2499, 2500), false);
  });
});

describe('arena layouts', () => {
  it('provide four separated valid spawns outside all obstacles', () => {
    assert.equal(ARENA_LAYOUTS.length, 3);
    ARENA_LAYOUTS.forEach((layout) => {
      assert.equal(layout.spawns.length, 4);
      layout.spawns.forEach((spawn, index) => {
        assert.ok(spawn.x >= 66 && spawn.x <= 654); assert.ok(spawn.y >= 66 && spawn.y <= 834);
        layout.spawns.slice(index + 1).forEach((other) => assert.ok(Math.hypot(spawn.x - other.x, spawn.y - other.y) > 250));
        layout.obstacles.forEach((obstacle) => {
          const outside = Math.abs(spawn.x - obstacle.x) > obstacle.width / 2 + 30 || Math.abs(spawn.y - obstacle.y) > obstacle.height / 2 + 30;
          assert.equal(outside, true);
        });
      });
    });
  });
});
