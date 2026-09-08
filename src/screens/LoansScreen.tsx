import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { ActionButton } from "../components/ActionButton";
import { AppHeader } from "../components/AppHeader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StatusPill } from "../components/StatusPill";
import { useFamily } from "../context/FamilyContext";
import { apiClient } from "../lib/api";
import { errorMessage } from "../lib/reading";
import type { Loan, Paginated, Reservation } from "../lib/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

function asPage<T>(value: T[] | Paginated<T>) {
  return Array.isArray(value)
    ? { items: value, next: null }
    : { items: value.results, next: value.next };
}

async function fetchAll<T>(path: string) {
  const items: T[] = [];
  let next: string | null = path;
  while (next) {
    const page: { items: T[]; next: string | null } = asPage<T>(
      await apiClient.get<T[] | Paginated<T>>(next),
    );
    items.push(...page.items);
    next = page.next;
  }
  return items;
}

type Filter = "active" | "ended" | "reservations";
const reservationLabels: Record<string, string> = {
  pending: "等待中",
  fulfilled: "可领取",
  canceled: "已取消",
};

export function LoansScreen() {
  const navigation = useNavigation<any>();
  const { familyId } = useFamily();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!familyId) return;
    const [nextLoans, nextReservations] = await Promise.all([
      fetchAll<Loan>("/loans/"),
      fetchAll<Reservation>("/reservations/"),
    ]);
    setLoans(nextLoans);
    setReservations(nextReservations);
  }, [familyId]);

  useFocusEffect(
    useCallback(() => {
      void load()
        .catch((caught) => setError(errorMessage(caught)))
        .finally(() => setLoading(false));
    }, [load]),
  );

  async function action(id: number, type: "return" | "renew") {
    const key = `${id}:${type}`;
    if (pending) return;
    setPending(key);
    setError("");
    try {
      const updated = await apiClient.post<Loan>(`/loans/${id}/${type}/`);
      setLoans((current) =>
        current.map((loan) =>
          loan.id === id ? { ...loan, ...updated } : loan,
        ),
      );
      try {
        await load();
      } catch (caught) {
        setError(
          `已${type === "return" ? "归还" : "续借"}成功，但列表刷新失败：${errorMessage(caught)}`,
        );
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  async function cancelReservation(id: number) {
    const key = `${id}:cancel`;
    if (pending) return;
    setPending(key);
    setError("");
    try {
      const updated = await apiClient.post<Reservation>(
        `/reservations/${id}/cancel/`,
      );
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === id ? { ...reservation, ...updated } : reservation,
        ),
      );
      try {
        await load();
      } catch (caught) {
        setError(`预约已取消，但列表刷新失败：${errorMessage(caught)}`);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  if (loading) return <LoadingState label="正在整理借阅" />;
  const data =
    filter === "active"
      ? loans.filter((loan) => loan.is_active)
      : filter === "ended"
        ? loans.filter((loan) => !loan.is_active)
        : reservations;
  return (
    <View
      style={{ backgroundColor: colors.paper, flex: 1, padding: spacing.lg }}
    >
      <AppHeader
        subtitle={`${loans.filter((loan) => loan.is_active).length} 本书正在流动`}
        title="借阅"
      />
      <View
        style={{
          flexDirection: "row",
          gap: spacing.xs,
          marginBottom: spacing.lg,
        }}
      >
        {(
          [
            ["active", "借阅中"],
            ["ended", "已结束"],
            ["reservations", "我的预约"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={{
              backgroundColor: filter === key ? colors.ink : colors.paperBright,
              borderColor: colors.line,
              borderRadius: 20,
              borderWidth: 1,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Text
              style={{
                color: filter === key ? colors.white : colors.ink,
                fontFamily: typography.body,
                fontSize: 13,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setError("");
            void load().catch((caught) => setError(errorMessage(caught)));
          }}
        />
      ) : (
        <FlatList<any>
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }}
          data={data}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              colors={[colors.terracotta]}
              onRefresh={() => {
                setRefreshing(true);
                void load()
                  .catch((caught) => setError(errorMessage(caught)))
                  .finally(() => setRefreshing(false));
              }}
              refreshing={refreshing}
            />
          }
          renderItem={({ item }) =>
            filter === "reservations" ? (
              <TouchableOpacity
                disabled={!item.book_id}
                onPress={() =>
                  item.book_id &&
                  navigation.navigate("BookDetail", { bookId: item.book_id })
                }
                style={{
                  backgroundColor: colors.paperBright,
                  borderRadius: 14,
                  flexDirection: "row",
                  gap: spacing.md,
                  padding: spacing.md,
                }}
              >
                {item.cover_url ? (
                  <Image
                    source={{
                      uri: item.cover_url,
                      headers: { Referer: "https://book.douban.com/" },
                    }}
                    style={{
                      backgroundColor: colors.paperMuted,
                      borderRadius: 8,
                      height: 88,
                      width: 62,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      backgroundColor: colors.ink,
                      borderRadius: 8,
                      height: 88,
                      width: 62,
                    }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      numberOfLines={2}
                      style={{
                        color: colors.ink,
                        flex: 1,
                        fontFamily: typography.display,
                        fontSize: 19,
                        marginRight: spacing.sm,
                      }}
                    >
                      {item.book_title}
                    </Text>
                    <Text
                      style={{
                        color:
                          item.status === "fulfilled"
                            ? colors.terracotta
                            : colors.muted,
                        fontFamily: typography.body,
                        fontSize: 12,
                      }}
                    >
                      {reservationLabels[item.status] || item.status}
                    </Text>
                  </View>
                  <Text
                    style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}
                  >
                    {item.author || "作者未录入"} ·{" "}
                    {item.barcode || `藏书编号 ${item.copy}`}
                  </Text>
                  <Text
                    style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}
                  >
                    {item.queue_position == null
                      ? "队列位置未知"
                      : `队列第 ${item.queue_position} 位`}{" "}
                    · {new Date(item.created_at).toLocaleDateString("zh-CN")}
                  </Text>
                  {item.status === "pending" && (
                    <ActionButton
                      disabled={Boolean(pending)}
                      loading={pending === `${item.id}:cancel`}
                      onPress={() => void cancelReservation(item.id)}
                      quiet
                    >
                      取消预约
                    </ActionButton>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  backgroundColor: colors.paperBright,
                  borderLeftColor: item.is_active
                    ? colors.terracotta
                    : colors.line,
                  borderLeftWidth: 3,
                  borderRadius: 14,
                  padding: spacing.lg,
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      color: colors.ink,
                      flex: 1,
                      fontFamily: typography.display,
                      fontSize: 20,
                      marginRight: 10,
                    }}
                  >
                    {item.book_title}
                  </Text>
                  <StatusPill
                    status={
                      item.is_active
                        ? new Date(item.due_at) < new Date()
                          ? "overdue"
                          : "borrowed"
                        : "returned"
                    }
                  />
                </View>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: typography.body,
                    fontSize: 12,
                    marginTop: 10,
                  }}
                >
                  {item.borrower_name} ·{" "}
                  {item.is_active
                    ? `应还 ${new Date(item.due_at).toLocaleDateString("zh-CN")} · 已续借 ${item.renewed_count} 次`
                    : "借阅结束"}
                </Text>
                {item.action_reason ? (
                  <Text
                    style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}
                  >
                    {item.action_reason}
                  </Text>
                ) : null}
                {item.is_active && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: spacing.sm,
                      marginTop: spacing.lg,
                    }}
                  >
                    <ActionButton
                      disabled={Boolean(pending)}
                      loading={pending === `${item.id}:renew`}
                      onPress={() => void action(item.id, "renew")}
                      quiet
                    >
                      续借
                    </ActionButton>
                    <ActionButton
                      disabled={Boolean(pending)}
                      loading={pending === `${item.id}:return`}
                      onPress={() => void action(item.id, "return")}
                    >
                      归还
                    </ActionButton>
                  </View>
                )}
              </View>
            )
          }
          ListEmptyComponent={
            <View>
              <EmptyState
                title={
                  filter === "reservations"
                    ? "还没有预约"
                    : filter === "active"
                      ? "还没有借阅"
                      : "还没有结束的借阅"
                }
                copy="去藏书里选择书籍，在详情页借阅纸质书。"
              />
              <ActionButton onPress={() => navigation.navigate("Catalog")}>
                挑一本书
              </ActionButton>
            </View>
          }
        />
      )}
    </View>
  );
}
