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

/** 이송 건 진행 상황: 단계(번호 노드) + 상태 변경 기록 */
export function ProgressStrip() {
  const e = useEngine();
  const [open, setOpen] = useState(false);
  if (!e.status) return null;
  const idx = e.status === "fallback" || e.status === "phone_check" ? 0 : STEPS.indexOf(e.status);
  const fmt = (t: number) => new Date(t).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <div className="tile mb-4 p-3.5">
      <button className="flex w-full items-center gap-3" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="flex flex-1 items-start">
          {STEPS.map((st, i) => (
            <div key={st} className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold transition",
                    i === idx
                      ? "bg-accent text-accent-foreground shadow-[var(--shadow-accent)]"
                      : i < idx
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-2 text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && <span className={cn("mx-1 h-[3px] flex-1 rounded-full", i < idx ? "bg-primary/60" : "bg-border")} />}
              </div>
              <span className={cn("text-[11px] leading-none", i === idx ? "font-extrabold text-foreground" : "text-muted-foreground")}>
                {i === 0 && idx === 0 && e.status ? STATUS_LABEL[e.status] : STATUS_LABEL[st]}
              </span>
            </div>
          ))}
        </div>
        <span className="chip shrink-0 border-0 bg-surface-2">
          기록 {e.history.length}
          <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <ol className="mt-3 space-y-0 border-t pt-3">
          {[...e.history].reverse().map((h, i) => (
            <li key={i} className="relative flex gap-3 pb-3 pl-1 last:pb-0">
              {i !== 0 && <span aria-hidden className="absolute top-4 -left-[3px] h-full w-px bg-border" />}
              <span aria-hidden className={cn("relative z-10 mt-1 size-[7px] shrink-0 rounded-full", i === 0 ? "bg-accent ring-4 ring-accent-soft" : "bg-border-strong")} />
              <span className="w-14 shrink-0 pt-px text-[11px] tabular-nums text-muted-foreground">{fmt(h.at)}</span>
              <span className="flex-1 -mt-px text-sm leading-snug">
                <b className="font-bold">{h.label}</b>
                <span className="mt-0.5 block text-xs text-muted-foreground">
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
    <div className="mt-7 rounded-xl border border-dashed border-border-strong bg-surface/70 p-3">
      <button className="flex w-full items-center justify-between text-xs font-bold text-muted-foreground" onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-1.5"><Wrench className="size-3.5" /> 시연 도구 (병원 웹 · 타이머 흉내)</span>
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 space-y-2.5 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <button className="chip hover:bg-surface-2" onClick={() => actions.fastForward(30)}><FastForward className="size-3.5" /> 30초 지나기</button>
            <button className="chip hover:bg-surface-2" onClick={() => actions.fastForward(120)}><FastForward className="size-3.5" /> 2분 지나기</button>
            <label className="chip cursor-pointer">
              <input type="checkbox" checked={e.autoReply} onChange={(ev) => actions.setAutoReply(ev.target.checked)} className="accent-[var(--color-accent)]" />
              병원 자동 응답
            </label>
          </div>
          {rows.map((h) => (
            <div key={`${h.hospitalId}-${h.round}`} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-card px-2.5 py-2">
              <span className="w-28 truncate text-sm font-semibold">{hospital(h.hospitalId).name}</span>
              <span className="text-xs text-muted-foreground">{h.status === "closed" && h.closeReason ? CLOSE_LABEL[h.closeReason] : HREQ_LABEL[h.status]}</span>
              <span className="flex-1" />
              {h.status === "waiting" && <>
                <button className="rounded-md bg-success-soft px-2.5 py-1 text-xs font-bold text-success" onClick={() => run(actions.hospitalApprove(h.hospitalId))}>승인</button>
                <button className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive" onClick={() => run(actions.hospitalReject(h.hospitalId))}>거절</button>
              </>}
              {(h.status === "approved" || h.status === "confirmed") && (
                <button className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive" onClick={() => run(actions.hospitalCancelApproval(h.hospitalId))}>승인 취소</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
