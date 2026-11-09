/**
 * 시연용 "가짜 서버". 상태 변경은 전부 설계 문서의 stateMachine.ts(transitionTransport / transitionHreq)를 거친다.
 * 서버가 생기면 이 파일을 API · Socket.IO 호출로 바꾸면 된다.
 */
import { useSyncExternalStore } from "react";
import {
  transitionTransport, transitionHreq, transportEventAfterHreqChange, CASCADE, TARGET_STATES, TransitionError,
  type TransportStatus, type TransportEvent, type TransportCtx, type HreqStatus, type HreqEvent, type CloseReason,
  type FallbackReason, type PhoneProceedReason, type DestChangeReason,
} from "./domain/stateMachine";
import { HOSPITALS, isTarget, RESPONSE_LIMIT_SEC, RADIUS_STEPS, START_RADIUS, type Hospital } from "./hospitals";
import type { Grade } from "./transport-store";

export type Hreq = {
  hospitalId: string;
  round: number;
  status: HreqStatus;
  version: number;
  sentAt: number;
  closeReason: CloseReason | null;
  note?: string;
  reason?: string;
  respondedAt?: number;
  recheck?: boolean;
};

export type HistoryItem = { from: TransportStatus | null; to: TransportStatus; event: TransportEvent; reason: string | null; at: number; label: string };

export type EngineState = {
  status: TransportStatus | null;
  version: number;
  radius: number;
  round: number;
  roundSentAt: number;
  grade: Grade;
  hreqs: Hreq[];
  excluded: string[];
  phoneTarget: string | null;
  confirmedId: string | null;
  alert: string | null;
  destChanged: boolean;
  fallbackReason: FallbackReason | null;
  history: HistoryItem[];
  lastApprovedAt: number;
  autoReply: boolean;
  clockOffset: number;
};

const initial = (): EngineState => ({
  status: null, version: 1, radius: START_RADIUS, round: 0, roundSentAt: 0, grade: null, hreqs: [], excluded: [],
  phoneTarget: null, confirmedId: null, alert: null, destChanged: false, fallbackReason: null, history: [],
  lastApprovedAt: 0, autoReply: true, clockOffset: 0,
});

let s: EngineState = initial();
const subs = new Set<() => void>();
const emit = () => { s = { ...s }; subs.forEach((f) => f()); };
export const now = () => Date.now() + s.clockOffset;

export function useEngine() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => s, () => s);
}
export const getEngine = () => s;

export const hospital = (id: string | null) => HOSPITALS.find((h) => h.id === id) as Hospital;

const EVENT_LABEL: Partial<Record<TransportEvent, string>> = {
  CREATE_WITH_TARGETS: "병원에 요청", CREATE_NO_TARGET: "요청할 병원 없음 → 예비 추천", HOSPITAL_RESPONDED: "병원 응답 도착",
  CONFIRM: "승인 병원 확정", NO_OPEN_REQUEST: "열린 요청 없음 → 예비 추천", APPROVAL_WINDOW_ENDED: "5분 동안 선택 없음 → 요청 종료",
  APPROVAL_CANCELLED_OPEN_REMAIN: "병원이 승인 취소 (다른 요청 남음)", ASSESSMENT_UPDATED: "변경 사항 보내기", EXPAND_ROUND: "반경 넓혀 다시 요청",
  START_PHONE_CHECK: "전화 확인 시작", PHONE_ACCEPTED: "전화로 수용 확정", PHONE_PROCEED: "전화 결과로 출발", PHONE_REJECTED_NEXT: "전화 거절 → 다음 후보",
  PHONE_REJECTED_LAST: "전화 거절 · 남은 후보 없음", PHONE_DISMISSED: "결과 없이 전화 화면 닫기", ARRIVE: "도착 처리",
  CONFIRMED_HOSPITAL_CANCELLED: "목적지 병원이 승인 취소", RE_REQUEST: "다시 요청", CHANGE_DESTINATION: "목적지 변경", CANCEL: "이송 취소",
};
export const REASON_LABEL: Record<string, string> = {
  all_rejected: "모든 병원이 거절했어요", expired_no_approval: "2분 동안 승인한 병원이 없어요", none_delivered: "요청이 병원에 전달되지 않았어요",
  approvals_cancelled: "병원들이 승인을 취소했어요", approval_window: "요청 후 5분이 지나 요청이 닫혔어요", no_target: "조건에 맞는 병원이 없어요",
  offline: "통신이 끊겨 요청을 보내지 못했어요", phone_rejected_last: "전화한 병원이 모두 거절했어요", phone_dismissed: "전화 결과를 고르지 않았어요",
  no_answer: "연결 실패", busy: "통화 중", urgent: "환자 급함", etc: "기타", user: "대원이 취소", button: "도착 버튼",
  patient_change: "환자 상태 변화", road: "도로 사정", hospital: "병원 사정",
};
export const HREQ_LABEL: Record<HreqStatus, string> = {
  waiting: "대기", delivery_failed: "전달 실패", approved: "승인", rejected: "거절", expired: "응답 없음",
  closed: "닫힘", confirmed: "확정", arrived: "도착", unacceptable: "수용 불가",
};
export const CLOSE_LABEL: Record<CloseReason, string> = {
  other_hospital: "다른 병원 확정", fallback: "요청 종료", cancelled: "취소됨", expired_approval: "승인 만료(5분)",
  approval_cancelled: "승인 취소", dest_changed: "목적지 변경",
};

