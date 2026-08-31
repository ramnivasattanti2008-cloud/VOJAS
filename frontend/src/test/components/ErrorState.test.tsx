import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorState from "@/components/ui/ErrorState";

describe("ErrorState", () => {
  it("renders the default title", () => {
    render(<ErrorState />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  });

  it("renders the default message", () => {
    render(<ErrorState />);
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
  });

  it("renders a custom message", () => {
    render(<ErrorState message="Network timeout" />);
    expect(screen.getByText("Network timeout")).toBeInTheDocument();
  });

  it("renders a custom title", () => {
    render(<ErrorState title="Server Error" />);
    expect(screen.getByRole("heading", { name: "Server Error" })).toBeInTheDocument();
  });

  it("renders the error code when provided", () => {
    render(<ErrorState code="ERR_500" />);
    expect(screen.getByText("ERR_500")).toBeInTheDocument();
  });

  it("does not render the retry button when onRetry is not provided", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("renders the retry button when onRetry is provided", () => {
    render(<ErrorState onRetry={vi.fn()} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not crash when onRetry is called multiple times", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await userEvent.dblClick(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
