import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Ambulance, UserPlus, ChevronRight } from "lucide-react";
import { BigButton, Label, Notice } from "@/components/phone";
import { useAuth, setAuth, tryLogin, getAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "로그인 · 세이브타임 구급대원" },
      { name: "description", content: "119 구급대원 전용 로그인. 근무 중에는 다시 묻지 않아요." },
      { property: "og:title", content: "로그인 · 세이브타임" },
      { property: "og:description", content: "병원 승인 후 출발하는 이송" },
    ],
  }),
  component: Login,
});

/** SFR-018: 아이디/비밀번호. 로그인은 근무 동안 유지, 근무 종료 때 끝남 (자동 로그인 · 앱 잠금 없음) */
function Login() {
  useAuth();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = tryLogin(getAuth(), id, pw);
    setAuth(r.patch);
    setErr(r.error ?? "");
  };

  return (
    <div className="surface-header mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-6 pb-8 pt-14 text-primary-foreground">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-10 size-64 rounded-full bg-accent/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -left-20 top-40 size-56 rounded-full bg-primary-foreground/8 blur-3xl" />

      <div className="relative flex flex-1 flex-col">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent shadow-[var(--shadow-accent)]"><Ambulance className="size-7 text-accent-foreground" /></span>
        <p className="mt-6 text-[11px] font-bold tracking-[0.18em] text-primary-foreground/60 uppercase">119 구급대원 전용</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">세이브타임</h1>
        <p className="mt-1.5 text-sm text-primary-foreground/70">병원 승인 후 출발하는 이송</p>

        <form onSubmit={submit} className="elevate-lg mt-9 space-y-3.5 rounded-2xl bg-card p-5 text-card-foreground">
          <div><Label>아이디</Label><input className="field" value={id} onChange={(e) => setId(e.target.value)} placeholder="kimdoyun" autoComplete="username" autoCapitalize="none" /></div>
          <div><Label>비밀번호</Label><input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></div>
          {err && <Notice tone="warn">{err}</Notice>}
          <BigButton size="lg" type="submit" className="mt-1">로그인</BigButton>
          <p className="text-center text-xs text-muted-foreground">근무 중에는 앱을 다시 열어도 로그인을 묻지 않아요</p>
        </form>

        <Link to="/signup" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/8 p-4 transition hover:bg-primary-foreground/14">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-foreground/12"><UserPlus className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">처음이세요? 가입 신청</p>
            <p className="mt-0.5 text-xs text-primary-foreground/65">이름 · 소속 소방서 · 공무원증으로 신청해요</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-primary-foreground/60" />
        </Link>

        <div className="mt-auto pt-8">
          <p className="text-center text-xs text-primary-foreground/55">
            비밀번호를 잊으면 소속 관리자에게 초기화를 요청하세요 · 5번 틀리면 10분 동안 잠겨요
          </p>
          <p className="mt-2 text-center text-xs text-primary-foreground/40">시연 계정: kimdoyun / savetime1</p>
        </div>
      </div>
    </div>
  );
}
