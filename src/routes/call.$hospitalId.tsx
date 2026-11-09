import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { PhoneScreen, BigButton, SectionTitle, Notice, Pill } from "@/components/phone";
import { ProgressStrip, DemoTools } from "@/components/progress";
import { HOSPITALS, RESPONSE_LIMIT_SEC, capCount } from "@/lib/hospitals";
import { HospitalDetail } from "@/components/hospital-detail";
import { useEngine, actions, now, hospital, openRemain } from "@/lib/engine";
import type { PhoneProceedReason } from "@/lib/domain/stateMachine";

export const Route = createFileRoute("/call/$hospitalId")({
  loader: ({ params }) => {
    const h = HOSPITALS.find((x) => x.id === params.hospitalId);
    if (!h) throw notFound();
    return h;
  },
  head: () => ({
    meta: [
      { title: "전화 확인 · 세이브타임" },
      { name: "description", content: "요청을 열어 둔 채 응급실에 직접 전화로 확인해요." },
      { property: "og:title", content: "전화 확인 · 세이브타임" },
      { property: "og:description", content: "응급실 원터치 전화와 통화 결과 기록" },
    ],
  }),
  component: CallPage,
});

const PROCEED: { k: PhoneProceedReason; l: string }[] = [
  { k: "no_answer", l: "전화 안 받음" }, { k: "busy", l: "통화 중" }, { k: "urgent", l: "환자가 급함" }, { k: "etc", l: "기타" },
];

function CallPage() {
  const h = Route.useLoaderData();
  const e = useEngine();
  const nav = useNavigate();
  const [proceed, setProceed] = useState<"fail" | "skip" | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!e.status) nav({ to: "/" });
  }, [e.status, nav]);

  const run = (r: { ok: boolean; error?: string }) => { if (!r.ok && r.error) toast.error(r.error); };
  const remain = RESPONSE_LIMIT_SEC - Math.floor((now() - e.roundSentAt) / 1000);
  const open = openRemain();
  const approved = e.hreqs.filter((r) => r.status === "approved");
  const inPhone = e.status === "phone_check";

  return (
    <PhoneScreen
      title="전화 확인"
      subtitle={`${h.name} · ${h.km}km · 약 ${h.min}분`}
      footer={<BigButton variant="outline" onClick={() => (inPhone ? run(actions.phoneDismiss()) : nav({ to: "/request" }))}>← 요청 화면으로</BigButton>}
    >
      <ProgressStrip />
      {open ? (
        <Notice tone="info">다른 병원 요청은 그대로 열려 있어요{remain > 0 ? ` (남은 ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")})` : ""}</Notice>
      ) : (
        <Notice tone="warn">열린 요청이 없어요 · 돌아가면 예비 추천이 보여요</Notice>
      )}

      {approved.length > 0 && (
        <div className="mt-3 rounded-xl border-2 border-success bg-success-soft/50 p-3">
          <p className="text-sm font-bold text-success">통화 중 승인 {approved.length}곳 · 눌러서 바로 확정</p>
          {approved.map((r) => (
            <button key={r.hospitalId} className="tile mt-2 flex w-full items-center justify-between p-3 text-left" onClick={() => setDetail(r.hospitalId)}>
              <span className="font-bold">{hospital(r.hospitalId).name} · {hospital(r.hospitalId).km}km</span>
              <Pill tone="ok">승인</Pill>
            </button>
          ))}
        </div>
      )}

      <a href={`tel:${h.phone}`} className="mt-3 block">
        <BigButton variant="accent" className="h-14 text-lg"><Phone className="size-5" /> {h.name} 응급실에 전화</BigButton>
      </a>
      <div className="tile mt-2 p-3">
        <p className="text-xs text-muted-foreground">
          응급실 {h.er ?? "정보 없음"} · 중환자실 {h.icu ?? "정보 없음"} · 수술실 {h.or ?? "정보 없음"} · 진료가능 {capCount(h).available}/{capCount(h).total}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">응급실 직통 {h.erPhone} · 대표 {h.mainPhone} · 병상 기준 {h.bedsAt || "없음"}</p>
      </div>

      <SectionTitle>통화 결과</SectionTitle>
      <BigButton variant="success" className="h-14 text-lg" onClick={() => run(actions.phoneAccepted())}>수용 확정 → 출발</BigButton>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <BigButton variant="outline" onClick={() => setProceed("fail")}>연결 실패</BigButton>
        <BigButton variant="outline" onClick={() => setProceed("skip")}>확인 생략</BigButton>
      </div>
      {proceed && (
        <div className="tile mt-2 p-3">
          <p className="mb-2 text-sm font-semibold">{proceed === "fail" ? "연결 실패" : "확인 생략"} 사유를 고르면 이 병원으로 출발해요</p>
          <div className="grid grid-cols-2 gap-1.5">
            {PROCEED.map((p) => (
              <button key={p.k} className="rounded-md border px-2 py-2 text-sm" onClick={() => run(actions.phoneProceed(p.k))}>{p.l}</button>
            ))}
          </div>
        </div>
      )}
      <BigButton variant="danger" className="mt-2 h-14 text-lg" onClick={() => run(actions.phoneRejected())}>거절 → 다음 병원</BigButton>
      <p className="mt-3 text-xs text-muted-foreground">
        출발하면 열려 있던 요청은 닫히고 병원 웹에 "요청 종료"가 떠요. 통화 중 승인이 오면 진동으로 알려요.
      </p>
      <DemoTools />

      {detail && (
        <HospitalDetail
          h={hospital(detail)}
          approved
          note={[...e.hreqs].reverse().find((r) => r.hospitalId === detail)?.note}
          onClose={() => setDetail(null)}
          onConfirm={() => { setDetail(null); if (window.confirm(`${hospital(detail).name}으로 확정할까요?`)) run(actions.confirm(detail)); }}
        />
      )}
    </PhoneScreen>
  );
}
