/** 근무 종료 · 로그아웃 · 탈퇴 (SFR-070 · 071 · 113). 팀의 마지막 대원이면 진행 중 이송을 '취소'로 끝냄 */
import { getAuth, logout, withdraw, type AuthState } from "@/lib/auth-store";
import { actions, getEngine } from "@/lib/engine";
import { ACTIVE } from "@/lib/domain/stateMachine";

export const hasActiveTransport = () => {
  const st = getEngine().status;
  return !!st && ACTIVE.includes(st);
};

/** 내가 빠지면 팀에 아무도 안 남는지 */
export const isLastMember = (a: AuthState = getAuth()) => (a.duty?.members.length ?? 0) === 0;

export function leave(kind: "duty_end" | "logout" | "withdrawal") {
  if (hasActiveTransport() && isLastMember()) actions.cancel(kind);
  if (kind === "withdrawal") withdraw();
  else logout();
}
