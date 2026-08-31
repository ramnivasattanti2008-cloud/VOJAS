import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByRole("heading", { name: "No results" })).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<EmptyState title="No results" description="Try adjusting your filters" />);
    expect(screen.getByText("Try adjusting your filters")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<EmptyState title="No results" />);
    expect(screen.queryByText(/Try/)).not.toBeInTheDocument();
  });

  it("renders the default icon (Inbox) when no icon is provided", () => {
    render(<EmptyState title="No items" />);
    // The container has class text-slate-500 from the Inbox icon
    const container = document.querySelector(".text-slate-500");
    expect(container).toBeInTheDocument();
  });

  it("renders a custom icon when provided", () => {
    render(<EmptyState title="No items" icon={<span data-testid="custom-icon">Icon</span>} />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders the action when provided as a React node", () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Add Item" })).toBeInTheDocument();
  });

  it("does not render an action container when action is not provided", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
