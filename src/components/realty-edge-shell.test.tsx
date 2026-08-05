import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { RealtyEdgePageHeader, RealtyEdgeShell } from "./realty-edge-shell";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={String(props.alt ?? "")}
      {...Object.fromEntries(
        Object.entries(props).filter(
          ([key]) => key !== "priority" && key !== "alt",
        ),
      )}
    />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

describe("RealtyEdgeShell", () => {
  it("shows Listing Evaluation as the native sidebar item", () => {
    render(
      <RealtyEdgeShell>
        <RealtyEdgePageHeader
          breadcrumbCurrent="New Listing Evaluation"
          title="New Listing Evaluation"
        />
      </RealtyEdgeShell>,
    );

    expect(screen.getByRole("link", { name: /Listing Evaluation/i })).toHaveAttribute(
      "href",
      "/listing-evaluation/new",
    );
    expect(screen.getAllByText("New Listing Evaluation").length).toBeGreaterThan(0);
    expect(screen.queryByText("AI Listing Presentation")).not.toBeInTheDocument();
  });
});
