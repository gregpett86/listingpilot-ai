import { cleanup, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    cleanup();
  });

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
    expect(screen.getByRole("link", { name: /Listing Reports/i })).toHaveAttribute(
      "href",
      "/listing-reports",
    );
    expect(screen.getAllByText("New Listing Evaluation").length).toBeGreaterThan(0);
    expect(screen.queryByText("AI Listing Presentation")).not.toBeInTheDocument();
    expect(screen.queryByText("My Reports")).not.toBeInTheDocument();
  });

  it("keeps Listing Reports directly below Listing Evaluation", () => {
    render(
      <RealtyEdgeShell activeLabel="Listing Reports">
        <RealtyEdgePageHeader
          breadcrumbCurrent="Listing Reports"
          title="Listing Reports"
        />
      </RealtyEdgeShell>,
    );

    const links = screen.getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual([
      "Dashboard",
      "New CMA / Property",
      "Listing Evaluation",
      "Listing Reports",
      "Leads",
      "Profile",
    ]);
  });
});
