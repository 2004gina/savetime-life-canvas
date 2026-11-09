import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { PhoneScreen, BigButton } from "@/components/phone";
import { useAuth, setAuth, APP_VERSION } from "@/lib/auth-store";

export const Route = createFileRoute("/update")({
  head: () => ({
    meta: [
      { title: "업데이트가 필요해요 · 세이브타임" },
      { name: "description", content: "지금 버전으로는 쓸 수 없어요. 앱을 업데이트해 주세요." },
      { property: "og:title", content: "업데이트가 필요해요 · 세이브타임" },
      { property: "og:description", content: "최소 지원 버전보다 낮은 앱은 기능을 막아요" },
    ],
  }),
  component: Update,
});

/** SFR-142: 서버가 정한 최소 버전보다 낮으면 기능을 막고 업데이트 안내만 */
function Update() {
  const a = useAuth();
  return (
    <PhoneScreen title="업데이트가 필요해요" subtitle="지금 버전으로는 쓸 수 없어요" footer={<BigButton><Download className="size-5" /> 스토어에서 업데이트</BigButton>}>
      <div className="tile divide-y text-sm">
        <div className="flex justify-between px-4 py-3"><span className="text-muted-foreground">설치된 버전</span><b>{APP_VERSION}</b></div>
        <div className="flex justify-between px-4 py-3"><span className="text-muted-foreground">최소 지원 버전</span><b>{a.serverMinVersion}</b></div>
      </div>
      <button className="mt-6 w-full text-center text-xs text-muted-foreground underline" onClick={() => setAuth({ serverMinVersion: "1.0.0" })}>
        시연: 최소 버전 되돌리기
      </button>
    </PhoneScreen>
  );
}
