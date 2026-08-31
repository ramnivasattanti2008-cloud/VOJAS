import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DonutChart, type DonutItem } from "@/components/charts/DonutChart";

describe("DonutChart", () => {
  const sampleData: DonutItem[] = [
    { label: "Completed", value: 60, color: "#22c55e" },
    { label: "In Progress", value: 30, color: "#3b82f6" },
    { label: "At Risk", value: 10, color: "#ef4444" },
  ];

  it("renders nothing when data is empty", () => {
    render(<DonutChart data={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders slices when data is provided", () => {
    render(<DonutChart data={sampleData} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders the legend with all labels", () => {
    render(<DonutChart data={sampleData} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("At Risk")).toBeInTheDocument();
  });

  it("renders custom center text when provided", () => {
    render(<DonutChart data={sampleData} centerText="8 Projects" />);
    expect(screen.getByText("8 Projects")).toBeInTheDocument();
  });

  it("renders center subtext when provided", () => {
    render(<DonutChart data={sampleData} centerText="8" centerSubtext="Total" />);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("has a descriptive aria-label on the root element", () => {
    render(<DonutChart data={sampleData} />);
    const chart = screen.getByRole("img");
    expect(chart).toHaveAttribute("aria-label", expect.stringContaining("Donut chart"));
  });
});
