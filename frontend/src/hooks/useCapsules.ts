import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { capsulesApi } from "../api/client";
import type { Capsule, CapsuleCreate, CapsuleUpdate, CapsuleListResponse } from "../types/api";

export function useCapsules(params?: { page?: number; page_size?: number; status?: string }) {
  return useQuery<CapsuleListResponse>({
    queryKey: ["capsules", params],
    queryFn: () => capsulesApi.list(params).then((r) => r.data),
  });
}

export function useCapsule(id: number) {
  return useQuery<Capsule>({
    queryKey: ["capsules", id],
    queryFn: () => capsulesApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCapsule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CapsuleCreate) => capsulesApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
    },
  });
}

export function useUpdateCapsule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CapsuleUpdate }) =>
      capsulesApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
      queryClient.invalidateQueries({ queryKey: ["capsules", id] });
    },
  });
}

export function useDeleteCapsule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => capsulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["capsules"] });
    },
  });
}

export function useCheckCapsule() {
  return useMutation({
    mutationFn: (id: number) => capsulesApi.check(id).then((r) => r.data),
  });
}