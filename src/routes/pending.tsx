import { createFileRoute } from "@tanstack/react-router";
import { Hourglass, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PhoneScreen, BigButton, Pill } from "@/components/phone";
import { useAuth, setAuth, logout, currentAccount, type Account } from "@/lib/auth-store";

export const Route = createFileRoute("/pending")({
  head: () => ({
    meta: [
      { title: "승인 대기 중 · 세이브타임" },
      { name: "description", content: "관리자가 공무원증을 확인하고 있어요. 승인되면 알림으로 알려드려요." },
      { property: "og:title", content: "승인 대기 중 · 세이브타임" },
      { property: "og:description", content: "승인 전에는 다른 기능을 쓸 수 없어요" },
    ],
  }),
  component: Pending,
});

/** SFR-022: 승인 전에는 '승인 대기 중' 화면만. 승인 · 반려 결과는 알림 */
function Pending() {
  const a = useAuth();
  const acc = currentAccount(a);
  if (!acc) return null;
  const update = (patch: Partial<Account>) => setAuth({ accounts: { ...a.accounts, [acc.loginId]: { ...acc, ...patch } } });
  const rejected = acc.status === "rejected";

  const reapply = () => {
    const accounts = { ...a.accounts };
    delete accounts[acc.loginId];
    setAuth({ accounts, session: null });
  };

  return (
    <PhoneScreen
      title={rejected ? "가입이 반려됐어요" : "승인 대기 중"}
      subtitle={rejected ? "내용을 고쳐 다시 신청해 주세요" : "승인 전에는 다른 기능을 쓸 수 없어요"}
      footer={rejected ? <BigButton onClick={reapply}>다시 가입 신청</BigButton> : <BigButton variant="outline" onClick={logout}>로그아웃</BigButton>}
    >
      <div className="flex flex-col items-center py-6 text-center">
        {rejected ? (
          <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10"><XCircle className="size-7 text-destructive" /></span>
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-warning-soft"><Hourglass className="size-7 text-warning" /></span>
        )}
        <p className="mt-4 text-lg font-bold">{rejected ? acc.rejectReason : "관리자가 공무원증을 확인하고 있어요"}</p>
        {!rejected && <p className="mt-1 text-sm text-muted-foreground">승인되면 알림으로 알려드려요</p>}
      </div>
      <dl className="tile divide-y text-sm">
        {[
          ["신청 일시", acc.appliedAt],
          ["이름", `${acc.name} ${acc.rank}`],
          ["소속", `${acc.orgName} · ${acc.center}`],
          ["사번", acc.employeeNo],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
        ))}
        <div className="flex items-center justify-between px-4 py-3"><dt className="text-muted-foreground">상태</dt>{rejected ? <Pill tone="danger">반려</Pill> : <Pill tone="wait">확인 중</Pill>}</div>
      </dl>
      {!rejected && (
        <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
          <button className="underline" onClick={() => { update({ status: "approved" }); toast.success("가입이 승인됐어요. 근무를 시작할 수 있어요"); }}>시연: 관리자가 승인함</button>
          <button className="underline" onClick={() => { update({ status: "rejected", rejectReason: "공무원증 사진이 흐려서 확인할 수 없어요" }); toast.error("가입이 반려됐어요"); }}>시연: 반려함</button>
        </div>
      )}
    </PhoneScreen>
  );
}
