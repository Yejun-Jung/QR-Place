import { describe, expect, it } from "vitest";
import { subjectJosa } from "../josa";

describe("subjectJosa", () => {
  it("받침이 있으면 이, 없으면 가", () => {
    expect(subjectJosa("통닭")).toBe("이");
    expect(subjectJosa("소주")).toBe("가");
  });

  it("끝의 괄호 설명은 무시한다", () => {
    expect(subjectJosa("양념치킨(조각)")).toBe("이");
    expect(subjectJosa("콜라·사이다 (500ml)")).toBe("가");
    expect(subjectJosa("생맥주 (500cc)")).toBe("가");
  });

  it("한글로 끝나지 않으면 이(가)", () => {
    expect(subjectJosa("Coke")).toBe("이(가)");
  });
});
