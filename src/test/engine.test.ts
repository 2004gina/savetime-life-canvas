import { describe, it, expect, beforeEach } from "vitest";
import { actions, getEngine } from "@/lib/engine";

beforeEach(() => {
  actions.setAutoReply(false);
  actions.reset();
});

describe("이송 건 상태 규칙 (설계 문서 상태 전이표)", () => {
  it("대상이 있으면 요청 중으로 시작하고 2분 안 응답 없으면 예비 추천으로 간다", () => {
    actions.create("대학병원급");
    expect(getEngine().status).toBe("requesting");
    actions.fastForward(121);
    expect(getEngine().status).toBe("fallback");
    expect(getEngine().fallbackReason).toBe("expired_no_approval");
  });

  it("승인 병원을 확정하면 이동 중이 되고 나머지 요청은 닫힌다", () => {
    actions.create("대학병원급");
    actions.hospitalApprove("b");
    expect(actions.confirm("b").ok).toBe(true);
    const e = getEngine();
    expect(e.status).toBe("moving");
    expect(e.hreqs.find((h) => h.hospitalId === "b")?.status).toBe("confirmed");
    expect(e.hreqs.filter((h) => h.hospitalId !== "b").every((h) => h.status === "closed")).toBe(true);
  });

  it("전화 확인 중에도 요청은 열려 있고, 결과 없이 닫으면 요청 중으로 돌아간다", () => {
    actions.create("대학병원급");
    actions.startPhone("d");
    expect(getEngine().status).toBe("phone_check");
    actions.phoneDismiss();
    expect(getEngine().status).toBe("requesting");
  });

  it("이동 중 확정 병원이 승인을 취소하면 이동 중을 유지하고 다시 요청할 수 있다", () => {
    actions.create("대학병원급");
    actions.hospitalApprove("b");
    actions.confirm("b");
    actions.hospitalCancelApproval("b");
    expect(getEngine().status).toBe("moving");
    expect(getEngine().alert).not.toBeNull();
    actions.reRequest();
    expect(getEngine().status).toBe("requesting");
    expect(getEngine().hreqs.some((h) => h.round === 2 && h.hospitalId === "b")).toBe(false);
  });

  it("반경은 한 단계씩, 40km에서는 더 넓힐 수 없다", () => {
    actions.create(null);
    actions.fastForward(121);
    expect(actions.expand().ok).toBe(true);
    expect(getEngine().radius).toBe(30);
    actions.fastForward(121);
    actions.expand();
    expect(getEngine().radius).toBe(40);
    actions.fastForward(121);
    expect(actions.expand().ok).toBe(false);
  });
});
