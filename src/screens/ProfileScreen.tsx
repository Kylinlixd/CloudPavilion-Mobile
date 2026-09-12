import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "../components/ActionButton";
import { AppHeader } from "../components/AppHeader";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { UserAvatar } from "../components/UserAvatar";
import { useFamily } from "../context/FamilyContext";
import { apiClient } from "../lib/api";
import type { AnnualReport, Dashboard, Notification, User } from "../lib/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

function list<T>(value: T[] | { results: T[] }) {
  return Array.isArray(value) ? value : value.results;
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { familyId, family } = useFamily();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [report, setReport] = useState<AnnualReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const me = await apiClient.get<User>("/auth/me/");
    setUser(me);
    if (!familyId) {
      setNotifications([]);
      setDashboard(null);
      setReport(null);
      return;
    }
    const [notice, stats, annual] = await Promise.all([
      apiClient.get<Notification[] | { results: Notification[] }>(
        "/notifications/",
      ),
      apiClient.get<Dashboard>("/reports/dashboard/"),
      apiClient.get<AnnualReport>(
        `/reports/annual/?year=${new Date().getFullYear()}`,
      ),
    ]);
    setNotifications(list(notice));
    setDashboard(stats);
    setReport(annual);
  }, [familyId]);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load()
        .catch(() => setError("我的页面暂时无法加载。"))
        .finally(() => setLoading(false));
    }, [load]),
  );
  if (loading) return <LoadingState label="正在打开我的页面" />;
  const unread = notifications.filter((item) => !item.is_read).length;
  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: spacing.bottomNav + insets.bottom + spacing.lg,
      }}
      refreshControl={
        <RefreshControl
          colors={[colors.terracotta]}
          onRefresh={() => {
            setRefreshing(true);
            void load().finally(() => setRefreshing(false));
          }}
          refreshing={refreshing}
        />
      }
      style={{ backgroundColor: colors.paper }}
    >
      <AppHeader avatar={user?.avatar} subtitle={family?.name || "还没有加入书阁"} title="我的" />
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setError("");
            void load();
          }}
        />
      ) : (
        <>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.ink,
              borderRadius: 16,
              flexDirection: "row",
              padding: spacing.xl,
            }}
          >
            <UserAvatar avatar={user?.avatar} size={64} />
            <TouchableOpacity onPress={() => navigation.navigate("EditProfile")} style={{ flex: 1, marginLeft: spacing.lg }}>
              <Text style={{ color: colors.terracottaLight, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1 }}>个人资料</Text>
              <Text numberOfLines={2} style={{ color: colors.white, fontFamily: typography.display, fontSize: 24, marginTop: spacing.sm }}>{user?.nickname || user?.username || "云阁读者"}</Text>
              <Text style={{ color: "rgba(255,255,255,.62)", fontFamily: typography.body, fontSize: 12, marginTop: spacing.xs }}>编辑个人资料  ›</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={{ backgroundColor: colors.paperBright, borderRadius: 14, marginTop: spacing.md, padding: spacing.lg }}>
            <Text style={{ color: colors.terracotta, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1 }}>当前书阁</Text>
            <Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 22, marginTop: spacing.sm }}>{family?.name || "还没有加入书阁"}</Text>
            <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12, marginTop: spacing.xs }}>{family ? `身份：${family.my_role === "owner" ? "阁主" : family.my_role === "reader" ? "书友" : "成员"} · 管理书阁 ›` : "创建或加入书阁 ›"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("Notifications")}
            style={{
              backgroundColor: colors.paperBright,
              borderRadius: 14,
              marginTop: spacing.md,
              padding: spacing.lg,
            }}
          >
            <Text
              style={{
                color: colors.terracotta,
                fontFamily: typography.mono,
                fontSize: 10,
                letterSpacing: 1,
              }}
            >
              通知
            </Text>
            <Text
              style={{
                color: colors.ink,
                fontFamily: typography.display,
                fontSize: 23,
                marginTop: spacing.sm,
              }}
            >
              {unread ? `${unread} 条未读消息` : "没有未读消息"}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: typography.body,
                fontSize: 12,
                marginTop: spacing.xs,
              }}
            >
              {notifications[0]?.title || "借阅到期和预约变化会在这里提醒你"} →
            </Text>
          </TouchableOpacity>
          <View
            style={{
              flexDirection: "row",
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            <View
              style={{
                backgroundColor: colors.ink,
                borderRadius: 14,
                flex: 1,
                padding: spacing.lg,
              }}
            >
              <Text
                style={{
                  color: colors.terracottaLight,
                  fontFamily: typography.mono,
                  fontSize: 10,
                }}
              >
                书名
              </Text>
              <Text
                style={{
                  color: colors.white,
                  fontFamily: typography.display,
                  fontSize: 32,
                  marginTop: spacing.sm,
                }}
              >
                {dashboard?.books.titles ?? "—"}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.terracotta,
                borderRadius: 14,
                flex: 1,
                padding: spacing.lg,
              }}
            >
              <Text
                style={{
                  color: colors.white,
                  fontFamily: typography.mono,
                  fontSize: 10,
                }}
              >
                借阅
              </Text>
              <Text
                style={{
                  color: colors.white,
                  fontFamily: typography.display,
                  fontSize: 32,
                  marginTop: spacing.sm,
                }}
              >
                {report?.total_loans ?? "—"}
              </Text>
            </View>
          </View>
          <Text
            style={{
              color: colors.ink,
              fontFamily: typography.display,
              fontSize: 26,
              marginTop: spacing.xxl,
            }}
          >
            阅读数据
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <ActionButton onPress={() => navigation.navigate("Reports")} quiet>
              查看阅读报告
            </ActionButton>
          </View>
          {!familyId && (
            <EmptyState
              title="还没有加入书阁"
              copy="创建或加入一个书阁，开始管理藏书。"
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
