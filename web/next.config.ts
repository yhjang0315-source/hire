import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 수집 캐시(DATA_SOURCE=cache)는 실행 중 파일로 읽으므로 배포 번들에 포함한다
  outputFileTracingIncludes: {
    "/**": ["src/data/cache/*.json"],
  },
};

export default nextConfig;
