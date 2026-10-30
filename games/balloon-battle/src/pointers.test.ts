import { describe, expect, it } from 'vitest';
import { PointerLedger } from './pointers.ts';

describe('PointerLedger', () => {
  it('counts each new finger once', () => {
    const ledger = new PointerLedger();
    expect(ledger.press(1, 0)).toBe(true);
    expect(ledger.press(1, 0)).toBe(false);
    expect(ledger.heldOn(0)).toBe(1);
  });

  it('counts a reused id again after the finger lifts', () => {
    const ledger = new PointerLedger();
    ledger.press(1, 0);
    ledger.release(1);
    expect(ledger.press(1, 0)).toBe(true);
  });

  it('keeps many fingers on both sides apart', () => {
    const ledger = new PointerLedger();
    for (const id of [1, 2, 3]) expect(ledger.press(id, 0)).toBe(true);
    for (const id of [4, 5]) expect(ledger.press(id, 1)).toBe(true);
    expect(ledger.heldOn(0)).toBe(3);
    expect(ledger.heldOn(1)).toBe(2);
    ledger.release(2);
    expect(ledger.heldOn(0)).toBe(2);
    expect(ledger.heldOn(1)).toBe(2);
  });

  it('does not let a held finger count again on the other side', () => {
    const ledger = new PointerLedger();
    ledger.press(1, 0);
    expect(ledger.press(1, 1)).toBe(false);
    expect(ledger.heldOn(1)).toBe(0);
  });

  it('forgets everything on clear', () => {
    const ledger = new PointerLedger();
    ledger.press(1, 0);
    ledger.clear();
    expect(ledger.press(1, 1)).toBe(true);
  });
});
