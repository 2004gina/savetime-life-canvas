import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PhoneScreen, BigButton, SectionTitle, Pill, Notice } from "@/components/phone";
import { ProgressStrip, DemoTools } from "@/components/progress";
import { useEngine, actions, now, hospital, phoneCandidates, REASON_LABEL, CLOSE_LABEL, type Hreq } from "@/lib/engine";
import { HOSPITALS, RESPONSE_LIMIT_SEC, RADIUS_STEPS, capCount } from "@/lib/hospitals";
import { HospitalDetail } from "@/components/hospital-detail";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "병원 응답 대기 · 세이브타임" },
      { name: "description", content: "여러 응급실에 동시에 요청하고 2분 안에 승인을 받아요." },
      { property: "og:title", content: "병원 응답 대기 · 세이브타임" },
      { property: "og:description", content: "승인 칸, 거리순 추천, 예비 추천, 확정" },
    ],
  }),
  component: RequestPage,
});

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

function RequestPage() {
  const e = useEngine();
  const nav = useNavigate();
  const [pick, setPick] = useState<string | null>(null);
  const [frozen, setFrozen] = useState<Hreq[] | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!e.status) nav({ to: "/" });
  }, [e.status, nav]);

  const t = now();
  const live = e.hreqs.filter((h) => h.status === "approved").sort((a, b) => (a.respondedAt ?? 0) - (b.respondedAt ?? 0));
  const approved = frozen ?? live;
  const nearest = [...approved].sort((a, b) => hospital(a.hospitalId).km - hospital(b.hospitalId).km)[0];
  const cur = e.hreqs.filter((h) => h.round === e.round);
  const waiting = cur.filter((h) => h.status === "waiting").length;
  const rejected = cur.filter((h) => h.status === "rejected").length;
  const remain = RESPONSE_LIMIT_SEC - Math.floor((t - e.roundSentAt) / 1000);
  const fallback = e.status === "fallback";

  // 새 승인 알림 (진동)
  const seen = useRef(0);
  useEffect(() => {
    if (live.length > seen.current) {
      const n = live[live.length - 1];
      if (n) toast.success(`새 승인 · ${hospital(n.hospitalId).name}`);
      navigator.vibrate?.(300);
    }
    seen.current = live.length;
  }, [live.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (r: { ok: boolean; error?: string }) => { if (!r.ok && r.error) toast.error(r.error); return r.ok; };

  /** 병원 상세 → 전화 확인 (SFR-032) */
  const phone = (id: string) => {
    setDetail(null);
    if (run(actions.startPhone(id))) nav({ to: "/call/$hospitalId", params: { hospitalId: id } });
  };

  // 거리순 목록: 승인 칸에 없는 병원 + 각 병원의 최근 요청 상태
  const nearby = HOSPITALS.filter((h) => h.km <= e.radius && !live.some((a) => a.hospitalId === h.id)).map((h) => {
    const req = [...e.hreqs].reverse().find((r) => r.hospitalId === h.id);
    return { h, req };
  }).filter(({ h, req }) => !(e.excluded.includes(h.id) && req?.status !== "waiting"));
  const excludedNames = e.excluded.map((id) => hospital(id).name);
  const canExpand = RADIUS_STEPS.indexOf(e.radius) < RADIUS_STEPS.length - 1;
  const lastNewRadius = phoneCandidates().length;

  const subtitle = fallback
    ? `${cur.length}곳 응답 종료 · 반경 ${e.radius}km`
    : `${cur.length}곳 요청 · ${e.grade ? `${e.grade} 이상` : "모든 등급"} · 반경 ${e.radius}km`;

  return (
    <PhoneScreen
      title={fallback ? "예비 추천" : "병원 응답 대기"}
      subtitle={subtitle}
      footer={
        <div className="space-y-2">
          {fallback && (canExpand ? (
            <BigButton onClick={() => run(actions.expand())}>반경 넓혀 다시 요청 ({RADIUS_STEPS[RADIUS_STEPS.indexOf(e.radius) + 1]}km)</BigButton>
          ) : (
            <Notice tone="warn">최대 반경(40km)이에요 · 가까운 병원에 전화로 확인하세요</Notice>
          ))}
          <BigButton variant="outline" onClick={() => window.confirm("이송을 취소할까요? 열린 요청이 모두 닫혀요.") && run(actions.cancel())}>이송 취소</BigButton>
        </div>
      }
    >
      <ProgressStrip />
      {fallback && e.fallbackReason && (
        <div className="mb-4"><Notice tone="warn">{REASON_LABEL[e.fallbackReason] ?? "승인한 병원이 없어요"} · 가까운 병원에 전화로 확인하세요</Notice></div>
      )}
      {!fallback && live.length > 0 && (
        <div className="mb-3"><Notice tone="ok">새 승인 · {hospital(live[live.length - 1]!.hospitalId).name} (진동)</Notice></div>
      )}

      <div
        onPointerDown={() => setFrozen(live)}
        onPointerUp={() => setFrozen(null)}
        onPointerLeave={() => setFrozen(null)}
        className={cn("rounded-xl p-4", approved.length ? "border-2 border-success bg-success-soft/50" : "border-2 border-dashed bg-card")}
      >
        <div className="flex items-baseline justify-between">
          <h2 className={cn("text-xl font-bold", approved.length && "text-success")}>승인 {approved.length}곳</h2>
          <span className="text-xs text-muted-foreground">{fallback ? "· 응답 종료" : approved.length ? "· 온 순서대로 쌓여요" : ""}</span>
        </div>
        {approved.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">승인이 오면 여기에 모여요 · 진동으로 알려요</p>
        ) : (
          <div className="mt-3 space-y-2">
            {approved.map((r) => {
              const h = hospital(r.hospitalId);
              return (
                <button key={r.hospitalId + r.round} onClick={() => setDetail(r.hospitalId)} className="tile flex w-full items-center justify-between p-3.5 text-left">
                  <div>
                    <p className="font-bold">{h.name} · {h.km}km {r.recheck && <span className="ml-1 text-xs text-accent">재확인</span>}</p>
                    <p className="text-sm text-muted-foreground">약 {h.min}분 · 응급실 {h.er ?? "정보 없음"} · 진료가능 {capCount(h).available}/{capCount(h).total}</p>
                    <p className="text-sm text-muted-foreground">{r.note ? `"${r.note}"` : "메모 없음"}</p>
                  </div>
                  <Pill tone="ok">{r.hospitalId === nearest?.hospitalId ? "가장 가까움" : "승인"}</Pill>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {approved.length > 0 && <p className="mt-2 text-xs text-muted-foreground">👆 화면을 누르고 있는 동안에는 위치가 바뀌지 않아요. 손을 떼면 새 승인이 들어와요.</p>}

      {!fallback && (
        <div className="tile mt-3 flex items-end justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">남은 시간</p>
            <p className={cn("text-2xl font-bold tabular-nums", remain <= 30 && "text-destructive")}>{mmss(Math.max(0, remain))}</p>
          </div>
          <p className="text-sm text-muted-foreground">대기 {waiting} · 거절 {rejected}</p>
        </div>
      )}

      <SectionTitle hint={fallback ? "거절 · 승인 취소한 병원은 빠져요" : "기다리는 중에도 전화로 확인할 수 있어요 (요청은 열어 둬요)"}>가까운 병원 (거리순)</SectionTitle>
      <div className="space-y-2">
        {nearby.map(({ h, req }) => {
          const st = req?.status;
          const label = !req ? "요청 안 함" : st === "waiting" ? "요청함" : st === "closed" && req.closeReason ? CLOSE_LABEL[req.closeReason] : st === "expired" ? "응답 없음" : st === "delivery_failed" ? "전달 실패" : "요청함";
          const isWaiting = st === "waiting" && !fallback;
          return (
            <button
              key={h.id}
              disabled={isWaiting}
              onClick={() => setDetail(h.id)}
              className="tile flex w-full items-center justify-between p-3.5 text-left"
            >
              <div>
                <p className="font-bold">{h.name} · {h.km}km</p>
                <p className="text-sm text-muted-foreground">약 {h.min}분 · {h.er ? `응급실 ${h.er}` : "병상 정보 없음"} · 진료가능 {capCount(h).available}/{capCount(h).total} · {label}</p>
              </div>
              {isWaiting ? <Pill tone="wait">대기</Pill> : !h.er ? <Pill tone="neutral">병상 정보 없음 · 전화</Pill> : <Pill tone="call">전화 확인</Pill>}
            </button>
          );
        })}
        {nearby.length === 0 && <p className="text-sm text-muted-foreground">반경 안에 남은 병원이 없어요{lastNewRadius ? "" : " · 반경을 넓혀 보세요"}</p>}
      </div>
      {excludedNames.length > 0 && <p className="mt-3 text-xs text-muted-foreground">거절 · 승인 취소한 {excludedNames.join(", ")}은 목록에서 빠져요</p>}

      <DemoTools />

      {pick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 p-6" onClick={() => setPick(null)}>
          <div className="w-full max-w-[380px] rounded-2xl bg-card p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="text-lg font-bold">{hospital(pick).name}으로 확정할까요?</h3>
            <p className="mt-2 text-muted-foreground">약 {hospital(pick).min}분 · {hospital(pick).km}km</p>
            <p className="mt-3 text-sm text-muted-foreground">확정하면 다른 병원 요청은 닫혀요</p>
            <div className="mt-4 flex gap-2">
              <BigButton variant="outline" onClick={() => setPick(null)}>취소</BigButton>
              <BigButton variant="success" onClick={() => { run(actions.confirm(pick)); setPick(null); }}>확정</BigButton>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <HospitalDetail
          h={hospital(detail)}
          approved={live.some((r) => r.hospitalId === detail)}
          note={[...e.hreqs].reverse().find((r) => r.hospitalId === detail)?.note}
          onClose={() => setDetail(null)}
          onConfirm={() => { setPick(detail); setDetail(null); }}
          onPhone={() => phone(detail)}
        />
      )}
    </PhoneScreen>
  );
}
