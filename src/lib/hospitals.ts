/** 시연용 병원 목록 (서버 연결 전 가짜 데이터) */
export type Bed = [number, number]; // [가용, 전체]
export type Cap = { name: string; available: boolean };

export type Hospital = {
  id: string;
  name: string;
  km: number;
  min: number;
  /** 응급실 병상 "가용/전체" (SFR-007). 값이 없으면 '정보 없음' (SFR-089) */
  er?: string;
  /** 중환자실 병상 */
  icu?: string;
  /** 수술실 병상 */
  or?: string;
  /** 진료과 (SFR-007) */
  depts: string[];
  /** 중증질환 진료가능 항목 — 공공 응급의료 데이터 표기 그대로 (SFR-007·011) */
  caps: Cap[];
  /** 응급실 직통 (SFR-007 연락처) */
  erPhone: string;
  /** 대표 전화 */
  mainPhone: string;
  /** 병상 데이터 기준 시각 (SFR-081) */
  bedsAt: string;
  grade: "대학병원급" | "종합병원급" | "일반 병원";
  phone: string;
  /** 시연: 병원 웹이 요청을 받은 뒤 몇 초 뒤 무엇을 하는지 */
  script?: { after: number; action: "approve" | "reject" | "no_ack"; note?: string; reason?: string };
};

