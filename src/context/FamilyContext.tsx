import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { apiClient } from "../lib/api";
import type { Family } from "../lib/types";
import { clearFamilyId, getFamilyId, setFamilyId } from "../lib/storage";

type FamilyValue = {
  familyId: string | null; family: Family | null; families: Family[];
  setCurrentFamilyId: (id: string) => Promise<void>; refreshFamily: () => Promise<void>; refreshFamilies: () => Promise<Family[]>;
  createFamily: (name: string, description?: string) => Promise<Family>;
  lookupFamily: (code: string) => Promise<Family & { is_removed?: boolean }>;
  joinFamily: (code: string) => Promise<Family>; leaveFamily: (id?: string | number) => Promise<void>;
};
const FamilyContext = createContext<FamilyValue | null>(null);
function asList(value: Family[] | { results: Family[] }) { return Array.isArray(value) ? value : value.results; }

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hydrating } = useAuth();
  const [familyId, setFamilyIdState] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const refreshFamilies = useCallback(async () => { const value = await apiClient.get<Family[] | { results: Family[] }>("/families/mine/"); const list = asList(value); setFamilies(list); return list; }, []);
  useEffect(() => { if (hydrating || !isAuthenticated) return; void (async () => { const saved = await getFamilyId().catch(() => null); const list = await refreshFamilies().catch(() => []); const selected = saved && list.some((item) => String(item.id) === saved) ? saved : list.length === 1 ? String(list[0].id) : null; if (selected) { await setFamilyId(selected); setFamilyIdState(selected); setFamily(list.find((item) => String(item.id) === selected) || null); } else { await clearFamilyId(); setFamilyIdState(null); setFamily(null); } })(); }, [hydrating, isAuthenticated, refreshFamilies]);
  useEffect(() => { if (!isAuthenticated) { setFamilyIdState(null); setFamily(null); setFamilies([]); } }, [isAuthenticated]);
  const setCurrentFamilyId = useCallback(async (id: string) => { const value = id.trim(); if (!value || !families.some((item) => String(item.id) === value)) throw new Error("请选择已加入的书阁"); await setFamilyId(value); setFamilyIdState(value); setFamily(families.find((item) => String(item.id) === value) || null); }, [families]);
  const refreshFamily = useCallback(async () => { if (!familyId) return; const list = await refreshFamilies(); setFamily(list.find((item) => String(item.id) === familyId) || null); }, [familyId, refreshFamilies]);
  const createFamily = useCallback(async (name: string, description = "") => { const created = await apiClient.post<Family>("/families/", { name: name.trim(), description }); await refreshFamilies(); await setFamilyId(String(created.id)); setFamilyIdState(String(created.id)); setFamily(created); return created; }, [refreshFamilies]);
  const lookupFamily = useCallback((code: string) => apiClient.post<Family & { is_removed?: boolean }>("/families/lookup-code/", { code }), []);
  const joinFamily = useCallback(async (code: string) => { const result = await apiClient.post<{ family: Family; membership: unknown }>("/families/join-by-code/", { code }); await refreshFamilies(); await setFamilyId(String(result.family.id)); setFamilyIdState(String(result.family.id)); setFamily(result.family); return result.family; }, [refreshFamilies]);
  const leaveFamily = useCallback(async (id?: string | number) => { const target = id ?? familyId ?? ""; if (!target) return; await apiClient.post(`/families/${target}/leave/`); const list = await refreshFamilies(); const next = list[0]; if (next) { await setFamilyId(String(next.id)); setFamilyIdState(String(next.id)); setFamily(next); } else { await clearFamilyId(); setFamilyIdState(null); setFamily(null); } }, [familyId, refreshFamilies]);
  const value = useMemo(() => ({ familyId, family, families, setCurrentFamilyId, refreshFamily, refreshFamilies, createFamily, lookupFamily, joinFamily, leaveFamily }), [familyId, family, families, setCurrentFamilyId, refreshFamily, refreshFamilies, createFamily, lookupFamily, joinFamily, leaveFamily]);
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}
export function useFamily() { const value = useContext(FamilyContext); if (!value) throw new Error("useFamily must be used inside FamilyProvider"); return value; }
