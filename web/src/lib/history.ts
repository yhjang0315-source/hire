// 재진단 기록(브라우저 저장소). 서버 저장소가 없는 MVP용이며, 저장이 막힌 환경에서도 화면은 동작한다.
export interface Snapshot {
  at: string; // ISO 시각
  s: string; // 인코딩된 입력 상태
  alias: string;
  diagnosis: string;
  best?: string; // "회사 · 공고명"
  applications: number;
}

const KEY = "career-ladder:history";
const MAX = 20;
const listeners = new Set<() => void>();

/** useSyncExternalStore용 구독: 이 탭의 저장·삭제와 다른 탭의 변경을 모두 알린다 */
export function subscribeHistory(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 원본 문자열(값 비교가 되도록 문자열 그대로 돌려준다) */
export function historyRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseHistory(raw: string): Snapshot[] {
  try {
    return JSON.parse(raw) as Snapshot[];
  } catch {
    return [];
  }
}

const emit = () => listeners.forEach((l) => l());

export function loadHistory(): Snapshot[] {
  return parseHistory(historyRaw());
}

/** 같은 입력이면 시각만 갱신, 다르면 맨 앞에 추가 */
export function saveSnapshot(snap: Snapshot): void {
  try {
    const list = loadHistory().filter((x) => x.s !== snap.s);
    window.localStorage.setItem(KEY, JSON.stringify([snap, ...list].slice(0, MAX)));
    emit();
  } catch {
    // 저장소를 쓸 수 없으면 기록만 건너뛴다
  }
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(KEY);
    emit();
  } catch {
    // 무시
  }
}
