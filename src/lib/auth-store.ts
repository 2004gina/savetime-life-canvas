/**
 * 시연용 계정 · 첫 사용 · 근무 상태 (서버 연결 전, 이 기기에만 저장). 실제로는 서버 인증으로 바꿈.
 * 요구사항 v1.4 (CR-004): 자동 로그인(30일) · 앱 잠금(PIN) 삭제 → 로그인은 근무 동안만 유지.
 */
import { useSyncExternalStore } from "react";

export type Rank = "소방사" | "소방교" | "소방장" | "소방위" | "소방경";
export const RANKS: Rank[] = ["소방사", "소방교", "소방장", "소방위", "소방경"];

export type Account = {
  loginId: string;
  password: string; // 시연용. 실제로는 서버에만 (해시)
  name: string;
  rank: string;
  orgCode: string;
  orgName: string;
  center: string;
  employeeNo: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectReason?: string;
  appliedAt: string;
};

export type Role = "처치" | "운전";
export type Member = { loginId: string; name: string; rank: string; center: string; employeeNo: string; role: Role };
export type Duty = { startedAt: string; teamCode: string; isCreator: boolean; role: Role; members: Member[] };

/** SFR-159: 내 폰으로 온 '팀 초대' (푸시로 도착, 5분 뒤 만료) */
export type Incoming = {
  id: string;
  from: { loginId: string; name: string; rank: string; center: string; employeeNo: string };
  teamCode: string;
  role: Role;
  sentAt: number;
};


export type Perm = "unknown" | "granted" | "denied";

export type AuthState = {
  consent: "unknown" | "agreed" | "refused";
  permissions: { location: Perm; phone: Perm; notify: Perm };
  accounts: Record<string, Account>;
  session: string | null; // 로그인한 loginId
  failCount: number;
  lockedUntil: number;
  duty: Duty | null;
  incoming: Incoming[];

  serverMinVersion: string;
};

export const APP_VERSION = "1.4.2";
export const MAX_FAILS = 5; // SER-011
export const LOCK_MS = 10 * 60_000; // SER-011
export const DUTY_MAX_MS = 14 * 60 * 60_000; // SER-007
export const TEAM_MAX = 4; // SFR-113
export const INVITE_MS = 5 * 60_000; // SFR-159

const DEMO: Account = {
  loginId: "kimdoyun", password: "savetime1", name: "김도윤", rank: "소방교", orgCode: "CN-SB-019", orgName: "천안서북소방서",
  center: "서북119안전센터", employeeNo: "2019-1234", status: "approved", appliedAt: "2026.10.01 10:12",
};

const KEY = "savetime-auth-v2";
export const initialAuth = (): AuthState => ({
  consent: "unknown",
  permissions: { location: "unknown", phone: "unknown", notify: "unknown" },
  accounts: { [DEMO.loginId]: DEMO },
  session: null, failCount: 0, lockedUntil: 0, duty: null, serverMinVersion: "1.0.0", incoming: [],
});

let s: AuthState = initialAuth();
const SSR = initialAuth();
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...initialAuth(), ...JSON.parse(raw) };
  } catch {
    /* 무시 */
  }
}

export function setAuth(patch: Partial<AuthState>) {
  load();
  s = { ...s, ...patch };
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(s));
  subs.forEach((f) => f());
}

export function getAuth() {
  load();
  return s;
}

export function resetAuth() {
  s = initialAuth();
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
  subs.forEach((f) => f());
}

export function useAuth() {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => { load(); return s; },
    () => SSR,
  );
}

export const currentAccount = (st: AuthState = getAuth()) => (st.session ? st.accounts[st.session] ?? null : null);

export const ORGS: Record<string, string> = {
  "CN-SB-019": "천안서북소방서",
  "CN-DN-020": "천안동남소방서",
  "SE-JR-001": "서울종로소방서",
};

