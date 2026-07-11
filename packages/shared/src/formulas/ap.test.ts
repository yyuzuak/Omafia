import { describe, expect, it } from "vitest";
import { AP_MAX, AP_REGEN_SECONDS, calcAp, msUntilFull, spendAp } from "./ap";

const REGEN_MS = AP_REGEN_SECONDS * 1000;
const t0 = 1_000_000_000_000;

describe("calcAp", () => {
  it("süre geçmeden AP değişmez", () => {
    expect(calcAp({ ap: 50, lastCalcMs: t0 }, t0)).toEqual({ ap: 50, lastCalcMs: t0 });
  });

  it("72 sn'de 1 AP kazanılır", () => {
    const r = calcAp({ ap: 50, lastCalcMs: t0 }, t0 + REGEN_MS);
    expect(r.ap).toBe(51);
  });

  it("küsurat kaybolmaz: 2×36sn = 1 AP", () => {
    const half = calcAp({ ap: 50, lastCalcMs: t0 }, t0 + REGEN_MS / 2);
    expect(half.ap).toBe(50);
    expect(half.lastCalcMs).toBe(t0); // küsurat korunur
    const full = calcAp(half, t0 + REGEN_MS);
    expect(full.ap).toBe(51);
  });

  it("100 AP tavanında durur", () => {
    const r = calcAp({ ap: 99, lastCalcMs: t0 }, t0 + 10 * REGEN_MS);
    expect(r.ap).toBe(AP_MAX);
  });

  it("tam dolum 2 saat (0'dan 100'e)", () => {
    const r = calcAp({ ap: 0, lastCalcMs: t0 }, t0 + 2 * 60 * 60 * 1000);
    expect(r.ap).toBe(AP_MAX);
  });

  it("yeni gelen bonusu (+%50 regen): 48 sn'de 1 AP", () => {
    const r = calcAp({ ap: 0, lastCalcMs: t0 }, t0 + 48_000, 1.5);
    expect(r.ap).toBe(1);
  });
});

describe("spendAp", () => {
  it("yeterli AP varsa düşer", () => {
    const r = spendAp({ ap: 50, lastCalcMs: t0 }, 20, t0);
    expect(r?.ap).toBe(30);
  });

  it("yetersizse null döner", () => {
    expect(spendAp({ ap: 10, lastCalcMs: t0 }, 20, t0)).toBeNull();
  });

  it("regen sonrası yeterli hale gelebilir", () => {
    const r = spendAp({ ap: 19, lastCalcMs: t0 }, 20, t0 + REGEN_MS);
    expect(r?.ap).toBe(0);
  });
});

describe("msUntilFull", () => {
  it("doluysa 0", () => {
    expect(msUntilFull({ ap: 100, lastCalcMs: t0 }, t0)).toBe(0);
  });

  it("99 AP → 72 sn kaldı", () => {
    expect(msUntilFull({ ap: 99, lastCalcMs: t0 }, t0)).toBe(REGEN_MS);
  });

  it("birikmiş küsurat düşülür", () => {
    expect(msUntilFull({ ap: 99, lastCalcMs: t0 }, t0 + REGEN_MS / 2)).toBe(REGEN_MS / 2);
  });
});
