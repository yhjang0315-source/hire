import { describe, expect, it } from "vitest";
import { getMockDataset, getPersonas, DEMO_TODAY } from "@/data";
import { recommend } from "@/lib/engine";
import { mapMarkers } from "./map";

const data = getMockDataset();
const recOf = (id: string) => {
  const p = getPersonas().find((x) => x.profile.id === id)!;
  return recommend(p.profile, p.applications, data, DEMO_TODAY);
};

describe("mapMarkers", () => {
  it("사다리 단계별 공고를 한 번씩, 1순위 표시와 좌표를 함께 담는다", () => {
    const rec = recOf("P-A12");
    const ms = mapMarkers(rec);
    expect(new Set(ms.map((m) => m.id)).size).toBe(ms.length);
    expect(ms.find((m) => m.best)?.id).toBe("MOCK-D01");
    expect(ms.find((m) => m.id === "MOCK-E01")?.group).toBe("target");
    expect(ms.every((m) => typeof m.lat === "number" && typeof m.lng === "number")).toBe(true);
  });

  it("방향 전환 트랙은 redirect 묶음으로 담는다", () => {
    const ms = mapMarkers(recOf("P-B07"));
    expect(ms.some((m) => m.group === "redirect")).toBe(true);
  });
});