// ---------------- 내부: 이송 건 사건 적용 + 연쇄 ----------------
function applyTransport(event: TransportEvent, extra: Partial<TransportCtx> = {}, user = true, chosen?: string) {
  const t = now();
  const res = transitionTransport(s.status, event, {
    now: new Date(t), version: s.version, ...(user ? { clientVersion: s.version } : {}), ...extra,
  } as TransportCtx);
  const from = s.status;
  s.status = res.to;
  s.version += 1;
  s.history = [...s.history, { ...res.history, at: t, label: EVENT_LABEL[event] ?? event }];
  if (from !== res.to && res.to === "fallback") s.fallbackReason = (res.history.reason as FallbackReason) ?? null;

  for (const c of CASCADE[event] ?? []) {
    if (c.target === "new_round") continue; // 새 회차는 호출한 쪽에서 SEND
    const list =
      c.target === "chosen" ? s.hreqs.filter((h) => h.hospitalId === chosen && h.status === "approved")
      : s.hreqs.filter((h) => (TARGET_STATES[c.target as keyof typeof TARGET_STATES] as HreqStatus[]).includes(h.status) && !(c.target === "open" && h.hospitalId === chosen));
    list.forEach((h) => applyHreq(h, c.event, {}, false));
  }
}

/** 승인에는 유효 시간이 없음(사용자 요청): 확정 전까지 승인은 계속 유효 */
const NO_APPROVAL_LIMIT = new Date(8.64e15);

function applyHreq(h: Hreq, event: HreqEvent, extra: { reason?: string } = {}, cascadeBack = true) {
  const t = now();
  const fromStatus = h.status;
  const res = transitionHreq(h.status, event, {
    now: new Date(t), version: h.version, clientVersion: h.version,
    respondUntil: new Date(h.sentAt + RESPONSE_LIMIT_SEC * 1000), approvalValidUntil: NO_APPROVAL_LIMIT,
    reason: extra.reason ?? null,
  });
  h.status = res.to;
  h.version += 1;
  h.closeReason = res.closeReason;
  if (extra.reason) h.reason = extra.reason;
  if (event === "APPROVE" || event === "REJECT") h.respondedAt = t;
  if (event === "APPROVE") s.lastApprovedAt = t;
  if ((event === "REJECT" || event === "CANCEL_APPROVAL") && !s.excluded.includes(h.hospitalId)) s.excluded = [...s.excluded, h.hospitalId];
  s.hreqs = [...s.hreqs];
  if (!cascadeBack || !s.status) return;
  const cur = s.hreqs.filter((x) => x.round === s.round);
  const counts = {
    waiting: cur.filter((x) => x.status === "waiting").length,
    validApproved: s.hreqs.filter((x) => x.status === "approved").length,
  };
  const back = transportEventAfterHreqChange(s.status, { event, fromStatus }, counts);
  if (!back) return;
  if (back.event === "CONFIRMED_HOSPITAL_CANCELLED") s.alert = `${hospital(h.hospitalId).name}이(가) 승인을 취소했어요 (${extra.reason ?? "사유 없음"})`;
  applyTransport(back.event, back.reason ? { fallbackReason: back.reason } : {}, false);
}

