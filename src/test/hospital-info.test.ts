import { describe, it, expect } from "vitest";
import { HOSPITALS, bedAvail, capCount } from "@/lib/hospitals";

const at = (id: string) => HOSPITALS.find((h) => h.id === id)!;

describe("병원 상세 정보 (SFR-007 · SFR-002)", () => {
  it("승인 병원을 누르면 볼 수 있는 병상 · 진료가능 항목 · 전화번호가 모두 있다", () => {
    const b = at("b");
    expect(b.er).toBe("5/20"); // 응급실 가용/전체
    expect(b.icu).toBe("4/24"); // 중환자실
    expect(b.or).toBe("2/12"); // 수술실
    expect(capCount(b)).toEqual({ available: 5, total: 6 });
    expect(b.erPhone).toBe("041-000-0002"); // 응급실 직통
    expect(b.mainPhone).toBe("041-000-9002"); // 대표
    expect(b.depts).toContain("응급의학과");
    // 진료가능 항목은 공공 데이터 표기 그대로
    expect(b.caps.map((c) => c.name)).toContain("[재관류중재술] 심근경색");
  });

  it("병상 정보가 없는 병원은 '정보 없음'으로 보이고 전화 번호는 있다", () => {
    const g = at("g");
    expect(bedAvail(g.er)).toBeNull();
    expect(capCount(g)).toEqual({ available: 0, total: 0 });
    expect(g.erPhone).toBe("041-000-0007");
    expect(g.mainPhone).toBe("041-000-9007");
  });

  it("병상 0개는 0으로 보인다 (정보 없음과 구분)", () => {
    expect(bedAvail(at("c").er)).toBe(0);
    expect(bedAvail("3/12")).toBe(3);
  });

  it("모든 병원에 응급실 직통 · 대표 전화가 있다", () => {
    for (const h of HOSPITALS) {
      expect(h.erPhone).toMatch(/^041-\d{3}-\d{4}$/);
      expect(h.mainPhone).toMatch(/^041-\d{3}-\d{4}$/);
    }
  });
});
