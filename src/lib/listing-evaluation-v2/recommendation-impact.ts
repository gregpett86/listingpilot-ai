import type {
  ImprovementRecommendation,
  RecommendationPriority,
} from "./types";
import type { AgentRecommendationCandidate } from "./agent-contracts";

const IMPACT_MATRIX: Record<
  RecommendationPriority,
  Record<AgentRecommendationCandidate["effort"], number>
> = {
  do_first: { quick: 5, moderate: 7, project: 8 },
  next_if_possible: { quick: 3, moderate: 4, project: 5 },
  optional_polish: { quick: 1, moderate: 2, project: 3 },
};

export function deterministicRecommendationImpact(
  priority: RecommendationPriority,
  effort: AgentRecommendationCandidate["effort"],
) {
  return IMPACT_MATRIX[priority][effort];
}

export function buildRecommendationsFromAgentCandidates({
  spaceId,
  candidates,
}: {
  spaceId: string;
  candidates: AgentRecommendationCandidate[];
}): ImprovementRecommendation[] {
  return candidates.map((candidate, index) => ({
    id: `${spaceId}:recommendation:${index + 1}`,
    spaceId,
    title: candidate.title,
    reason: candidate.reason,
    evidence: candidate.evidence,
    priority: candidate.priority,
    effort: candidate.effort,
    scoreImpact: deterministicRecommendationImpact(
      candidate.priority,
      candidate.effort,
    ),
    selected: true,
  }));
}
