// ESLint flat config.
//
// eslint-config-next(레거시 .eslintrc 형식)는 내부 패치가 ESLint 9와 충돌해서
// 로드되지 않는다. 그래서 필요한 플러그인 3개를 직접 붙였다 — 사실상 같은 규칙셋:
//   - @next/next        : Next.js 전용 규칙 (img 태그, sync script 등)
//   - typescript-eslint : 타입스크립트 규칙 (미사용 변수 등)
//   - react-hooks       : 훅 규칙 (의존성 배열 누락 = 이 프로젝트에서 실제로 났던 버그)
import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs}"],
    plugins: { "@next/next": next, "react-hooks": reactHooks },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // _로 시작하는 인자는 "안 쓰는 걸 알고 둔 것"으로 본다 (라우트 핸들러의 _req 등)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // 스크립트는 Node 환경 — console/process 전역을 알려준다
    files: ["scripts/**", "*.config.{mjs,ts}"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
    },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
