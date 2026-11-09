import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Ambulance, UserPlus } from "lucide-react";
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
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-primary px-6 pb-8 pt-14 text-primary-foreground shadow-xl">
      <div className="flex-1">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent"><Ambulance className="size-7 text-accent-foreground" /></span>
        <p className="mt-6 text-sm opacity-70">119 구급대원 전용</p>
        <h1 className="text-3xl font-bold">세이브타임</h1>
        <p className="mt-1 opacity-75">병원 승인 후 출발하는 이송</p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl bg-card p-5 text-card-foreground">
          <div><Label>아이디</Label><input className="field" value={id} onChange={(e) => setId(e.target.value)} placeholder="kimdoyun" autoComplete="username" autoCapitalize="none" /></div>
          <div><Label>비밀번호</Label><input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></div>
          {err && <Notice tone="warn">{err}</Notice>}
          <BigButton type="submit">로그인</BigButton>
          <p className="text-center text-xs text-muted-foreground">근무 중에는 앱을 다시 열어도 로그인을 묻지 않아요</p>
        </form>

        <Link to="/signup" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary-foreground/25 p-4">
          <UserPlus className="size-6 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">처음이세요? 가입 신청</p>
            <p className="text-xs opacity-75">이름 · 소속 소방서 · 공무원증으로 신청해요</p>
          </div>
        </Link>
      </div>
      <p className="mt-6 text-center text-xs opacity-70">
        비밀번호를 잊으면 소속 관리자에게 초기화를 요청하세요.<br />5번 틀리면 10분 동안 잠겨요.
      </p>
      <p className="mt-2 text-center text-xs opacity-50">시연 계정: kimdoyun / savetime1</p>
    </div>
  );
}
