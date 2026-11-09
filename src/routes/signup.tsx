import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Check, ChevronLeft } from "lucide-react";
import { PhoneScreen, BigButton, Label, Notice, SectionTitle } from "@/components/phone";
import { useAuth, setAuth, ORGS, RANKS, signupError, passwordOk } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "가입 신청 · 세이브타임" },
      { name: "description", content: "소속 소방서 코드 · 이름 · 계급 · 사번과 공무원증 사진으로 가입을 신청해요." },
      { property: "og:title", content: "가입 신청 · 세이브타임" },
      { property: "og:description", content: "119 구급대원만 쓸 수 있게 공무원증으로 가입" },
    ],
  }),
  component: Signup,
});

/** SFR-017: 소속기관 코드 · 이름 · 계급 · 소속 안전센터 · 사번 · 공무원증 사진 + 사진 동의 → 관리자 승인 */
function Signup() {
  const a = useAuth();
  const [f, setF] = useState({ orgCode: "", name: "", rank: "소방교", center: "", employeeNo: "", loginId: "", pw: "", pw2: "" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const code = f.orgCode.trim().toUpperCase();
  const org = ORGS[code];

  const submit = () => {
    const e = signupError({ ...f, photo, agree }, a.accounts);
    if (e) return setErr(e);
    if (f.pw !== f.pw2) return setErr("비밀번호 확인이 달라요");
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    setAuth({
      accounts: {
        ...a.accounts,
        [f.loginId]: {
          loginId: f.loginId, password: f.pw, name: f.name.trim(), rank: f.rank, orgCode: code, orgName: org ?? "", center: f.center.trim(),
          employeeNo: f.employeeNo.trim(), status: "pending",
          appliedAt: `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`,
        },
      },
      session: f.loginId,
    });
  };

  return (
    <PhoneScreen title="가입 신청" subtitle="관리자가 공무원증을 확인하고 승인해요" footer={<BigButton onClick={submit}>가입 신청</BigButton>}>
      <Link to="/login" className="-mt-1 mb-3 inline-flex items-center text-sm text-muted-foreground"><ChevronLeft className="size-4" /> 로그인으로</Link>

      <SectionTitle hint="소방서 단위 코드예요. 모르면 소속 관리자에게 물어보세요">① 소속 소방서</SectionTitle>
      <input className="field uppercase" value={f.orgCode} onChange={(e) => set("orgCode", e.target.value)} placeholder="CN-SB-019" />
      {f.orgCode && <p className={cn("mt-1.5 text-sm font-semibold", org ? "text-success" : "text-destructive")}>{org ? `✓ ${org}` : "등록되지 않은 코드예요"}</p>}
      <div className="mt-3"><Label>소속 안전센터</Label><input className="field" value={f.center} onChange={(e) => set("center", e.target.value)} placeholder="서북119안전센터" /></div>

      <SectionTitle>② 내 정보</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>이름</Label><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="김도윤" /></div>
        <div><Label>계급</Label><select className="field" value={f.rank} onChange={(e) => set("rank", e.target.value)}>{RANKS.map((r) => <option key={r}>{r}</option>)}</select></div>
      </div>
      <div className="mt-3"><Label>사번</Label><input className="field" value={f.employeeNo} onChange={(e) => set("employeeNo", e.target.value)} placeholder="2019-1234" /></div>

      <SectionTitle>③ 로그인 정보</SectionTitle>
      <div><Label>아이디 (영문 소문자 · 숫자 4~20자)</Label><input className="field" value={f.loginId} onChange={(e) => set("loginId", e.target.value.toLowerCase())} placeholder="kimdoyun" autoCapitalize="none" /></div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div><Label>비밀번호</Label><input className="field" type="password" value={f.pw} onChange={(e) => set("pw", e.target.value)} /></div>
        <div><Label>비밀번호 확인</Label><input className="field" type="password" value={f.pw2} onChange={(e) => set("pw2", e.target.value)} /></div>
      </div>
      <p className={cn("mt-1.5 text-xs", f.pw && passwordOk(f.pw) ? "text-success" : "text-muted-foreground")}>8자 이상, 영문과 숫자를 섞어 주세요</p>

      <SectionTitle hint="관리자만 볼 수 있고, 확인이 끝나면 삭제돼요">④ 공무원증 사진</SectionTitle>
      <label className="tile flex cursor-pointer items-center justify-center gap-2 border-dashed p-5 text-sm font-semibold">
        {photo ? <><Check className="size-4 text-success" /> {photo}</> : <><Camera className="size-5 text-accent" /> 촬영하기 · 앨범에서 선택</>}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)} />
      </label>
      <p className="mt-1.5 text-xs text-muted-foreground">카메라 권한은 이때 물어요</p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
        공무원증 사진 수집 · 이용에 동의합니다 (필수)
      </label>
      {err && <div className="mt-3"><Notice tone="warn">{err}</Notice></div>}
    </PhoneScreen>
  );
}
