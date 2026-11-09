import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Ambulance, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth, getAuth, setAuth, demoInvite, expiredInvites, type Incoming } from "@/lib/auth-store";

let demoFired = false;

/**
 * SFR-159 · SFR-130: 팀 초대가 오면 폰 위 '팀 초대' 알림 배너(진동)로 알리고,
 * 탭하면 /invite 화면으로 들어간다. 초대는 5분 뒤 만료 처리.
 */
export function InvitePush() {
  const a = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [banner, setBanner] = useState<Incoming | null>(null);
  const seen = useRef<Set<string>>(new Set());

  // 시연: 로그인·승인까지 끝났고 아직 근무 전이면 4초 뒤 이보준 대원이 나를 초대
  // (타이머를 정리하지 않음: 개발 모드의 이중 실행에서도 초대 한 번은 반드시 오게)
  useEffect(() => {
    if (demoFired || a.duty || a.incoming.length || !a.session) return;
    const acc = a.accounts[a.session];
    if (!acc || acc.status !== "approved") return;
    demoFired = true;
    setTimeout(() => setAuth(demoInvite(getAuth())), 4000);
  }, [a.session, a.duty, a.incoming.length, a.accounts]);


  // 새 초대 도착 → 배너 + 진동, 6초 뒤 자동 숨김
  useEffect(() => {
    const fresh = a.incoming.find((i) => !seen.current.has(i.id));
    if (!fresh) return;
    seen.current.add(fresh.id);
    setBanner(fresh);
    try {
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      /* 폰이 아니면 진동 없음 */
    }
    const t = setTimeout(() => setBanner((b) => (b && b.id === fresh.id ? null : b)), 6000);
    return () => clearTimeout(t);
  }, [a.incoming]);

  // 만료 정리: 5분 지난 초대는 지우고 안내
  useEffect(() => {
    const t = setInterval(() => {
      const patch = expiredInvites(getAuth());
      if (patch) {
        setAuth(patch);
        toast("초대가 만료됐어요");
      }
    }, 2000);
    return () => clearInterval(t);
  }, []);

  if (!banner) return null;

  return (
    <div className="push-in fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <div className="flex w-full max-w-[420px] items-start gap-3 rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Ambulance className="size-5" /></span>
        <button
          className="flex-1 text-left"
          onClick={() => {
            setBanner(null);
            nav({ to: "/invite" });
          }}
        >
          <p className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold text-foreground">세이브타임</span>
            <span>지금</span>
          </p>
          <p className="mt-0.5 text-sm font-bold">{banner.from.name} 대원이 팀 {banner.teamCode}에 초대했어요</p>
          <p className="text-xs text-muted-foreground">5분 안에 수락해야 팀에 들어갈 수 있어요 · 탭하면 확인</p>
        </button>
        <button aria-label="알림 닫기" className="shrink-0 rounded-lg p-1 text-muted-foreground" onClick={() => setBanner(null)}>
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
