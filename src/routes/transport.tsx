import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, AlertTriangle, Phone, Timer, Send } from "lucide-react";
import { toast } from "sonner";
import { PhoneScreen, BigButton, Notice, Pill, SectionTitle } from "@/components/phone";
import { ProgressStrip, DemoTools } from "@/components/progress";
import { useEngine, actions, hospital, latestReq } from "@/lib/engine";
import { useTransport } from "@/lib/transport-store";
import type { DestChangeReason } from "@/lib/domain/stateMachine";

export const Route = createFileRoute("/transport")({
  head: () => ({
    meta: [
      { title: "이송 중 · 골든타임즈" },
      { name: "description", content: "확정한 병원으로 이동하고 응급실 입구에서 도착 처리해요." },
      { property: "og:title", content: "이송 중 · 골든타임즈" },
      { property: "og:description", content: "경로 안내, 남은 시간, 승인 취소 경보, 목적지 변경, 도착 처리" },
    ],
  }),
  component: TransportPage,
});

const DEST: { k: DestChangeReason; l: string }[] = [
  { k: "patient_change", l: "환자 상태 변화" }, { k: "road", l: "도로 사정" }, { k: "hospital", l: "병원 사정" }, { k: "etc", l: "기타" },
];

function TransportPage() {
  const e = useEngine();
  const t = useTransport();
  const nav = useNavigate();
  const h = e.confirmedId ? hospital(e.confirmedId) : null;
  const [left, setLeft] = useState(h?.min ?? 0);
  const [near, setNear] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { if (!e.status) nav({ to: "/" }); }, [e.status, nav]);
  useEffect(() => { setLeft(h?.min ?? 0); setNear(false); }, [h?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setInterval(() => setLeft((m) => Math.max(0, m - 1)), 2500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (left === 0 && h) setNear(true); }, [left, h]);
  useEffect(() => { if (e.alert) navigator.vibrate?.([300, 100, 300]); }, [e.alert]);

  const run = (r: { ok: boolean; error?: string }) => { if (!r.ok && r.error) toast.error(r.error); return r.ok; };
  if (!h) return null;
  const req = latestReq(h.id);
  const go = h.min ? 1 - left / h.min : 1;

  const arrive = () => {
    t.setConfirmed({ id: h.id, name: h.name, km: h.km, min: h.min, ...(req?.note ? { note: req.note } : {}) });
    t.setTimeline({ ...t.timeline, departAt: t.timeline.departAt ?? new Date(e.history.find((x) => x.to === "moving")?.at ?? Date.now()), arriveAt: new Date() });
    run(actions.arrive());
  };

  return (
    <PhoneScreen
      title={near ? `${h.name} 응급실 입구` : `${h.name} · ${left}분 남음`}
      subtitle={near ? "응급실 입구 30m 안이에요" : "이송 중 · 위치 기록 (화면 맨 위 표시 중)"}
      badge={<Pill tone={near ? "ok" : "call"} dot={false} className="bg-primary/8 text-primary">{h.km}km</Pill>}
      footer={
        <div className="space-y-2">
          {near ? (
            <BigButton variant="success" size="lg" className="text-lg" onClick={arrive}>도착 처리</BigButton>
          ) : (
            <BigButton variant="outline" onClick={() => setNear(true)}>도착했어요 (입구 30m 안에서 켜져요)</BigButton>
          )}
          <BigButton variant="outline" onClick={() => window.confirm("이송을 취소할까요? 확정 병원에도 취소가 전달돼요.") && run(actions.cancel())}>이송 취소</BigButton>
        </div>
      }
    >
      <ProgressStrip />
      {e.alert && (
        <div className="mb-4 rounded-xl border-2 border-destructive bg-destructive/8 p-4 shadow-[var(--shadow-card)]">
          <p className="flex items-center gap-2 font-extrabold text-destructive"><AlertTriangle className="size-5" /> {e.alert}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">경로 안내는 그대로 유지돼요. 자동으로 다시 요청하지 않아요.</p>
          <BigButton variant="danger" className="mt-3" onClick={() => run(actions.reRequest())}>다시 요청 (현재 반경 {e.radius}km)</BigButton>
        </div>
      )}

      {/* 경로 안내 */}
      <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface">
        <span aria-hidden className="pointer-events-none absolute -top-10 right-0 size-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute inset-x-10 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
        <div className="absolute left-10 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent transition-all duration-700" style={{ width: `calc((100% - 5rem) * ${go})` }} />
        <Navigation className="absolute top-1/2 left-7 size-6 -translate-y-1/2 text-primary" />
        <span className="absolute top-1/2 right-6 size-8 -translate-y-1/2 rounded-full bg-accent-soft ring-4 ring-accent/20" />
        <MapPin className="absolute top-1/2 right-[1.4rem] size-5 -translate-y-1/2 text-accent-deep" />
        <p className="absolute bottom-3 text-[11px] text-muted-foreground">경로 안내 (운전 대원 폰 · 실패 시 내비 앱 호출)</p>
      </div>

      <div className="tile mt-4 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase"><Timer className="size-3.5" /> 남은 시간</p>
          <p className="mt-1 text-3xl leading-none font-extrabold tabular-nums">약 {left}분</p>
        </div>
        <Pill tone="ok">병원 화면에 1분마다 전달</Pill>
      </div>
      {req?.note && <div className="mt-3"><Notice tone="info">병원 안내 · "{req.note}"</Notice></div>}

      <a href={`tel:${h.erPhone}`} className="tile mt-3 flex h-12 w-full items-center justify-center gap-2 px-4 text-[15px] font-bold transition hover:bg-surface">
        <Phone className="size-4.5 text-accent-deep" /> {h.name} 응급실 직통 {h.erPhone}
      </a>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <BigButton variant="outline" onClick={() => nav({ to: "/patient" })}><Send className="size-4" /> 환자 정보 보내기</BigButton>
        <BigButton
          variant="outline"
          disabled={e.destChanged}
          onPointerDown={() => { press.current = setTimeout(() => setDestOpen(true), 700); }}
          onPointerUp={() => clearTimeout(press.current)}
          onPointerLeave={() => clearTimeout(press.current)}
        >
          {e.destChanged ? "목적지 변경 (사용함)" : "목적지 변경 (길게)"}
        </BigButton>
      </div>
      {destOpen && (
        <div className="tile rise-in mt-2 p-3.5">
          <p className="mb-2.5 text-sm font-bold">변경 사유 (1번만 바꿀 수 있어요)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEST.map((d) => (
              <button key={d.k} className="chip justify-center py-2.5 text-sm hover:bg-surface-2" onClick={() => { setDestOpen(false); run(actions.changeDestination(d.k)); }}>{d.l}</button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">환자 상태가 바뀌면 '환자 정보 보내기'에서 고쳐서 보내면 확정 병원에 강조 표시돼요. 병원에는 구급차 위치를 보내지 않고 도착 예상 시간만 보내요.</p>
      <DemoTools showConfirmed />
    </PhoneScreen>
  );
}
