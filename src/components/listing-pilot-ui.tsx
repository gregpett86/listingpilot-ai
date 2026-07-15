import { ReactNode } from "react";

type StepCardProps = {
  children: ReactNode;
  description: string;
  isComplete?: boolean;
  isReady?: boolean;
  step: number;
  title: string;
};

type MetricCardProps = {
  label: string;
  value: ReactNode;
};

type Confidence = "High" | "Medium" | "Low";

const confidenceStyles: Record<Confidence, string> = {
  High:
    "border-[rgba(22,163,74,0.25)] bg-[rgba(22,163,74,0.12)] text-[#16a34a]",
  Medium:
    "border-[rgba(212,160,23,0.25)] bg-[rgba(212,160,23,0.12)] text-[#B45309]",
  Low: "border-[rgba(234,88,12,0.25)] bg-[rgba(234,88,12,0.12)] text-[#ea580c]",
};

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 card-shadow">
      <p className="text-[22px] font-extrabold tabular-nums text-[#111827]">
        {value}
      </p>
      <p className="label-caps mt-1">{label}</p>
    </div>
  );
}

export function StepCard({
  children,
  description,
  isComplete,
  isReady,
  step,
  title,
}: StepCardProps) {
  const stepClass = isComplete
    ? "bg-[#16a34a] text-white"
    : isReady
      ? "bg-[#D4A017] text-[#111827]"
      : "border-2 border-[#E5E7EB] text-[#6B7280]";

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 card-shadow">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${stepClass}`}
        >
          {step}
        </div>
        <div>
          <h2 className="text-base font-bold text-[#111827]">{title}</h2>
          <p className="mt-0.5 text-xs text-[#6B7280]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 card-shadow">
      {children}
    </div>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${confidenceStyles[confidence]}`}
    >
      {confidence}
    </span>
  );
}