function targetsFor(radius: number, opts: { onlyNew?: boolean; recheck?: string[] } = {}) {
  const requested = new Set(s.hreqs.map((h) => h.hospitalId));
  return HOSPITALS.filter((h) => h.km <= radius && isTarget(h, s.grade) && !s.excluded.includes(h.id) && (!opts.onlyNew || !requested.has(h.id)));
}

function sendRound(list: Hospital[], recheck: string[] = []) {
  s.round += 1;
  s.roundSentAt = now();
  s.hreqs = [...s.hreqs, ...list.map((h) => {
    const r: Hreq = { hospitalId: h.id, round: s.round, status: "waiting", version: 1, sentAt: s.roundSentAt, closeReason: null, recheck: recheck.includes(h.id) };
    return r;
  })];
}

function guard<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const value = fn();
    emit();
    return { ok: true, value };
  } catch (e) {
    emit();
    if (e instanceof TransitionError) return { ok: false, error: e.message };
    throw e;
  }
}

// ---------------- 대원 행동 (앱 화면에서 부름) ----------------
export const actions = {
  create(grade: Grade, offline = false) {
    return guard(() => {
      s = { ...initial(), autoReply: s.autoReply, grade };
      const list = offline ? [] : targetsFor(s.radius);
      if (list.length === 0) {
        applyTransport("CREATE_NO_TARGET", { fallbackReason: offline ? "offline" : "no_target" });
      } else {
        applyTransport("CREATE_WITH_TARGETS");
        sendRound(list);
      }
    });
  },
  confirm(hospitalId: string) {
    return guard(() => {
      const h = s.hreqs.find((x) => x.hospitalId === hospitalId && (x.status === "approved" || x.closeReason === "approval_cancelled" || x.closeReason === "expired_approval"));
      applyTransport("CONFIRM", h ? { target: { status: h.status, closeReason: h.closeReason, approvalValidUntil: NO_APPROVAL_LIMIT } } : {}, true, hospitalId);
      s.confirmedId = hospitalId;
      s.phoneTarget = null;
    });
  },
  expand() {
    return guard(() => {
      const i = RADIUS_STEPS.indexOf(s.radius);
      const next = RADIUS_STEPS[i + 1];
      const list = next ? targetsFor(next, { onlyNew: true }) : [];
      applyTransport("EXPAND_ROUND", { currentRadiusKm: s.radius, ...(next ? { nextRadiusKm: next } : {}), newTargetCount: list.length });
      if (next) s.radius = next;
      sendRound(list);
    });
  },
  startPhone(hospitalId: string) {
    return guard(() => {
      applyTransport("START_PHONE_CHECK");
      s.phoneTarget = hospitalId;
    });
  },
  phoneAccepted() {
    return guard(() => {
      const id = s.phoneTarget;
      applyTransport("PHONE_ACCEPTED");
      s.confirmedId = id;
      s.phoneTarget = null;
    });
  },
  phoneProceed(reason: PhoneProceedReason) {
    return guard(() => {
      const id = s.phoneTarget;
      applyTransport("PHONE_PROCEED", { phoneReason: reason });
      s.confirmedId = id;
      s.phoneTarget = null;
    });
  },
  /** 전화 거절: 다음 후보가 있으면 그 병원으로, 없으면 요청 화면 또는 예비 추천 */
  phoneRejected() {
    return guard(() => {
      const cur = s.phoneTarget;
      if (cur && !s.excluded.includes(cur)) s.excluded = [...s.excluded, cur];
      const next = phoneCandidates().find((h) => h.id !== cur);
      const open = openRemain();
      applyTransport(next ? "PHONE_REJECTED_NEXT" : "PHONE_REJECTED_LAST", { openRequestsRemain: open });
      s.phoneTarget = next ? next.id : null;
      return next?.id ?? null;
    });
  },
  phoneDismiss() {
    return guard(() => {
      applyTransport("PHONE_DISMISSED", { openRequestsRemain: openRemain() });
      s.phoneTarget = null;
    });
  },
  updateAssessment() {
    return guard(() => applyTransport("ASSESSMENT_UPDATED"));
  },
  arrive() {
    return guard(() => applyTransport("ARRIVE", { arrivalMethod: "button" }));
  },
  reRequest() {
    return guard(() => {
      const prev = s.hreqs.filter((h) => h.round === s.round && h.closeReason === "other_hospital").map((h) => h.hospitalId);
      const confirmedReq = s.hreqs.find((h) => h.hospitalId === s.confirmedId && h.closeReason === "approval_cancelled");
      const list = targetsFor(s.radius);
      applyTransport("RE_REQUEST", { confirmedReqClosedReason: confirmedReq?.closeReason ?? null, newTargetCount: list.length });
      s.alert = null;
      s.confirmedId = null;
      sendRound(list, prev);
    });
  },
  changeDestination(reason: DestChangeReason) {
    return guard(() => {
      const old = s.confirmedId;
      const list = targetsFor(s.radius).filter((h) => h.id !== old);
      applyTransport("CHANGE_DESTINATION", { destinationChangedBefore: s.destChanged, destReason: reason, newTargetCount: list.length });
      s.destChanged = true;
      if (old && !s.excluded.includes(old)) s.excluded = [...s.excluded, old];
      s.confirmedId = null;
      sendRound(list.filter((h) => h.id !== old));
    });
  },
  cancel(reason: "user" | "duty_end" | "logout" | "withdrawal" = "user") {
    return guard(() => applyTransport("CANCEL", { cancelReason: reason }));
  },
  reset() {
    s = { ...initial(), autoReply: s.autoReply };
    emit();
  },
  // ---- 시연 도구 ----
  fastForward(sec: number) {
    s.clockOffset += sec * 1000;
    tick();
  },
  setAutoReply(v: boolean) {
    s.autoReply = v;
    emit();
  },
  hospitalApprove(id: string, note?: string) {
    return guard(() => {
      const h = s.hreqs.find((x) => x.hospitalId === id && x.status === "waiting");
      if (!h) throw new TransitionError("REQUEST_CLOSED", "대기 중인 요청이 없어요");
      if (note) h.note = note;
      applyHreq(h, "APPROVE");
    });
  },
  hospitalReject(id: string, reason = "병상 부족") {
    return guard(() => {
      const h = s.hreqs.find((x) => x.hospitalId === id && x.status === "waiting");
      if (!h) throw new TransitionError("REQUEST_CLOSED", "대기 중인 요청이 없어요");
      applyHreq(h, "REJECT", { reason });
    });
  },
  hospitalCancelApproval(id: string, reason = "중증 환자 동시 도착") {
    return guard(() => {
      const h = s.hreqs.find((x) => x.hospitalId === id && (x.status === "approved" || x.status === "confirmed"));
      if (!h) throw new TransitionError("REQUEST_NOT_APPROVED", "승인 상태가 아니에요");
      applyHreq(h, "CANCEL_APPROVAL", { reason });
    });
  },
};

