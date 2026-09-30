import type { DiagnosisType, Tier } from "@/lib/types";
import type { RequirementCheck } from "@/lib/engine";

export const TIER_LABEL: Record<Tier, { title: string; short: string; desc: string }> = {
  target: { title: "★ 목표 공고", short: "목표", desc: "최종 목표. 지금과의 격차를 함께 보여 드려요" },
  stepping: { title: "② 경력 발판", short: "경력 발판", desc: "1~2년 뒤 목표 직종의 관련 경력으로 인정받을 가능성이 높은 곳" },
  growing: { title: "③ 역량 키우기", short: "역량 키우기", desc: "일하면서 목표 직무 역량을 기를 수 있는 곳" },
  immediate: { title: "① 즉시 적합", short: "즉시 적합", desc: "지금 역량으로 합격 가능성이 가장 높은 곳" },
};

export const TIER_ORDER: Tier[] = ["target", "stepping", "growing", "immediate"];

export const DIAGNOSIS_LABEL: Record<DiagnosisType, { title: string; tone: "orange" | "teal" | "blue" | "gray"; desc: string }> = {
  자격격차형: { title: "자격 격차형", tone: "orange", desc: "지원한 공고의 필수 요건(경력·자격)이 장벽이에요. 목표로 이어지는 단계별 공고를 추천해요." },
  서류표현형: { title: "서류 표현형", tone: "teal", desc: "요건은 충분한데 서류에서 아쉬웠어요. 눈을 돌리지 않고 서류 표현을 다듬는 방향을 추천해요." },
  조직적합형: { title: "조직 적합형", tone: "teal", desc: "서류는 통과하는데 면접이 아쉬웠어요. 성향이 잘 맞는 회사와 면접 보완 방향을 추천해요." },
  혼합형: { title: "혼합형", tone: "blue", desc: "여러 원인이 섞여 있어요. 단계별 공고와 방향 전환을 함께 추천해요." },
  판단보류: { title: "판단 보류", tone: "gray", desc: "지원 기록이 3건 이상이면 탈락 원인을 더 정확히 진단할 수 있어요." },
};

export const BARRIER_LABEL: Record<RequirementCheck["key"], string> = {
  career: "관련 경력",
  certificate: "자격증",
  major: "전공",
  education: "학력",
};
