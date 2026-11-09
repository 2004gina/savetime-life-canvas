import { useState } from "react";
import { ChevronDown, FastForward, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useEngine, actions, hospital, REASON_LABEL, HREQ_LABEL, CLOSE_LABEL } from "@/lib/engine";
import type { TransportStatus } from "@/lib/domain/stateMachine";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<TransportStatus, string> = {
  requesting: "요청 중", fallback: "예비 추천", phone_check: "전화 확인", moving: "이동 중", arrived: "도착", cancelled: "취소됨",
};

const STEPS: TransportStatus[] = ["requesting", "moving", "arrived"];

/** 이송 건 진행 상황: 단계 + 상태 변경 기록 */
export function ProgressStrip() {
  const e = useEngine();
  const [open, setOpen] = useState(false);
  if (!e.status) return null;
  const idx = e.status === "fallback" || e.status === "phone_check" ? 0 : STEPS.indexOf(e.status);
  const fmt = (t: number) => new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <div className="tile mb-4 p-3">
      <button className="flex w-full items-center gap-2" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="flex flex-1 items-center gap-1.5">
          {STEPS.map((st, i) => (
            <div key={st} className="flex flex-1 flex-col gap-1">
              <span className={cn("h-1.5 rounded-full", i <= idx ? "bg-accent" : "bg-border")} />
              <span className={cn("text-[11px]", i === idx ? "font-bold text-foreground" : "text-muted-foreground")}>
                {i === 0 && idx === 0 && e.status ? STATUS_LABEL[e.status] : STATUS_LABEL[st]}
              </span>
            </div>
          ))}
        </div>
        <span className="flex items-center text-xs text-muted-foreground">기록 {e.history.length}<ChevronDown className={cn("size-4 transition", open && "rotate-180")} /></span>
      </button>
      {open && (
        <ol className="mt-3 space-y-2 border-t pt-3">
          {[...e.history].reverse().map((h, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{fmt(h.at)}</span>
              <span className="flex-1">
                <b>{h.label}</b>
                <span className="block text-xs text-muted-foreground">
                  {h.from ? STATUS_LABEL[h.from] : "시작"} → {STATUS_LABEL[h.to]}
                  {h.reason ? ` · ${REASON_LABEL[h.reason] ?? h.reason}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** 병원 웹 · 타이머를 흉내 내는 시연 도구 (서버 연결 뒤 삭제) */
export function DemoTools({ showConfirmed }: { showConfirmed?: boolean }) {
  const e = useEngine();
  const [open, setOpen] = useState(false);
  const run = (r: { ok: boolean; error?: string } | { ok: true; value: unknown }) => {
    if (!r.ok && "error" in r) toast.error(r.error);
  };
  const rows = e.hreqs.filter((h) => (showConfirmed ? h.status === "confirmed" : h.round === e.round || h.status === "approved"));
  return (
    <div className="mt-6 rounded-lg border border-dashed p-3">
      <button className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground" onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-1"><Wrench className="size-3.5" /> 시연 도구 (병원 웹 · 타이머 흉내)</span>
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5" onClick={() => actions.fastForward(30)}><FastForward className="size-3.5" /> 30초 지나기</button>
            <button className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5" onClick={() => actions.fastForward(120)}><FastForward className="size-3.5" /> 2분 지나기</button>
            <label className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5">
              <input type="checkbox" checked={e.autoReply} onChange={(ev) => actions.setAutoReply(ev.target.checked)} /> 병원 자동 응답
            </label>
          </div>
          {rows.map((h) => (
            <div key={`${h.hospitalId}-${h.round}`} className="flex flex-wrap items-center gap-1.5">
              <span className="w-28 truncate">{hospital(h.hospitalId).name}</span>
              <span className="text-xs text-muted-foreground">{h.status === "closed" && h.closeReason ? CLOSE_LABEL[h.closeReason] : HREQ_LABEL[h.status]}</span>
              <span className="flex-1" />
              {h.status === "waiting" && <>
                <button className="rounded bg-success-soft px-2 py-1 text-xs text-success" onClick={() => run(actions.hospitalApprove(h.hospitalId))}>승인</button>
                <button className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive" onClick={() => run(actions.hospitalReject(h.hospitalId))}>거절</button>
              </>}
              {(h.status === "approved" || h.status === "confirmed") && (
                <button className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive" onClick={() => run(actions.hospitalCancelApproval(h.hospitalId))}>승인 취소</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