export const HOSPITALS: Hospital[] = [
  {
    id: "a", name: "A병원", km: 2.1, min: 7, er: "3/12", icu: "2/10", or: "1/6",
    depts: ["응급의학과", "심장내과", "신경외과", "신경과", "흉부외과"],
    caps: [
      { name: "[재관류중재술] 심근경색", available: true },
      { name: "[재관류중재술] 뇌경색", available: true },
      { name: "[뇌출혈수술] 거미막하출혈", available: true },
      { name: "[응급투석] HD", available: true },
      { name: "[중증화상] 전문치료", available: false },
    ],
    erPhone: "041-000-0001", mainPhone: "041-000-9001", bedsAt: "14:02",
    grade: "대학병원급", phone: "041-000-0001",
  },
  {
    id: "b", name: "B대학교병원", km: 3.4, min: 9, er: "5/20", icu: "4/24", or: "2/12",
    depts: ["응급의학과", "심장내과", "신경외과", "소아청소년과", "산부인과", "화상외과"],
    caps: [
      { name: "[재관류중재술] 심근경색", available: true },
      { name: "[재관류중재술] 뇌경색", available: true },
      { name: "[뇌출혈수술] 거미막하출혈", available: true },
      { name: "[산부인과응급] 분만", available: true },
      { name: "[응급내시경] 성인 위장관", available: true },
      { name: "[응급투석] CRRT", available: false },
    ],
    erPhone: "041-000-0002", mainPhone: "041-000-9002", bedsAt: "14:02",
    grade: "대학병원급", phone: "041-000-0002",
    script: { after: 12, action: "approve", note: "3번 출입구로 오세요" },
  },
  {
    id: "c", name: "C병원", km: 4.0, min: 10, er: "0/10", icu: "0/8", or: "0/4",
    depts: ["응급의학과", "신경외과", "신장내과"],
    caps: [
      { name: "[재관류중재술] 심근경색", available: true },
      { name: "[뇌출혈수술] 거미막하출혈", available: false },
      { name: "[응급투석] HD", available: false },
      { name: "[응급투석] CRRT", available: false },
    ],
    erPhone: "041-000-0003", mainPhone: "041-000-9003", bedsAt: "14:01",
    grade: "대학병원급", phone: "041-000-0003",
    script: { after: 6, action: "reject", reason: "병상 부족" },
  },
  {
    id: "d", name: "D병원", km: 5.2, min: 11, er: "2/8", icu: "1/6", or: "0/3",
    depts: ["응급의학과", "소화기내과", "심장내과"],
    caps: [
      { name: "[재관류중재술] 심근경색", available: true },
      { name: "[재관류중재술] 뇌경색", available: false },
      { name: "[응급내시경] 성인 위장관", available: true },
      { name: "[응급투석] HD", available: true },
      { name: "[응급투석] CRRT", available: false },
    ],
    erPhone: "041-000-0004", mainPhone: "041-000-9004", bedsAt: "14:00",
    grade: "종합병원급", phone: "041-000-0004",
    script: { after: 20, action: "reject", reason: "전문의 부재" },
  },
  {
    id: "e", name: "E병원", km: 6.8, min: 15, er: "4/10", icu: "2/8", or: "1/5",
    depts: ["응급의학과", "신경과", "신장내과"],
    caps: [
      { name: "[재관류중재술] 뇌경색", available: true },
      { name: "[재관류중재술] 심근경색", available: false },
      { name: "[응급투석] HD", available: true },
      { name: "[응급투석] CRRT", available: true },
      { name: "[산부인과응급] 분만", available: false },
    ],
    erPhone: "041-000-0005", mainPhone: "041-000-9005", bedsAt: "13:58",
    grade: "종합병원급", phone: "041-000-0005",
    script: { after: 5, action: "no_ack" },
  },
  {
    id: "f", name: "F병원", km: 7.5, min: 14, er: "6/15", icu: "3/14", or: "2/8",
    depts: ["응급의학과", "외과", "정형외과", "신경외과", "산부인과"],
    caps: [
      { name: "[뇌출혈수술] 거미막하출혈", available: true },
      { name: "[뇌출혈수술] 거미막하출혈 외", available: true },
      { name: "[재관류중재술] 심근경색", available: true },
      { name: "[산부인과응급] 분만", available: true },
      { name: "[중증화상] 전문치료", available: false },
    ],
    erPhone: "041-000-0006", mainPhone: "041-000-9006", bedsAt: "14:02",
    grade: "대학병원급", phone: "041-000-0006",
    script: { after: 24, action: "approve" },
  },
  {
    id: "g", name: "G병원", km: 8.0, min: 17,
    depts: ["응급의학과", "내과", "외과"],
    caps: [],
    erPhone: "041-000-0007", mainPhone: "041-000-9007", bedsAt: "",
    grade: "일반 병원", phone: "041-000-0007",
  },
  {
    id: "h", name: "H대학교병원", km: 24.5, min: 26, er: "7/18", icu: "5/20", or: "3/10",
    depts: ["응급의학과", "외상외과", "신경외과", "흉부외과", "화상외과"],
    caps: [
      { name: "[재관류중재술] 심근경색", available: true },
      { name: "[재관류중재술] 뇌경색", available: true },
      { name: "[뇌출혈수술] 거미막하출혈", available: true },
      { name: "[중증화상] 전문치료", available: true },
      { name: "[응급투석] CRRT", available: true },
      { name: "[산부인과응급] 분만", available: false },
    ],
    erPhone: "041-000-0008", mainPhone: "041-000-9008", bedsAt: "14:02",
    grade: "대학병원급", phone: "041-000-0008",
    script: { after: 10, action: "approve", note: "외상센터 입구" },
  },
  {
    id: "i", name: "I병원", km: 33.0, min: 34, er: "3/9", icu: "1/7", or: "0/4",
    depts: ["응급의학과", "심장내과", "소화기내과"],
    caps: [
      { name: "[재관류중재술] 심근경색", available: true },
      { name: "[재관류중재술] 뇌경색", available: true },
      { name: "[응급내시경] 성인 위장관", available: true },
      { name: "[응급투석] HD", available: false },
    ],
    erPhone: "041-000-0009", mainPhone: "041-000-9009", bedsAt: "13:55",
    grade: "종합병원급", phone: "041-000-0009",
    script: { after: 8, action: "approve" },
  },
];

const rank = { 대학병원급: 3, 종합병원급: 2, "일반 병원": 1 } as const;

export function isTarget(h: Hospital, grade: keyof typeof rank | null) {
  if (!h.er) return false; // 병상 정보 없는 곳은 요청하지 않고 전화 확인만
  if (!grade) return true;
  return rank[h.grade] >= rank[grade];
}

/** "3/12" → 3 (가용 병상 수). 병상 정보가 없으면 null (SFR-089) */
export function bedAvail(bed?: string): number | null {
  if (!bed) return null;
  const n = Number(bed.split("/")[0]);
  return Number.isFinite(n) ? n : null;
}

/** 중증질환 진료가능 항목 수 (SFR-002) */
export function capCount(h: Hospital) {
  return { available: h.caps.filter((c) => c.available).length, total: h.caps.length };
}

export const RESPONSE_LIMIT_SEC = 120;
export const APPROVAL_WINDOW_SEC = 300;
export const RADIUS_STEPS = [10, 20, 30, 40];
export const START_RADIUS = 20;