/** 같은 관할 소방서의 승인된 대원 (시연용 목록) */
export const COLLEAGUES: (Omit<Member, "role"> & { orgCode: string; onDuty: boolean; inTeam?: boolean })[] = [
  { loginId: "leebojun", name: "이보준", rank: "소방사", center: "서북119안전센터", employeeNo: "2021-5521", orgCode: "CN-SB-019", onDuty: true },
  { loginId: "parkseoyeon", name: "박서연", rank: "소방장", center: "서북119안전센터", employeeNo: "2016-0388", orgCode: "CN-SB-019", onDuty: true },
  { loginId: "choiminho", name: "최민호", rank: "소방교", center: "성거119안전센터", employeeNo: "2018-7702", orgCode: "CN-SB-019", onDuty: true, inTeam: true },
  { loginId: "leebojun2", name: "이보준", rank: "소방교", center: "직산119안전센터", employeeNo: "2020-4410", orgCode: "CN-SB-019", onDuty: false },
  { loginId: "jungharin", name: "정하린", rank: "소방사", center: "직산119안전센터", employeeNo: "2023-1093", orgCode: "CN-SB-019", onDuty: false },
];

/** 이미 만들어진 팀 (시연: 다른 대원이 만든 팀에 코드로 참여) */
export const OPEN_TEAMS: Record<string, Member[]> = {
  "4821": [{ loginId: "leebojun", name: "이보준", rank: "소방사", center: "서북119안전센터", employeeNo: "2021-5521", role: "운전" }],
};

// ---------------- 규칙 (화면과 검사에서 같이 씀) ----------------

