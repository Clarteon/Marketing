import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Analytics } from "@/components/ui/Analytics";

vi.mock("next/script", () => ({
  default: (props: Record<string, string>) => <script {...props} />,
}));

describe("Analytics", () => {
  it("renders nothing without a token, so previews and development send no analytics", () => {
    const { container } = render(<Analytics token={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("loads the Cloudflare beacon with the site token", () => {
    const { container } = render(<Analytics token="abc123" />);
    const script = container.querySelector("script");

    expect(script?.getAttribute("src")).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    expect(script?.getAttribute("type")).toBe("module");
    expect(JSON.parse(script?.getAttribute("data-cf-beacon") ?? "{}")).toEqual({ token: "abc123" });
  });
});
