import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skillsApi } from "../api/client";
import type { Skill, SkillCreate, SkillUpdate, SkillListResponse } from "../types/api";

export function useSkills(params?: { page?: number; page_size?: number; search?: string }) {
  return useQuery<SkillListResponse>({
    queryKey: ["skills", params],
    queryFn: () => skillsApi.list(params).then((r) => r.data),
  });
}

export function useSkill(id: number) {
  return useQuery<Skill>({
    queryKey: ["skills", id],
    queryFn: () => skillsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SkillCreate) => skillsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SkillUpdate }) =>
      skillsApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["skills", id] });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => skillsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}