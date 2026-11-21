import { useQuery } from "@tanstack/react-query"
import { evaluationsApi } from "../api/client"

export interface DriftResult {
  verdict: "regression" | "improvement" | "within_noise"
  baseline_score: number
  current_score: number
  difference: number
  significant: boolean
  baseline_band: [number, number]
  current_band: [number, number]
  effect_floor: number
}

export interface UseDriftOptions {
  evaluationId: number
  enabled?: boolean
}

export function useDrift({ evaluationId, enabled = true }: UseDriftOptions) {
  return useQuery({
    queryKey: ["drift", evaluationId],
    queryFn: () => evaluationsApi.drift(evaluationId),
    enabled: enabled && !!evaluationId,
    staleTime: 30000,
    retry: 1,
  })
}
