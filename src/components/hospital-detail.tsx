import { X, Phone, BedDouble, Stethoscope, ShieldAlert } from "lucide-react";
import { BigButton } from "@/components/phone";
import { bedAvail, capCount, type Hospital } from "@/lib/hospitals";
import { cn } from "@/lib/utils";

/**
 * S-07 병원 상세 (SFR-007): 진료과 · 연락처(직통/대표) · 병상 현황(응급실/중환자실/수술실) ·
 * 중증질환 진료가능 항목(공공 데이터 표기 그대로)을 한 화면에 보여 준다.
 */
export function HospitalDetail({
  h,
  approved,
  note,
  onClose,
  onConfirm,
  onPhone,
}: {
  h: Hospital;
  /** 승인 칸의 병원인가 (확정 버튼 표시) */
  approved?: boolean;
  /** 병원 메모 · 승인 취소 사유 등 */
  note?: string | undefined;
  onClose: () => void;
  /** '이 병원으로 확정' (SFR-111 확인은 부르는 쪽에서) */
  onConfirm?: () => void;
  /** 전화 확인 (SFR-032) */
  onPhone?: () => void;
}) {
  const cc = capCount(h);
  const beds = [
    { k: "응급실", v: h.er },
    { k: "중환자실", v: h.icu },
    { k: "수술실", v: h.or },
  ];
  const noBed = !h.er && !h.icu && !h.or;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/50" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-t-2xl bg-card p-5 pb-8 shadow-2xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">{h.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {h.grade} · {h.km}km · 약 {h.min}분
            </p>
          </div>
          <button aria-label="닫기" onClick={onClose} className="rounded-full bg-muted p-2">
            <X className="size-5" />
          </button>
        </div>
        {note && <p className="mt-2 rounded-lg bg-info-soft px-3 py-2 text-sm font-semibold">{note}</p>}

        {/* 병상 3종 분리 표시 (SFR-007) */}
        <div className="mt-4 rounded-xl border p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BedDouble className="size-4" /> 병상 현황
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {beds.map((b) => {
              const a = bedAvail(b.v);
              return (
                <div key={b.k} className="rounded-lg bg-muted/60 px-2 py-2.5 text-center">
                  <p className="text-xs text-muted-foreground">{b.k}</p>
                  <p className={cn("mt-0.5 text-lg font-bold tabular-nums", a === 0 && "text-destructive")}>
                    {a === null ? "정보 없음" : b.v}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {noBed ? "이 병원은 병상 정보가 없어요 · 전화로 확인하세요" : `참고용 정보 · 병상 기준 ${h.bedsAt}`}
          </p>
        </div>

        {/* 중증질환 진료가능 항목 (SFR-007·011) */}
        <div className="mt-3 rounded-xl border p-4">
          <p className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><Stethoscope className="size-4" /> 중증질환 진료가능 항목</span>
            <span className="text-sm font-bold text-foreground">{cc.available}/{cc.total}</span>
          </p>
          {h.caps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">공공 데이터에 없는 병원이에요 · 전화로 확인해야 알 수 있어요</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {h.caps.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className={cn(c.available ? "font-semibold" : "text-muted-foreground line-through")}>{c.name}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", c.available ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                    {c.available ? "가능" : "불가"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 진료과 */}
        <div className="mt-3 rounded-xl border p-4">
          <p className="text-xs font-semibold text-muted-foreground">진료과</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {h.depts.map((d) => (
              <span key={d} className="rounded-full bg-muted px-3 py-1 text-sm">{d}</span>
            ))}
          </div>
        </div>

        {/* 연락처 · 전화하기 */}
        <div className="mt-3 rounded-xl border p-4">
          <p className="text-xs font-semibold text-muted-foreground">연락처</p>
          <a href={`tel:${h.erPhone}`} className="mt-2 flex h-13 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-base font-bold text-accent-foreground">
            <Phone className="size-5" /> 응급실 직통 {h.erPhone}
          </a>
          <a href={`tel:${h.mainPhone}`} className="mt-2 flex h-13 w-full items-center justify-center gap-1.5 rounded-lg border bg-card px-4 text-base font-bold">
            <Phone className="size-5" /> 대표 {h.mainPhone}
          </a>
        </div>

        <div className="mt-4 space-y-2">
          {approved && onConfirm && <BigButton variant="success" className="h-14 text-lg" onClick={onConfirm}>이 병원으로 확정</BigButton>}
          {onPhone && <BigButton variant={approved ? "outline" : "accent"} className="h-14 text-lg" onClick={onPhone}>전화 확인</BigButton>}
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          병상 · 진료가능 항목은 공공 응급의료 데이터 기준으로, 실제와 다를 수 있어요.
        </p>
      </div>
    </div>
  );
}
