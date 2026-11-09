import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Ambulance, FileText, Users, ShieldCheck, Settings, ArrowRight, BellRing } from "lucide-react";
import { PhoneScreen, BigButton, SectionTitle, Pill } from "@/components/phone";
import { useTransport } from "@/lib/transport-store";
import { useAuth, currentAccount } from "@/lib/auth-store";
import { useEngine, actions, hospital } from "@/lib/engine";
import { ACTIVE } from "@/lib/domain/stateMachine";
import { STATUS_LABEL } from "@/components/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "근무 중 · 세이브타임 구급대원" },
      { name: "description", content: "근무 상태와 팀을 확인하고 새 이송을 시작해요." },
      { property: "og:title", content: "세이브타임 구급대원 앱" },
      { property: "og:description", content: "119 구급대원용 응급실 실시간 이송 요청 앱" },
    ],
  }),
  component: Home,
});

function Home() {
  const { reset, setTimeline } = useTransport();
  const a = useAuth();
  const me = currentAccount(a);
  const e = useEngine();
  const nav = useNavigate();
  const active = !!e.status && ACTIVE.includes(e.status);

  const start = () => {
    reset();
    actions.reset();
    const now = new Date();
    setTimeline({
      callAt: new Date(now.getTime() - 14 * 60000),
      dispatchAt: new Date(now.getTime() - 12 * 60000),
      sceneAt: new Date(now.getTime() - 4 * 60000),
      contactAt: new Date(now.getTime() - 3 * 60000),
    });
    nav({ to: "/patient" });
  };
  const resume = () => {
    if (e.status === "moving") nav({ to: "/transport" });
    else if (e.status === "phone_check" && e.phoneTarget) nav({ to: "/call/$hospitalId", params: { hospitalId: e.phoneTarget } });
    else nav({ to: "/request" });
  };

  const team = [
    { id: "me", name: me?.name ?? "나", role: `${a.duty?.role ?? "처치"} · 나` },
    ...(a.duty?.members ?? []).map((m) => ({ id: m.loginId, name: m.name, role: m.role })),
  ];
  const started = a.duty ? new Date(a.duty.startedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

  return (
    <PhoneScreen
      title="세이브타임"
      subtitle={`${me?.name ?? ""} ${me?.rank ?? ""} · ${me?.center ?? ""}`}
      footer={
        active ? (
          <BigButton onClick={resume}>진행 중 이송으로 <ArrowRight className="size-5" /></BigButton>
        ) : (
          <BigButton onClick={start}><Ambulance className="size-5" /> 새 이송 시작</BigButton>
        )
      }
    >
      <div className="mb-3 flex justify-end">
        <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground"><Settings className="size-4" /> 설정</Link>
      </div>
      {active && (
        <button onClick={resume} className="mb-3 w-full rounded-xl border-2 border-accent bg-accent-soft p-4 text-left">
          <p className="text-xs text-accent">진행 중 이송 · 팀당 1건</p>
          <p className="mt-1 text-lg font-bold">{STATUS_LABEL[e.status!]}{e.confirmedId ? ` · ${hospital(e.confirmedId).name}` : ""}</p>
        </button>
      )}
      <div className="tile flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">근무 상태</p>
          <p className="mt-1 text-lg font-bold">근무 중 · {started} 시작</p>
        </div>
        <Pill tone={active ? "wait" : "ok"}>{active ? "이송 중" : "출동 가능"}</Pill>
      </div>

      {a.incoming.length > 0 && (
        <Link to="/invite" className="tile mt-3 flex items-center gap-3 border-2 border-accent bg-accent-soft p-4">
          <BellRing className="size-5 shrink-0 text-accent" />
          <div className="flex-1">
            <p className="font-bold">팀 초대 {a.incoming.length}건</p>
            <p className="text-xs text-muted-foreground">{a.incoming.map((i) => `${i.from.name} 대원 · 팀 ${i.teamCode}`).join(", ")} · 5분 안에 답해야 해요</p>
          </div>
          <ArrowRight className="size-5 text-accent" />
        </Link>
      )}


      <SectionTitle hint={`팀 코드 ${a.duty?.teamCode ?? "-"} · 팀당 진행 중 이송은 1건이에요`}>
        <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> 오늘의 팀</span>
      </SectionTitle>
      <div className="tile divide-y">
        {team.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-semibold">{m.name}</span>
            <span className="text-sm text-muted-foreground">{m.role}</span>
          </div>
        ))}
      </div>

      <SectionTitle>기록</SectionTitle>
      <Link to="/log" className="tile flex items-center gap-3 p-4">
        <FileText className="size-5 text-accent" />
        <div className="flex-1">
          <p className="font-semibold">구급활동일지</p>
          <p className="text-xs text-muted-foreground">도착 처리하면 입력한 정보가 자동으로 채워져요</p>
        </div>
      </Link>

      <p className="mt-6 flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        환자 이름 · 주민번호 · 연락처는 받지 않아요. 본 서비스는 참고용이며 병원 수용을 보장하지 않습니다.
      </p>
    </PhoneScreen>
  );
}
