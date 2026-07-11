import { describe, expect, it } from "vitest";
import businessesConfig from "../config/businesses.json";
import type { BusinessDefinition } from "../types/economy.js";
import { calcEquipmentPrice, getBusinessStats, processLaunder } from "./economy.js";

const businesses = businessesConfig.businesses as BusinessDefinition[];
const laundromat = businesses.find((b) => b.id === "laundromat")!;
const bar = businesses.find((b) => b.id === "bar")!;

describe("getBusinessStats", () => {
  it("sv.1 seviye bonusu yok", () => {
    const stats = getBusinessStats(laundromat, 1);
    expect(stats.capacityPerHour).toBe(1500);
    expect(stats.rate).toBeCloseTo(0.70);
  });

  it("sv.2: kapasite 1.5x, oran +0.03", () => {
    const stats = getBusinessStats(laundromat, 2);
    expect(stats.capacityPerHour).toBe(2250);
    expect(stats.rate).toBeCloseTo(0.73);
  });

  it("sv.3: kapasite 2x, oran +0.05", () => {
    const stats = getBusinessStats(laundromat, 3);
    expect(stats.capacityPerHour).toBe(3000);
    expect(stats.rate).toBeCloseTo(0.75);
  });

  it("bar sv.1", () => {
    const stats = getBusinessStats(bar, 1);
    expect(stats.capacityPerHour).toBe(4000);
    expect(stats.rate).toBeCloseTo(0.75);
  });
});

describe("processLaunder", () => {
  it("kuyruk < kapasite: hepsi işlenir", () => {
    const r = processLaunder({ queueDirty: 500, capacityPerHour: 1500, rate: 0.70, rush: false, speedMult: 2 });
    expect(r.processed).toBe(500);
    expect(r.clean).toBe(350);
    expect(r.burned).toBe(150);
  });

  it("kuyruk > kapasite: kapasite kadar işlenir", () => {
    const r = processLaunder({ queueDirty: 5000, capacityPerHour: 1500, rate: 0.70, rush: false, speedMult: 2 });
    expect(r.processed).toBe(1500);
    expect(r.clean).toBe(1050);
  });

  it("rush mod: 2x kapasite", () => {
    const r = processLaunder({ queueDirty: 5000, capacityPerHour: 1500, rate: 0.70, rush: true, speedMult: 2 });
    expect(r.processed).toBe(3000);
  });

  it("aklama kaybı = para yakma (enflasyon freni)", () => {
    const r = processLaunder({ queueDirty: 1000, capacityPerHour: 2000, rate: 0.70, rush: false, speedMult: 2 });
    expect(r.clean + r.burned).toBe(r.processed);
    expect(r.burned).toBeGreaterThan(0);
  });
});

describe("calcEquipmentPrice", () => {
  it("sıfır taleple baz fiyat", () => {
    expect(calcEquipmentPrice(1000, 0)).toBe(1000);
  });

  it("yüksek talepte fiyat artar, %150 tavanını aşmaz", () => {
    const price = calcEquipmentPrice(1000, 1000);
    expect(price).toBeLessThanOrEqual(1500);
    expect(price).toBeGreaterThan(1000);
  });

  it("negatif talep (arz fazlası) fiyatı düşürür, %70 tabanını kırmaz", () => {
    const price = calcEquipmentPrice(1000, -1000);
    expect(price).toBeGreaterThanOrEqual(700);
    expect(price).toBeLessThan(1000);
  });
});
