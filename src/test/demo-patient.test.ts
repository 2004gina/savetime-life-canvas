import { describe, expect, it } from "vitest";
import { demoPatient, filledCount, REQUIRED_FIELDS } from "@/lib/transport-store";

describe("시연용 환자 정보 예시", () => {
  it("필수 12개 항목이 모두 미리 채워져 있다", () => {
    expect(REQUIRED_FIELDS).toHaveLength(12);
    expect(filledCount(demoPatient)).toBe(REQUIRED_FIELDS.length);
  });

  it("선택 항목과 요청 병원 등급도 미리 채워져 있다", () => {
    expect(demoPatient.grade).toBe("대학병원급");
    expect(demoPatient.history).not.toBe("");
    expect(demoPatient.temp).not.toBe("");
    expect(demoPatient.glucose).not.toBe("");
    expect(demoPatient.ktas).not.toBe("");
  });
});
