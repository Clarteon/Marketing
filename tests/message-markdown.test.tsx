import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";

const attempted = vi.hoisted(() => vi.fn());
vi.mock("react-markdown", () => {
  attempted();
  throw new Error("simulated_chunk_load_failure");
});

it("keeps the reply readable and inert if its optional formatting chunk fails", async () => {
  const content = "<img src=x onerror=alert(1)> [Unsafe](javascript:alert(1))";
  const { container } = render(<MessageMarkdown>{content}</MessageMarkdown>);
  await waitFor(() => expect(attempted).toHaveBeenCalled());
  expect(screen.getByText(content)).toBeInTheDocument();
  expect(container.querySelector("img, a, script")).toBeNull();
});
