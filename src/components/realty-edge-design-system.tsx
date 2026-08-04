import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LuxuryCardProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "navy" | "gold";
};

type ScoreGaugeProps = {
  label?: string;
  score: number;
  size?: "sm" | "md" | "lg";
};

type ProgressBarProps = {
  label?: string;
  max?: number;
  showValue?: boolean;
  value: number;
};

type SectionHeaderProps = {
  action?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
};

type PropertyHeroProps = {
  address: string;
  details: string;
  imageUrl?: string;
  metrics?: ReactNode;
};

type RoomPhotoCardProps = {
  imageUrl?: string;
  label: string;
  score?: number;
  status?: string;
};

type MetricCardProps = {
  label: string;
  tone?: "default" | "positive" | "gold";
  value: ReactNode;
};

type RecommendationCardProps = {
  description: string;
  difficulty: string;
  isSelected?: boolean;
  points: number;
  room: string;
  time: string;
  title: string;
};

type ReportBadgeProps = {
  children: ReactNode;
  tone?: "default" | "gold" | "positive" | "muted";
};

const toneClasses = {
  default: "border-[rgba(8,36,66,0.1)] bg-white text-[#111827]",
  navy: "border-[#082442] bg-[#082442] text-white",
  gold: "border-[rgba(212,160,23,0.35)] bg-[#fffaf0] text-[#082442]",
};

const gaugeSizes = {
  sm: { box: "h-20 w-20", radius: 32, stroke: 7, text: "text-xl" },
  md: { box: "h-28 w-28", radius: 44, stroke: 8, text: "text-3xl" },
  lg: { box: "h-36 w-36", radius: 58, stroke: 9, text: "text-4xl" },
};

const badgeTones = {
  default: "border-[#E5E7EB] bg-white text-[#374151]",
  gold: "border-[rgba(212,160,23,0.35)] bg-[#f7edd1] text-[#9a7100]",
  positive: "border-[rgba(18,139,83,0.24)] bg-[rgba(18,139,83,0.1)] text-[#128b53]",
  muted: "border-[#E5E7EB] bg-[#F8FAFC] text-[#6B7280]",
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function LuxuryCard({ children, className, tone = "default" }: LuxuryCardProps) {
  return (
    <section
      className={cn(
        "rounded-[14px] border p-6 shadow-[var(--realty-edge-card-shadow)]",
        "transition duration-200 ease-out hover:shadow-[var(--realty-edge-card-shadow-hover)]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ScoreGauge({ label = "Score", score, size = "md" }: ScoreGaugeProps) {
  const normalized = clampScore(score);
  const config = gaugeSizes[size];
  const circumference = 2 * Math.PI * config.radius;
  const dash = (normalized / 100) * circumference;

  return (
    <div className={cn("relative grid place-items-center", config.box)}>
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          fill="none"
          r={config.radius}
          stroke="#E5E7EB"
          strokeWidth={config.stroke}
        />
        <circle
          cx="60"
          cy="60"
          fill="none"
          r={config.radius}
          stroke="#D4A017"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={config.stroke}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div className="relative text-center">
        <div className={cn("rep-metric leading-none", config.text)}>{normalized}</div>
        <div className="rep-label mt-1">{label}</div>
      </div>
    </div>
  );
}

export function ProgressBar({
  label,
  max = 100,
  showValue = true,
  value,
}: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label && <span className="rep-label">{label}</span>}
          {showValue && <span className="text-xs font-black text-[#082442]">{Math.round(value)}</span>}
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="h-full rounded-full bg-[#D4A017] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function SectionHeader({ action, eyebrow, subtitle, title }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="rep-label text-[#9a7100]">{eyebrow}</p>}
        <h2 className="rep-heading mt-1 text-2xl">{title}</h2>
        {subtitle && <p className="rep-body mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PropertyHero({ address, details, imageUrl, metrics }: PropertyHeroProps) {
  return (
    <LuxuryCard className="overflow-hidden p-0">
      <div className="grid min-h-72 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        {imageUrl ? (
          <div
            aria-label={address}
            className="min-h-72 bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <div className="grid min-h-72 place-items-center bg-[#EEF3F8] text-sm font-black text-[#6B7280]">
            Photo not provided
          </div>
        )}
        <div className="flex flex-col justify-center p-8">
          <p className="rep-label text-[#9a7100]">Property Workspace</p>
          <h1 className="rep-heading mt-3 text-3xl">{address}</h1>
          <p className="rep-body mt-3">{details}</p>
          {metrics && <div className="mt-6">{metrics}</div>}
        </div>
      </div>
    </LuxuryCard>
  );
}

export function RoomPhotoCard({ imageUrl, label, score, status }: RoomPhotoCardProps) {
  return (
    <LuxuryCard className="overflow-hidden p-0">
      {imageUrl ? (
        <div
          aria-label={label}
          className="aspect-[4/3] bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="grid aspect-[4/3] place-items-center bg-[#EEF3F8] text-sm font-black text-[#6B7280]">
          Photo not provided
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-black text-[#082442]">{label}</h3>
          {typeof score === "number" && <ReportBadge tone="gold">{score}/100</ReportBadge>}
        </div>
        {status && <p className="rep-body mt-2 text-sm">{status}</p>}
      </div>
    </LuxuryCard>
  );
}

export function MetricCard({ label, tone = "default", value }: MetricCardProps) {
  const valueClass =
    tone === "positive"
      ? "text-[#128b53]"
      : tone === "gold"
        ? "text-[#9a7100]"
        : "text-[#082442]";

  return (
    <LuxuryCard className="p-5">
      <p className={cn("rep-metric text-3xl", valueClass)}>{value}</p>
      <p className="rep-label mt-2">{label}</p>
    </LuxuryCard>
  );
}

export function RecommendationCard({
  description,
  difficulty,
  isSelected,
  points,
  room,
  time,
  title,
}: RecommendationCardProps) {
  return (
    <LuxuryCard
      className={cn(
        "p-5",
        isSelected && "border-[rgba(18,139,83,0.28)] bg-[rgba(18,139,83,0.04)]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="rep-label text-[#9a7100]">{room}</p>
          <h3 className="mt-1 font-black text-[#082442]">{title}</h3>
        </div>
        <ReportBadge tone={isSelected ? "positive" : "muted"}>
          {isSelected ? "Selected" : "Available"}
        </ReportBadge>
      </div>
      <p className="rep-body mt-3">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ReportBadge tone="gold">+{points} points</ReportBadge>
        <ReportBadge>{difficulty}</ReportBadge>
        <ReportBadge>{time}</ReportBadge>
      </div>
    </LuxuryCard>
  );
}

export function ReportBadge({ children, tone = "default" }: ReportBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}
