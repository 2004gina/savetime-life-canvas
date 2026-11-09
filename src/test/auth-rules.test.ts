import { describe, it, expect } from "vitest";
import {
  initialAuth, type AuthState, type Account, tryLogin, passwordOk, signupError, driverTaken, dutyExpired, versionBelow,
  type Duty, demoInvite, acceptInvite, rejectInvite, inviteLeft, inviteExpired, expiredInvites,
} from "@/lib/auth-store";

import { gateTarget } from "@/components/app-gate";

const ready = (): AuthState => ({ ...initialAuth(), consent: "agreed", permissions: { location: "granted", phone: "granted", notify: "granted" } });

describe("첫 사용 · 로그인 · 근무 규칙 (요구사항 v1.4)", () => {
  it("위치 동의를 안 하면 동의 화면에서 못 벗어난다 (SFR-041)", () => {
    expect(gateTarget({ ...initialAuth(), consent: "refused" }, "/login")).toBe("/welcome");
  });
  it("위치 권한을 거부하면 권한 화면에서 못 넘어간다 (SFR-092)", () => {
    const a = { ...ready(), permissions: { location: "denied" as const, phone: "granted" as const, notify: "granted" as const } };
    expect(gateTarget(a, "/login")).toBe("/permissions");
  });
  it("가입하지 않은 아이디로는 로그인할 수 없다", () => {
    expect(tryLogin(ready(), "nobody", "abcd1234").error).toBeTruthy();
    expect(tryLogin(ready(), "kimdoyun", "savetime1").patch.session).toBe("kimdoyun");
  });
  it("5번 틀리면 10분 잠긴다 (SER-011)", () => {
    let a = ready();
    for (let i = 0; i < 5; i++) a = { ...a, ...tryLogin(a, "kimdoyun", "wrong", 1000).patch };
    expect(a.lockedUntil).toBe(1000 + 10 * 60_000);
    expect(tryLogin(a, "kimdoyun", "savetime1", 1000 + 9 * 60_000).patch.session).toBeUndefined();
    expect(tryLogin(a, "kimdoyun", "savetime1", 1000 + 10 * 60_000).patch.session).toBe("kimdoyun");
  });
  it("로그인 유지 기간 선택 없이, 근무 중이면 로그인 화면으로 보내지 않는다 (SFR-018)", () => {
    const duty: Duty = { startedAt: new Date().toISOString(), teamCode: "1234", isCreator: true, role: "처치", members: [] };
    expect(gateTarget({ ...ready(), session: "kimdoyun", duty }, "/")).toBeNull();
  });
  it("승인 전 계정은 승인 대기 화면만 볼 수 있다 (SFR-022)", () => {
    const a = ready();
    a.accounts = { ...a.accounts, new1: { ...(a.accounts["kimdoyun"] as Account), loginId: "new1", status: "pending" } };
    expect(gateTarget({ ...a, session: "new1" }, "/")).toBe("/pending");
  });
  it("비밀번호는 8자 이상 영문+숫자 (SER-006)", () => {
    expect(passwordOk("abcdefgh")).toBe(false);
    expect(passwordOk("abc12345")).toBe(true);
    expect(passwordOk("ab1234")).toBe(false);
  });
  it("공무원증 사진이나 사진 동의가 없으면 가입 신청할 수 없다 (SFR-017)", () => {
    const f = { orgCode: "CN-SB-019", name: "최진아", center: "서북119안전센터", employeeNo: "2024-0001", loginId: "jina01", pw: "abc12345", photo: "id.jpg", agree: true };
    const acc = initialAuth().accounts;
    expect(signupError(f, acc)).toBeNull();
    expect(signupError({ ...f, photo: null }, acc)).toBeTruthy();
    expect(signupError({ ...f, agree: false }, acc)).toBeTruthy();
    expect(signupError({ ...f, orgCode: "XX-000" }, acc)).toBeTruthy();
  });
  it("운전은 팀에 1명 (SFR-113)", () => {
    expect(driverTaken([{ loginId: "x", name: "", rank: "", center: "", employeeNo: "", role: "운전" }])).toBe(true);
  });
  it("근무 시작 후 14시간이 지나면 근무가 끝난다 (SER-007)", () => {
    const t = Date.now();
    const d = (h: number): Duty => ({ startedAt: new Date(t - h * 3600_000).toISOString(), teamCode: "1", isCreator: true, role: "처치", members: [] });
    expect(dutyExpired(d(13.9), t)).toBe(false);
    expect(dutyExpired(d(14), t)).toBe(true);
  });
  it("앱 버전이 최소 버전보다 낮으면 업데이트 안내만 (SFR-142)", () => {
    expect(versionBelow("1.4.2", "1.10.0")).toBe(true);
    expect(gateTarget({ ...ready(), serverMinVersion: "9.0.0" }, "/")).toBe("/update");
  });
});

const invited = (at = 1000): AuthState => ({ ...ready(), session: "kimdoyun", ...demoInvite(ready(), at) });
const one = (a: AuthState) => a.incoming[0]!;

describe("팀 초대 (SFR-159)", () => {
  it("초대는 5분 뒤 만료되고, 만료된 초대는 수락할 수 없다", () => {
    const a = invited(1000);
    const inv = one(a);
    expect(inviteLeft(inv, 1000 + 4 * 60_000)).toBe(60_000);
    expect(inviteExpired(inv, 1000 + 5 * 60_000)).toBe(true);
    expect(acceptInvite(a, inv.id, 1000 + 5 * 60_000).error).toBe("초대가 만료됐어요");
    expect(expiredInvites(a, 1000 + 5 * 60_000)?.incoming).toEqual([]);
    expect(expiredInvites(a, 1000 + 60_000)).toBeNull();
  });
  it("수락하면 초대한 대원과 한 팀이 된다 (운전 대원이 이미 있으면 내 역할은 처치)", () => {
    const a = invited(1000);
    const r = acceptInvite(a, one(a).id, 1000 + 10_000);
    expect(r.error).toBeUndefined();
    expect(r.patch.duty?.teamCode).toBe("4821");
    expect(r.patch.duty?.isCreator).toBe(false);
    expect(r.patch.duty?.members.map((m) => m.name)).toContain("이보준");
    expect(r.patch.duty?.role).toBe("처치");
    expect(r.patch.incoming).toEqual([]);
  });
  it("거절하면 팀에 들어가지 않는다", () => {
    const a = invited(1000);
    const r = rejectInvite(a, one(a).id);
    expect(r.patch.incoming).toEqual([]);
    expect(r.patch.duty).toBeUndefined();
    expect(r.message).toContain("이보준");
  });
  it("이미 근무 중이면 다른 팀 초대를 수락할 수 없다", () => {
    const a: AuthState = { ...invited(1000), duty: { startedAt: new Date(1000).toISOString(), teamCode: "1111", isCreator: true, role: "처치", members: [] } };
    expect(acceptInvite(a, one(a).id, 2000).error).toContain("이미 근무 중");
  });
  it("근무 전에도 초대 확인 화면에 머물 수 있다 (게이트)", () => {
    expect(gateTarget(invited(1000), "/invite")).toBeNull();
    expect(gateTarget(invited(1000), "/duty")).toBeNull();
  });
});


