import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PhoneScreen, BigButton, SectionTitle, Label, Notice } from "@/components/phone";
import { useTransport, filledCount, REQUIRED_FIELDS, UNKNOWN, type Patient, type Grade } from "@/lib/transport-store";
import { HOSPITALS, isTarget, START_RADIUS } from "@/lib/hospitals";
import { useEngine, actions } from "@/lib/engine";
import { ACTIVE } from "@/lib/domain/stateMachine";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "환자 정보 입력 · 세이브타임" },
      { name: "description", content: "3단계로 환자 상태를 입력하고 병원에 요청해요." },
      { property: "og:title", content: "환자 정보 입력 · 세이브타임" },
      { property: "og:description", content: "병원 등급, 주 증상, 활력징후, 통증·외상·과거력 입력" },
    ],
  }),
  component: PatientPage,
});

const GRADES: { g: Exclude<Grade, null>; sub: string }[] = [
  { g: "대학병원급", sub: "권역센터" },
  { g: "종합병원급", sub: "지역센터" },
  { g: "일반 병원", sub: "지역기관" },
];
const CONSC = ["명료", "말에 반응", "통증에 반응", "무반응"];

function PatientPage() {
  const { patient, setPatient } = useTransport();
  const [step, setStep] = useState(1);
  const nav = useNavigate();
  const e = useEngine();
  const active = !!e.status && ACTIVE.includes(e.status);
  const p = patient;
  const send = () => {
    const r = active ? actions.updateAssessment() : actions.create(p.grade);
    if (!r.ok) { toast.error(r.error); return; }
    if (active) { toast.success("변경 사항을 병원에 보냈어요 · 강조 표시돼요"); nav({ to: e.status === "moving" ? "/transport" : "/request" }); }
  };
  const set = (k: keyof Patient, v: string | Grade) => setPatient({ ...p, [k]: v });
  const count = filledCount(p);
  const allDone = count === REQUIRED_FIELDS.length;
  const targets = HOSPITALS.filter((h) => h.km <= START_RADIUS && isTarget(h, p.grade)).length;

  const fillUnknown = () => {
    const next = { ...p };
    REQUIRED_FIELDS.forEach((k) => {
      if (!String(next[k]).trim()) (next[k] as string) = UNKNOWN;
    });
    setPatient(next);
  };

  const spo2 = Number(p.spo2);
  const warnings: string[] = [];
  if (spo2 && spo2 < 94) warnings.push(`산소포화도 ${spo2}%`);
  const [sys] = p.bp.split("/").map(Number);
  if (sys && (sys >= 160 || sys < 90)) warnings.push(`혈압 ${p.bp}`);
  const pulse = Number(p.pulse);
  if (pulse && (pulse > 120 || pulse < 50)) warnings.push(`맥박 ${pulse}`);

  const text = (k: keyof Patient, ph?: string, mode?: "numeric" | "text") => (
    <input className="field" value={p[k] as string} placeholder={ph} inputMode={mode} onChange={(e) => set(k, e.target.value)} />
  );

  return (
    <PhoneScreen
      title="환자 정보 입력"
      subtitle={allDone ? "필수 12개 모두 입력됨" : `필수 12개 중 ${count}개 입력됨`}
      footer={
        <>
          <div className="flex gap-2">
            {step > 1 && (
              <BigButton variant="outline" onClick={() => setStep(step - 1)}>← 이전</BigButton>
            )}
            {step < 3 && (
              <BigButton variant="outline" onClick={() => setStep(step + 1)}>
                {step === 1 ? "다음: 활력징후 →" : "다음: 통증 · 외상 →"}
              </BigButton>
            )}
          </div>
          <BigButton className="mt-2" disabled={!allDone} onClick={send}>{active ? "변경 사항 보내기" : "병원에 요청"}</BigButton>
          <p className="mt-2 text-xs text-muted-foreground">
            {step === 1 && "필수 항목이 모두 채워지면 어느 단계에서든 요청할 수 있어요"}
            {step === 2 && "← 이전 단계로 돌아가 언제든 고칠 수 있어요"}
            {step === 3 && "이름 · 주민번호 · 연락처는 받지 않아요"}
          </p>
        </>
      }
    >
      <div className="mb-1 flex gap-2">
        {[1, 2, 3].map((s) => (
          <button key={s} onClick={() => setStep(s)} aria-label={`${s}단계`} className={cn("h-1.5 flex-1 rounded-full", s <= step ? "bg-primary" : "bg-border")} />
        ))}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {step === 1 && "1/3 · 병원 등급 · 주 증상 · 성별·나이대"}
        {step === 2 && "2/3 · 의식 · 활력징후"}
        {step === 3 && "3/3 · 통증 · 외상 · 선택 항목"}
      </p>

      {step === 1 && (
        <>
          <SectionTitle>병원 등급 (선택)</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {GRADES.map(({ g, sub }) => {
              const on = p.grade === g;
              return (
                <button key={g} onClick={() => set("grade", on ? null : g)}
                  className={cn("rounded-lg border-2 px-2 py-3 text-center", on ? "border-accent bg-accent-soft text-accent" : "border-border bg-card")}>
                  <span className="block font-bold">{g}</span>
                  <span className="block text-xs opacity-75">{sub}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">고른 등급 이상 병원에만 요청해요. 안 고르면 모든 병원에 요청해요.</p>

          <SectionTitle>주 증상 (필수)</SectionTitle>
          <Label>직접 입력하세요</Label>
          {text("complaint", "예: 갑작스러운 극심한 두통, 의식 저하")}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <Label>성별</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {["남", "여"].map((s) => (
                  <button key={s} onClick={() => set("sex", s)} className={cn("field text-center", p.sex === s && "border-accent bg-accent-soft font-bold text-accent")}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>나이대</Label>
              <select className="field" value={p.age} onChange={(e) => set("age", e.target.value)}>
                <option value="">선택</option>
                {["10세 미만", "10대", "20대", "30대", "40대", "50대", "60대", "70대", "80대 이상"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <SectionTitle>의식 수준</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {CONSC.map((c) => (
              <button key={c} onClick={() => set("consciousness", c)}
                className={cn("rounded-full px-4 py-2 text-sm font-semibold", p.consciousness === c ? "bg-accent-soft text-accent" : "bg-muted text-secondary-foreground")}>{c}</button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-3">
            <div><Label>혈압</Label>{text("bp", "160/95")}</div>
            <div><Label>맥박</Label>{text("pulse", "88", "numeric")}</div>
            <div><Label>호흡수</Label>{text("resp", "20", "numeric")}</div>
            <div><Label>산소포화도 (%)</Label>{text("spo2", "89", "numeric")}</div>
          </div>
          {warnings.length > 0 && (
            <div className="mt-4"><Notice tone="warn">{warnings.join(" · ")} · 정상 범위 밖이라 병원 웹에 빨간색으로 보여요</Notice></div>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            <div><Label>통증 부위</Label>{text("painSite", "머리")}</div>
            <div><Label>통증 정도 (0~10)</Label>{text("painScore", "8", "numeric")}</div>
            <div><Label>증상 시작</Label>{text("onset", "30분 전")}</div>
            <div><Label>외상</Label>{text("trauma", "없음")}</div>
          </div>
          <div className="mt-3"><Label>과거력 (선택)</Label>{text("history", "고혈압, 당뇨")}</div>
          <p className="mt-3 text-xs text-muted-foreground">선택 항목</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <div><Label>체온 ℃</Label>{text("temp", "36.5")}</div>
            <div><Label>혈당</Label>{text("glucose", "120", "numeric")}</div>
            <div>
              <Label>KTAS</Label>
              <select className="field" value={p.ktas} onChange={(e) => set("ktas", e.target.value)}>
                <option value="">-</option>
                {["1", "2", "3", "4", "5"].map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <BigButton variant="outline" className="mt-4" onClick={fillUnknown}>
            나머지 확인 불가로 보내기
          </BigButton>
          <div className="mt-4 rounded-lg bg-info-soft px-4 py-3">
            <p className="text-sm font-bold">{p.grade ? `${p.grade} 이상 · ` : "모든 등급 · "}반경 {START_RADIUS}km 안 {targets}곳에 요청합니다</p>
            <p className="text-xs text-muted-foreground">등급 바꾸기는 ① 단계에서</p>
          </div>
        </>
      )}
    </PhoneScreen>
  );
}
