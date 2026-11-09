import { createFileRoute } from "@tanstack/react-router";
import { MapPin, MapPinOff } from "lucide-react";
import { PhoneScreen, BigButton } from "@/components/phone";
import { useAuth, setAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "세이브타임 시작하기 · 위치정보 안내" },
      { name: "description", content: "위치를 왜 쓰는지, 무엇을 얼마나 보관하는지 먼저 알려드려요." },
      { property: "og:title", content: "세이브타임 시작하기" },
      { property: "og:description", content: "위치정보 수집 · 이용 안내와 필수 동의" },
    ],
  }),
  component: Welcome,
});

/** SFR-041 고지 항목 */
const ITEMS: [string, string][] = [
  ["수집 목적", "이송 요청 · 도착 예상 시간 계산, 구급활동일지 이동 거리 기록, 구급차 경로 안내 개선을 위한 익명 경로 축적"],
  ["보관 항목", "이송 중 구급차 위치 기록 (좌표 · 시각)"],
  ["보관 기간", "도착 · 취소하면 바로 대원 계정 · 팀 · 이송 건과의 연결을 끊고 '익명 이송 경로'로 바꿔 3년 보관해요. 이송 기록에는 이동 거리만 남아요"],
  ["병원 제공", "환자 평가 정보와, 위치로 계산한 도착 예상 시간을 요청 대상 병원에 보내요"],
  ["길찾기 서비스", "경로 안내 · 이동 시간 계산을 위해 위치가 카카오모빌리티에 전달돼요"],
];

function Welcome() {
  const a = useAuth();

  if (a.consent === "refused") {
    return (
      <PhoneScreen title="세이브타임" footer={<BigButton onClick={() => setAuth({ consent: "unknown" })}>다시 동의하기</BigButton>}>
        <div className="flex flex-col items-center py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-warning-soft"><MapPinOff className="size-7 text-warning" /></span>
          <p className="mt-5 text-lg font-bold">위치 동의가 있어야 사용할 수 있어요</p>
        </div>
      </PhoneScreen>
    );
  }

  return (
    <PhoneScreen
      title="세이브타임 시작하기"
      subtitle="위치정보 수집 · 이용 안내 (필수)"
      footer={
        <div className="space-y-2">
          <BigButton onClick={() => setAuth({ consent: "agreed" })}>동의하고 계속</BigButton>
          <BigButton variant="outline" onClick={() => setAuth({ consent: "refused" })}>동의 안 함</BigButton>
        </div>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft"><MapPin className="size-6 text-accent" /></span>
        <p className="text-sm text-muted-foreground">병상 숫자가 아니라, 병원의 대답을 봅니다.<br />119 구급대원 전용 이송 요청 앱이에요.</p>
      </div>
      <div className="tile divide-y">
        {ITEMS.map(([k, v]) => (
          <div key={k} className="p-4">
            <p className="text-sm font-bold">{k}</p>
            <p className="mt-1 text-sm text-muted-foreground">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-muted p-4 text-sm">
        <p className="font-bold">왜 필수인가요?</p>
        <p className="mt-1 text-muted-foreground">위치가 있어야 반경 안 병원에 요청을 보내고 도착 예상 시간을 계산할 수 있어요. 그래서 동의해야 앱을 쓸 수 있어요.</p>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">본 서비스는 참고용이며 의료 판단과 병원 수용을 보장하지 않습니다.</p>
    </PhoneScreen>
  );
}
