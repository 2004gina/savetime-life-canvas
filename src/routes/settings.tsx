import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PhoneScreen, BigButton, SectionTitle, Notice } from "@/components/phone";
import { useAuth, setAuth, resetAuth, getAuth, currentAccount, isIOS, demoInvite, INVITE_MS } from "@/lib/auth-store";
import { actions } from "@/lib/engine";
import { hasActiveTransport, isLastMember, leave } from "@/lib/duty";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "설정 · 세이브타임" },
      { name: "description", content: "근무 종료 · 로그아웃 · 권한 · 회원 탈퇴" },
      { property: "og:title", content: "설정 · 세이브타임" },
      { property: "og:description", content: "구급대원 앱 설정" },
    ],
  }),
  component: Settings,
});

type Kind = "duty_end" | "logout" | "withdrawal";
const KIND_LABEL: Record<Kind, string> = { duty_end: "근무 종료", logout: "로그아웃", withdrawal: "회원 탈퇴" };

function Settings() {
  const a = useAuth();
  const nav = useNavigate();
  const acc = currentAccount(a);
  const [ask, setAsk] = useState<Kind | null>(null);
  const active = hasActiveTransport();
  const last = isLastMember(a);
  const p = a.permissions;
  const permLabel = (v: string, on: string) => (v === "granted" ? on : "꺼짐");
  const started = a.duty ? new Date(a.duty.startedAt) : null;
  const ends = started ? new Date(started.getTime() + 14 * 3600_000) : null;
  const hm = (d: Date) => d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <PhoneScreen title="설정" subtitle={acc ? `${acc.name} ${acc.rank} · ${acc.orgName} ${acc.center}` : ""} footer={<BigButton variant="outline" onClick={() => nav({ to: "/" })}>← 홈으로</BigButton>}>
      {ask && (
        <div className="mb-4 space-y-3 rounded-xl border-2 border-destructive/40 p-4">
          <p className="font-bold">{KIND_LABEL[ask]}할까요?</p>
          {active && <Notice tone="warn">진행 중 이송 1건이 있어요</Notice>}
          <p className="text-sm text-muted-foreground">
            {active && last ? `팀에 나만 남아 있어서, 진행 중 이송을 '취소'(사유: ${KIND_LABEL[ask]})로 끝내요. ` : ""}
            {ask === "withdrawal" ? "계정 · 프로필 정보가 바로 삭제되고 되돌릴 수 없어요." : "나만 팀에서 빠지고 다음에 다시 로그인해야 해요."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <BigButton variant="outline" onClick={() => setAsk(null)}>아니요</BigButton>
            <BigButton variant="danger" onClick={() => { leave(ask); setAsk(null); }}>{KIND_LABEL[ask]}</BigButton>
          </div>
        </div>
      )}

      <SectionTitle hint="근무 종료 = 로그아웃이에요. 근무 시작 후 14시간이 지나면 자동으로 끝나요">근무</SectionTitle>
      <div className="tile divide-y">
        <Row label="팀 코드" value={a.duty?.teamCode ?? "-"} />
        <Row label="내 역할" value={a.duty?.role ?? "-"} />
        <Row label="팀원" value={`${(a.duty?.members.length ?? 0) + 1}명`} />
        {started && ends && <Row label="근무 시간" value={`${hm(started)} 시작 · ${hm(ends)} 자동 종료`} />}
        <button className="w-full px-4 py-3.5 text-left font-semibold text-destructive" onClick={() => setAsk("duty_end")}>근무 종료</button>
      </div>

      <SectionTitle>권한</SectionTitle>
      <div className="tile divide-y">
        <Row label="위치" value={permLabel(p.location, "앱 사용 중 허용")} />
        {!isIOS() && <Row label="전화" value={permLabel(p.phone, "허용")} />}
        <Row label="알림" value={permLabel(p.notify, "허용")} />
      </div>

      <SectionTitle>계정</SectionTitle>
      <div className="tile divide-y">
        <Row label="아이디" value={acc?.loginId ?? "-"} />
        <Row label="사번" value={acc?.employeeNo ?? "-"} />
        <button className="w-full px-4 py-3.5 text-left" onClick={() => setAsk("logout")}>로그아웃</button>
        <button className="w-full px-4 py-3.5 text-left text-destructive" onClick={() => setAsk("withdrawal")}>회원 탈퇴</button>
      </div>

      <SectionTitle>시연</SectionTitle>
      <div className="tile divide-y text-sm text-muted-foreground">
        <button className="w-full px-4 py-3.5 text-left" onClick={() => setAuth(demoInvite(getAuth()))}>
          이보준이 나를 팀 4821에 초대 (팀 초대 알림)
        </button>
        <button className="w-full px-4 py-3.5 text-left" onClick={() => setAuth({ incoming: getAuth().incoming.map((i) => ({ ...i, sentAt: Date.now() - INVITE_MS })) })}>
          초대 5분 지나게 (만료)
        </button>
        <button className="w-full px-4 py-3.5 text-left" onClick={() => a.duty && setAuth({ duty: { ...a.duty, startedAt: new Date(Date.now() - 14 * 3600_000).toISOString() } })}>

          근무 14시간 지나기
        </button>
        <button className="w-full px-4 py-3.5 text-left" onClick={() => setAuth({ serverMinVersion: "9.0.0" })}>앱 최소 버전 올리기 (업데이트 안내)</button>
        <button className="w-full px-4 py-3.5 text-left" onClick={() => { actions.reset(); resetAuth(); nav({ to: "/welcome" }); }}>
          처음 쓰는 날부터 다시 보기
        </button>
      </div>
    </PhoneScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 px-4 py-3.5"><span>{label}</span><span className="text-right text-muted-foreground">{value}</span></div>;
}
