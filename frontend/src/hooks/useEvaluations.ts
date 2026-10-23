import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evaluationsApi } from "../api/client";
import type { Evaluation, EvaluationCreate, EvaluationListResponse } from "../types/api";

export function useEvaluations(params?: { page?: number; page_size?: number; skill_id?: number; status?: string }) {
  return useQuery<EvaluationListResponse>({
    queryKey: ["evaluations", params],
    queryFn: () => evaluationsApi.list(params).then((r) => r.data),
  });
}

export function useEvaluation(id: number) {
  return useQuery<Evaluation>({
    queryKey: ["evaluations", id],
    queryFn: () => evaluationsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EvaluationCreate) => evaluationsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}

export function useRunEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => evaluationsApi.run(id).then((r) => r.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["evaluations", id] });
    },
  });
}