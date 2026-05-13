import { afterEach, describe, expect, it } from "vitest";
import { getCsrfToken } from "./csrf";

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  setCookie("");
});

describe("getCsrfToken", () => {
  it("returns null when no cookies are set", () => {
    setCookie("");
    expect(getCsrfToken()).toBeNull();
  });

  it("returns null when csrftoken cookie is absent", () => {
    setCookie("sessionid=abc; other=value");
    expect(getCsrfToken()).toBeNull();
  });

  it("returns the csrftoken value when set", () => {
    setCookie("csrftoken=abc123; sessionid=xyz");
    expect(getCsrfToken()).toBe("abc123");
  });

  it("URL-decodes the cookie value", () => {
    setCookie("csrftoken=a%2Bb%3Dc");
    expect(getCsrfToken()).toBe("a+b=c");
  });

  it("handles the csrftoken being the only cookie", () => {
    setCookie("csrftoken=onlyone");
    expect(getCsrfToken()).toBe("onlyone");
  });

  it("handles surrounding whitespace between cookies", () => {
    setCookie("sessionid=abc;   csrftoken=tok42  ");
    expect(getCsrfToken()).toBe("tok42");
  });
});