export function openRemain() {
  return s.hreqs.some((h) => (h.round === s.round && h.status === "waiting") || h.status === "approved");
}

/** 전화 확인 후보: 승인 대기 중이 아닌 가까운 병원(제외 병원 빼고) */
export function phoneCandidates() {
  return HOSPITALS.filter((h) => h.km <= s.radius && !s.excluded.includes(h.id) && !s.hreqs.some((r) => r.hospitalId === h.id && (r.status === "waiting" || r.status === "approved")))
    .sort((a, b) => a.km - b.km);
}

export function latestReq(id: string) {
  return [...s.hreqs].reverse().find((h) => h.hospitalId === id);
}

// ---------------- 타이머 (서버 · 병원 웹 흉내) ----------------
function tick() {
  if (!s.status) return emit();
  const t = now();
  try {
    for (const h of s.hreqs) {
      if (h.status === "waiting") {
        const hs = hospital(h.hospitalId);
        const sc = hs.script;
        if (s.autoReply && sc && t - h.sentAt >= sc.after * 1000 && t - h.sentAt < RESPONSE_LIMIT_SEC * 1000) {
          if (sc.action === "no_ack") applyHreq(h, "NO_ACK_5S");
          else if (sc.action === "approve") { if (sc.note) h.note = sc.note; applyHreq(h, "APPROVE"); }
          else applyHreq(h, "REJECT", { reason: sc.reason ?? "병상 부족" });
        } else if (t - h.sentAt >= RESPONSE_LIMIT_SEC * 1000) {
          applyHreq(h, "RESPOND_TIMEOUT");
        }
      }
    }
  } catch (e) {
    if (!(e instanceof TransitionError)) throw e;
  }
  emit();
}

if (typeof window !== "undefined") setInterval(tick, 500);