/** SER-006: 8자 이상, 영문+숫자 */
export function passwordOk(pw: string) {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

/** SFR-017: 가입 신청 검사. 통과하면 null */
export function signupError(f: {
  orgCode: string; name: string; center: string; employeeNo: string; loginId: string; pw: string; photo: string | null; agree: boolean;
}, accounts: Record<string, Account>) {
  if (!ORGS[f.orgCode.trim().toUpperCase()]) return "등록된 소방서 코드만 신청할 수 있어요";
  if (!f.name.trim() || !f.center.trim() || !f.employeeNo.trim()) return "이름 · 소속 안전센터 · 사번을 모두 적어 주세요";
  if (!/^[a-z0-9]{4,20}$/.test(f.loginId)) return "아이디는 영문 소문자 · 숫자 4~20자예요";
  if (accounts[f.loginId]) return "이미 쓰고 있는 아이디예요";
  if (!passwordOk(f.pw)) return "비밀번호는 8자 이상, 영문과 숫자를 섞어 주세요";
  if (!f.photo) return "공무원증 사진을 올려 주세요";
  if (!f.agree) return "공무원증 사진 수집 · 이용에 동의해야 신청할 수 있어요";
  return null;
}

/** SFR-018 · SER-011: 로그인. 결과 상태 조각과 안내 문구를 돌려줌 */
export function tryLogin(st: AuthState, loginId: string, pw: string, at = Date.now()): { patch: Partial<AuthState>; error?: string } {
  if (at < st.lockedUntil) {
    const min = Math.ceil((st.lockedUntil - at) / 60_000);
    return { patch: {}, error: `${MAX_FAILS}번 틀려서 잠겼어요. ${min}분 뒤에 다시 해 주세요` };
  }
  const acc = st.accounts[loginId.trim()];
  if (!acc || acc.password !== pw) {
    const n = st.failCount + 1;
    if (n >= MAX_FAILS) return { patch: { failCount: 0, lockedUntil: at + LOCK_MS }, error: `${MAX_FAILS}번 틀려서 10분 동안 잠겼어요` };
    return { patch: { failCount: n }, error: `아이디 또는 비밀번호가 맞지 않아요 (${n}/${MAX_FAILS})` };
  }
  if (acc.status === "suspended") return { patch: { failCount: 0 }, error: "정지된 계정이에요. 소속 관리자에게 문의하세요" };
  return { patch: { session: acc.loginId, failCount: 0, lockedUntil: 0 } };
}

/** SFR-113: 운전은 팀에 최대 1명 */
export function driverTaken(members: Member[], exceptId?: string) {
  return members.some((m) => m.role === "운전" && m.loginId !== exceptId);
}

// ---------------- 팀 초대 (SFR-159) ----------------

/** 초대는 5분 뒤 만료 → 남은 밀리초 */
export const inviteLeft = (inv: Incoming, at = Date.now()) => Math.max(0, INVITE_MS - (at - inv.sentAt));
export const inviteExpired = (inv: Incoming, at = Date.now()) => inviteLeft(inv, at) === 0;

/** 만료된 초대만 지운 상태 조각 (지울 게 없으면 null) */
export function expiredInvites(st: AuthState, at = Date.now()): Partial<AuthState> | null {
  const keep = st.incoming.filter((i) => !inviteExpired(i, at));
  return keep.length === st.incoming.length ? null : { incoming: keep };
}

/** 시연: 이보준(팀 4821을 만든 대원)이 나를 초대 */
export function demoInvite(st: AuthState, at = Date.now()): Partial<AuthState> {
  const c = COLLEAGUES.find((x) => x.loginId === "leebojun")!;
  const inv: Incoming = {
    id: `inv-${at}`,
    from: { loginId: c.loginId, name: c.name, rank: c.rank, center: c.center, employeeNo: c.employeeNo },
    teamCode: "4821",
    role: "처치",
    sentAt: at,
  };
  return { incoming: [...st.incoming, inv] };
}

/** SFR-159: '수락'을 눌러야 팀원이 된다. 만료·근무 중·팀 가득이면 들어갈 수 없다 */
export function acceptInvite(st: AuthState, id: string, at = Date.now()): { patch: Partial<AuthState>; error?: string; message?: string } {
  const inv = st.incoming.find((i) => i.id === id);
  if (!inv) return { patch: {}, error: "초대를 찾을 수 없어요" };
  if (inviteExpired(inv, at)) {
    return { patch: { incoming: st.incoming.filter((i) => i.id !== id) }, error: "초대가 만료됐어요" };
  }
  if (st.duty) return { patch: {}, error: "이미 근무 중이에요. 근무를 마친 뒤 다른 팀에 참여할 수 있어요" };
  const team = OPEN_TEAMS[inv.teamCode] ?? [];
  if (team.length + 1 > TEAM_MAX) return { patch: {}, error: `팀은 최대 ${TEAM_MAX}명이에요` };
  const role: Role = driverTaken(team) ? "처치" : inv.role;
  return {
    patch: {
      incoming: st.incoming.filter((i) => i.id !== id),
      duty: { startedAt: new Date(at).toISOString(), teamCode: inv.teamCode, isCreator: false, role, members: team },
    },
    message: `${inv.from.name} 대원의 팀 ${inv.teamCode}에 들어갔어요`,
  };
}

/** SFR-159: '거절'을 누르면 팀에 들어가지 않는다 */
export function rejectInvite(st: AuthState, id: string): { patch: Partial<AuthState>; message?: string } {
  const inv = st.incoming.find((i) => i.id === id);
  const patch = { incoming: st.incoming.filter((i) => i.id !== id) };
  return inv ? { patch, message: `${inv.from.name} 님의 초대를 거절했어요` } : { patch };
}



/** SER-007: 근무 시작 후 14시간이 지나면 (진행 중 이송이 없을 때) 자동 근무 종료 */
export function dutyExpired(duty: Duty | null, at = Date.now()) {
  return !!duty && at - new Date(duty.startedAt).getTime() >= DUTY_MAX_MS;
}

export function versionBelow(app: string, min: string) {
  const a = app.split(".").map(Number), b = min.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

/** SFR-070: 로그아웃 = 근무 종료. 팀에서 빠지고 이 기기의 로그인 정보를 지움 */
export function logout() {
  setAuth({ session: null, duty: null, failCount: 0 });
}

/** SFR-071: 회원 탈퇴. 계정 · 프로필 즉시 삭제 */
export function withdraw() {
  const st = getAuth();
  if (!st.session) return;
  const accounts = { ...st.accounts };
  delete accounts[st.session];
  setAuth({ accounts, session: null, duty: null });
}

export function isIOS() {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
}
