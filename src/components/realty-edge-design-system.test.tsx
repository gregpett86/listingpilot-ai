import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  LuxuryCard,
  MetricCard,
  ProgressBar,
  PropertyHero,
  RecommendationCard,
  ReportBadge,
  RoomPhotoCard,
  ScoreGauge,
  SectionHeader,
} from "./realty-edge-design-system";

describe("Realty Edge design system", () => {
  it("renders premium report primitives", () => {
    render(
      <LuxuryCard>
        <SectionHeader
          eyebrow="Listing Readiness"
          subtitle="Premium homeowner report system"
          title="Realty Edge Pro"
        />
        <MetricCard label="Current Score" value="83" />
        <ProgressBar label="Photo Readiness" value={83} />
        <ScoreGauge label="Score" score={83} />
        <ReportBadge tone="gold">Luxury</ReportBadge>
      </LuxuryCard>,
    );

    expect(screen.getByText("Realty Edge Pro")).toBeInTheDocument();
    expect(screen.getByText("Current Score")).toBeInTheDocument();
    expect(screen.getByText("Photo Readiness")).toBeInTheDocument();
    expect(screen.getByText("Luxury")).toBeInTheDocument();
  });

  it("renders property, room, and recommendation cards with missing-photo states", () => {
    render(
      <>
        <PropertyHero address="123 Main Street" details="4 Bed | 3 Bath | 2,800 Sq Ft" />
        <RoomPhotoCard label="Kitchen" status="Photo-ready" />
        <RecommendationCard
          description="Clear counters before photography."
          difficulty="Easy"
          isSelected
          points={5}
          room="Kitchen"
          time="1 hour"
          title="Kitchen Counter Styling"
        />
      </>,
    );

    expect(screen.getByText("123 Main Street")).toBeInTheDocument();
    expect(screen.getAllByText("Photo not provided")).toHaveLength(2);
    expect(screen.getByText("Kitchen Counter Styling")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });
});
