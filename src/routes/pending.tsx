import { createFileRoute } from "@tanstack/react-router";
import { Hourglass, XCircle, BellRing } from "lucide-react";
import { toast } from "sonner";
import { PhoneScreen, BigButton, Pill, IconTile, KeyVal, Notice } from "@/components/phone";
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
      footer={rejected ? <BigButton size="lg" onClick={reapply}>다시 가입 신청</BigButton> : <BigButton variant="outline" onClick={logout}>로그아웃</BigButton>}
    >
      <div className="flex flex-col items-center py-8 text-center">
        {rejected ? (
          <IconTile tone="warn" className="size-16 rounded-full bg-destructive/10"><XCircle className="size-7 text-destructive" /></IconTile>
        ) : (
          <IconTile tone="warn" className="size-16 rounded-full"><Hourglass className="size-7 text-warning" /></IconTile>
        )}
        <p className="mt-5 text-lg font-extrabold">{rejected ? acc.rejectReason : "관리자가 공무원증을 확인하고 있어요"}</p>
        {!rejected && <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"><BellRing className="size-3.5" /> 승인되면 알림으로 알려드려요</p>}
      </div>

      {rejected && <div className="mb-4"><Notice tone="warn">반려 사유: {acc.rejectReason}</Notice></div>}

      <dl className="tile divide-y divide-border text-sm">
        <KeyVal label="신청 일시" value={acc.appliedAt} />
        <KeyVal label="이름" value={`${acc.name} ${acc.rank}`} />
        <KeyVal label="소속" value={`${acc.orgName} · ${acc.center}`} />
        <KeyVal label="사번" value={acc.employeeNo} />
        <div className="flex items-center justify-between px-4 py-3.5">
          <dt className="text-sm text-muted-foreground">상태</dt>
          <dd>{rejected ? <Pill tone="danger">반려</Pill> : <Pill tone="wait">확인 중</Pill>}</dd>
        </div>
      </dl>

      {!rejected && (
        <div className="mt-7 flex justify-center gap-3 text-xs">
          <button className="rounded-lg bg-surface px-3 py-2 font-semibold text-muted-foreground transition hover:bg-surface-2" onClick={() => { update({ status: "approved" }); toast.success("가입이 승인됐어요. 근무를 시작할 수 있어요"); }}>시연: 관리자가 승인함</button>
          <button className="rounded-lg bg-surface px-3 py-2 font-semibold text-muted-foreground transition hover:bg-surface-2" onClick={() => { update({ status: "rejected", rejectReason: "공무원증 사진이 흐려서 확인할 수 없어요" }); toast.error("가입이 반려됐어요"); }}>시연: 반려함</button>
        </div>
      )}
    </PhoneScreen>
  );
}
