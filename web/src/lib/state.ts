// 화면 사이에 넘기는 입력 상태(프로필 + 지원 이력)를 URL 한 조각으로 인코딩한다.
// 서버 저장 없이 새로고침·공유가 가능하고, 서버와 브라우저 모두에서 동작한다.
import type { Application, Profile } from "@/lib/types";

export interface InputState {
  profile: Profile;
  applications: Application[];
}

export function encodeState(state: InputState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeState(s: string): InputState | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as InputState;
    return parsed?.profile && Array.isArray(parsed.applications) ? parsed : null;
  } catch {
    return null;
  }
}
