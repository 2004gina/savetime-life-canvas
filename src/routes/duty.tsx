import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Search, UserPlus, LogOut, BellRing, Clock, Users } from "lucide-react";
import { PhoneScreen, BigButton, Label, Notice, SectionTitle, Pill, Segmented, Avatar, IconTile } from "@/components/phone";
import {
  useAuth, setAuth, currentAccount, COLLEAGUES, OPEN_TEAMS, TEAM_MAX, INVITE_MS, driverTaken, type Member, type Role,
} from "@/lib/auth-store";
import { leave } from "@/lib/duty";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/duty")({
  head: () => ({
    meta: [
      { title: "근무 시작 · 골든타임즈" },
      { name: "description", content: "4자리 팀 코드 · QR · 대원 목록으로 오늘의 팀을 맺고 운전 · 처치 역할을 나눠요." },
      { property: "og:title", content: "근무 시작 · 골든타임즈" },
      { property: "og:description", content: "근무마다 팀 맺기, 운전은 팀에 1명" },
    ],
  }),
  component: DutyPage,
});

type Invite = { loginId: string; sentAt: number };

/** SFR-113 · 159: 팀 만들기(4자리 코드 · QR · 목록 초대) 또는 참여(코드 · QR). 팀은 최대 4명, 운전은 1명 */
function DutyPage() {
  const a = useAuth();
  const me = currentAccount(a);
  const myCode = useMemo(() => String(Math.floor(1000 + Math.random() * 9000)), []);
  const [mode, setMode] = useState<"new" | "join">("new");
  const [joined, setJoined] = useState<{ code: string; members: Member[] } | null>(null);
  const [code, setCode] = useState("");
  const [role, setRole] = useState<Role>("처치");
  const [mine, setMine] = useState<Member[]>([]); // 내가 만든 팀에 들어온 대원
  const [invites, setInvites] = useState<Invite[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // 시연: 초대받은 대원이 3초 뒤 '수락'
  useEffect(() => {
    const due = invites.find((i) => now - i.sentAt >= 3000);
    if (!due) return;
    const c = COLLEAGUES.find((x) => x.loginId === due.loginId)!;
    setInvites((l) => l.filter((i) => i !== due));
    setMine((l) => (l.length + 1 >= TEAM_MAX ? l : [...l, { loginId: c.loginId, name: c.name, rank: c.rank, center: c.center, employeeNo: c.employeeNo, role: "처치" }]));
  }, [now, invites]);

  if (!me) return null;
  const members = mode === "new" ? mine : joined?.members ?? [];
  const teamCode = mode === "new" ? myCode : joined?.code ?? "";
  const full = members.length + 1 + (mode === "new" ? invites.length : 0) >= TEAM_MAX;
  const myDriverBlocked = driverTaken(members);

  const join = (c: string) => {
    const t = OPEN_TEAMS[c];
    if (!t) return setErr("팀 코드를 찾을 수 없어요. 팀원 화면의 4자리를 확인하세요 (시연: 4821)");
    if (t.length + 1 > TEAM_MAX) return setErr(`팀은 최대 ${TEAM_MAX}명이에요`);
    setErr("");
    setJoined({ code: c, members: t });
    if (driverTaken(t)) setRole("처치");
  };

  const invite = (loginId: string) => {
    if (full) return setErr(`팀은 최대 ${TEAM_MAX}명이에요`);
    setErr("");
    setInvites((l) => [...l, { loginId, sentAt: Date.now() }]);
  };

  const setMemberRole = (id: string, r: Role) => {
    if (r === "운전" && (role === "운전" || driverTaken(mine, id))) return setErr("운전은 팀에 1명만 정할 수 있어요");
    setErr("");
    setMine((l) => l.map((m) => (m.loginId === id ? { ...m, role: r } : m)));
  };

  const pickMyRole = (r: Role) => {
    if (r === "운전" && myDriverBlocked) return setErr("이미 운전 대원이 있어요. 운전은 팀에 1명이에요");
    setErr("");
    setRole(r);
  };

  const start = () => {
    if (mode === "join" && !joined) return setErr("팀 코드를 입력하거나 QR을 스캔해 주세요");
    if (role === "운전" && myDriverBlocked) return setErr("운전은 팀에 1명이에요");
    setAuth({ duty: { startedAt: new Date().toISOString(), teamCode, isCreator: mode === "new", role, members } });
  };

  const pool = COLLEAGUES.filter((c) => c.orgCode === me.orgCode && c.loginId !== me.loginId && !mine.some((m) => m.loginId === c.loginId));
  const shown = q.trim() ? pool.filter((c) => c.name.includes(q.trim())) : pool.filter((c) => c.onDuty);

  return (
    <PhoneScreen
      title="근무 시작"
      subtitle={`${me.name} ${me.rank} · ${me.orgName} ${me.center}`}
      badge={<Pill tone="neutral" dot={false} className="bg-primary/8 text-primary">{members.length + 1}/{TEAM_MAX}명</Pill>}
      footer={
        <div className="space-y-2">
          <BigButton size="lg" onClick={start}>{mode === "new" ? "팀 만들고 근무 시작" : "이 팀으로 근무 시작"}</BigButton>
          <button className="flex w-full items-center justify-center gap-1.5 py-1 text-sm font-semibold text-muted-foreground" onClick={() => leave("logout")}><LogOut className="size-4" /> 로그아웃</button>
        </div>
      }
    >
      {a.incoming.length > 0 && (
        <Link to="/invite" className="tile mb-4 flex items-center gap-3 border-2 border-accent bg-accent-soft p-4 shadow-[var(--shadow-accent)]">
          <IconTile tone="accent" className="bg-accent text-accent-foreground"><BellRing className="size-5" /></IconTile>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">팀 초대 {a.incoming.length}건 · 확인</p>
            <p className="mt-0.5 truncate text-xs text-accent-deep/85">{a.incoming.map((i) => `${i.from.name} 대원 · 팀 ${i.teamCode}`).join(", ")} · 5분 안에 수락해야 들어갈 수 있어요</p>
          </div>
        </Link>
      )}

      <Segmented
        value={mode}
        onChange={(m) => { setMode(m); setErr(""); }}
        options={[{ value: "new", label: "팀 만들기" }, { value: "join", label: "팀 참여" }]}
      />

      {mode === "new" ? (
        <div className="tile mt-4 flex items-center gap-4 p-4">
          <div className="well shrink-0 rounded-xl p-2.5"><QRCodeSVG value={`savetime:team:${myCode}`} size={92} /></div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">팀원에게 코드나 QR을 보여 주세요</p>
            <p className="mt-1 text-4xl leading-none font-extrabold tracking-[0.22em] tabular-nums">{myCode}</p>
            <p className="mt-2 text-xs text-muted-foreground">팀원이 없어도 바로 시작할 수 있어요</p>
          </div>
        </div>
      ) : joined ? (
        <div className="mt-4"><Notice tone="ok">팀 {joined.code}에 참여했어요</Notice></div>
      ) : (
        <div className="mt-4">
          <Label>팀원이 보여준 4자리 팀 코드</Label>
          <div className="flex gap-2">
            <input className="field flex-1 text-center text-2xl font-extrabold tracking-[0.4em] tabular-nums" inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="4821" />
            <button className="btn-solid-primary shrink-0 rounded-xl px-5 font-extrabold text-primary-foreground" onClick={() => join(code)}>참여</button>
          </div>
          <button className="tile mt-2 flex w-full items-center justify-center gap-2 p-3 text-sm font-bold transition hover:bg-surface" onClick={() => join("4821")}>
            <QrCode className="size-5 text-accent-deep" /> QR 스캔으로 참여
          </button>
          <p className="mt-1.5 text-xs text-muted-foreground">카메라 권한은 QR 스캔할 때 물어요 · 시연: 팀 4821로 참여</p>
        </div>
      )}

      <SectionTitle hint={`최대 ${TEAM_MAX}명 · 운전은 1명 (운전 폰은 주행 중 입력 잠금)`}>
        <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> 오늘의 팀 ({members.length + 1}명)</span>
      </SectionTitle>
      <div className="tile divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar name={me.name} tone="accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{me.name} <span className="text-xs font-semibold text-muted-foreground">나</span></p>
            <p className="truncate text-xs text-muted-foreground">{me.rank} · {me.center}</p>
          </div>
          <RolePick value={role} onChange={pickMyRole} driverOff={myDriverBlocked} />
        </div>
        {members.map((m) => (
          <div key={m.loginId} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={m.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.rank} · {m.center}</p>
            </div>
            {mode === "new" ? <RolePick value={m.role} onChange={(r) => setMemberRole(m.loginId, r)} driverOff={role === "운전" || driverTaken(mine, m.loginId)} /> : <Pill tone="neutral" dot={false}>{m.role}</Pill>}
          </div>
        ))}
        {mode === "new" && invites.map((i) => {
          const c = COLLEAGUES.find((x) => x.loginId === i.loginId)!;
          const left = Math.max(0, INVITE_MS - (now - i.sentAt));
          return (
            <div key={i.loginId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={c.name} tone="muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-muted-foreground">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">초대 보냄 · 수락 대기</p>
              </div>
              <span className="chip shrink-0"><Clock className="size-3" />{Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}</span>
            </div>
          );
        })}
        {members.length === 0 && invites.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground">아직 초대가 없어요. 아래 목록에서 초대하거나 바로 시작할 수 있어요.</p>
        )}
      </div>

      {mode === "new" && (
        <>
          <SectionTitle hint="지금 근무 중인 우리 소방서 대원이 먼저 보여요. 없으면 이름으로 찾으세요">대원 목록에서 초대</SectionTitle>
          <div className="relative">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름으로 소방서 전체 검색" />
          </div>
          <div className="tile mt-2 divide-y divide-border">
            {shown.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">찾는 대원이 없어요</p>}
            {shown.map((c) => {
              const sent = invites.some((i) => i.loginId === c.loginId);
              return (
                <div key={c.loginId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={c.name} tone={c.onDuty ? "ink" : "muted"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.name} <span className="text-xs font-semibold text-muted-foreground">{c.rank} · 사번 끝 {c.employeeNo.slice(-4)}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{c.center}{c.onDuty ? " · 근무 중" : ""}</p>
                  </div>
                  {c.inTeam ? <Pill tone="neutral" dot={false}>다른 팀</Pill> : sent ? <Pill tone="wait">보냄</Pill> : (
                    <button disabled={full} onClick={() => invite(c.loginId)} className="chip chip-on shrink-0 cursor-pointer disabled:opacity-40"><UserPlus className="size-3.5" /> 초대</button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">초대받은 대원이 '수락'해야 팀원이 돼요. 초대는 5분 뒤 만료돼요. 시연: 3초 뒤 수락</p>
        </>
      )}

      {err && <div className="mt-4"><Notice tone="warn">{err}</Notice></div>}
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">근무를 마치거나 로그아웃하면 나만 팀에서 빠져요. 근무 시작 후 14시간이 지나면 자동으로 근무가 끝나요.</p>
    </PhoneScreen>
  );
}

function RolePick({ value, onChange, driverOff }: { value: Role; onChange: (r: Role) => void; driverOff: boolean }) {
  return (
    <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-surface-2 p-1">
      {(["처치", "운전"] as const).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          disabled={r === "운전" && driverOff && value !== "운전"}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-35",
            value === r ? "bg-card text-accent-deep shadow-[var(--shadow-card)]" : "text-muted-foreground",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
