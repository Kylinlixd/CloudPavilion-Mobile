import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "../components/ActionButton";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { ImportEbookButton } from "../components/ImportEbookButton";
import { BookCover } from "../components/BookCover";
import { LoadingState } from "../components/LoadingState";
import { useFamily } from "../context/FamilyContext";
import { apiClient } from "../lib/api";
import type { Book, Paginated } from "../lib/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type BookPage = Paginated<Book> & { total_copy_count?: number };
function pageOf(value: Book[] | BookPage) {
  return Array.isArray(value)
    ? {
        items: value,
        count: value.length,
        next: null,
        copies: value.reduce((sum, book) => sum + book.copy_count, 0),
      }
    : {
        items: value.results,
        count: value.count,
        next: value.next,
        copies: value.total_copy_count || 0,
      };
}

export function CatalogScreen() {
  const navigation = useNavigation<any>();
  const { familyId } = useFamily();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const columns = width >= 700 ? 6 : 3;
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [totalBookCount, setTotalBookCount] = useState(0);
  const [totalCopyCount, setTotalCopyCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const requestPath = useCallback(() => {
    const params = new URLSearchParams({ ordering });
    if (query.trim()) params.set("search", query.trim());
    return `/books/?${params}`;
  }, [ordering, query]);
  const load = useCallback(async () => {
    if (!familyId) return;
    const page = pageOf(await apiClient.get<Book[] | BookPage>(requestPath()));
    setBooks(page.items);
    setNextPage(page.next);
    setTotalBookCount(page.count);
    setTotalCopyCount(page.copies);
  }, [familyId, requestPath]);
  const loadMore = useCallback(async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = pageOf(await apiClient.get<Book[] | BookPage>(nextPage));
      setBooks((current) => [...current, ...page.items]);
      setNextPage(page.next);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextPage]);
  useFocusEffect(
    useCallback(() => {
      void load()
        .catch(() => setError("藏书暂时无法加载。"))
        .finally(() => setLoading(false));
    }, [load]),
  );
  const toggle = (id: number) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const leave = () => {
    setSelecting(false);
    setSelected([]);
  };
  const bulkDelete = () =>
    Alert.alert("删除所选书籍？", `将删除 ${selected.length} 本书及其纸质书。`, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () =>
          void Promise.all(
            selected.map((id) => apiClient.delete(`/books/${id}/`)),
          ).then(() => {
            leave();
            return load();
          }),
      },
    ]);
  const retry = () => {
    setError("");
    setLoading(true);
    void load()
      .catch(() => setError("藏书暂时无法加载。"))
      .finally(() => setLoading(false));
  };
  if (loading && !books.length) return <LoadingState label="正在翻找藏书" />;
  const itemWidth = Math.max(
    44,
    (width - spacing.lg * 2 - spacing.sm * (columns - 1)) / columns,
  );
  return (
    <View
      style={{ backgroundColor: colors.paper, flex: 1, padding: spacing.lg }}
    >
      {selecting ? (
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              setSelected(
                selected.length === books.length
                  ? []
                  : books.map((book) => book.id),
              )
            }
          >
            <Text style={{ color: colors.terracotta }}>全选</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: "700" }}>
            选择书籍
          </Text>
          <TouchableOpacity onPress={leave}>
            <Text style={{ color: colors.muted }}>取消</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginBottom: spacing.md }}>
          <TextInput
            accessibilityLabel="搜索藏书"
            onChangeText={setQuery}
            placeholder="搜索书名、作者或分类"
            placeholderTextColor={colors.muted}
            style={{
              backgroundColor: colors.paperBright,
              borderColor: colors.line,
              borderRadius: 10,
              borderWidth: 1,
              color: colors.ink,
              height: 48,
              paddingHorizontal: 14,
            }}
          />
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: spacing.md,
            }}
          >
            <Text
              style={{ color: colors.ink, fontSize: 22, fontWeight: "700" }}
            >
              书架
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <TouchableOpacity
                accessibilityLabel="导入书籍"
                accessibilityRole="button"
                onPress={() => setImportOpen(true)}
                style={{ alignItems: "center", flexDirection: "row", gap: 5 }}
              >
                <Ionicons
                  color={colors.terracotta}
                  name="add-circle-outline"
                  size={20}
                />
                <Text style={{ color: colors.terracotta }}>导入</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="选择书籍"
                accessibilityRole="button"
                onPress={() => setSelecting(true)}
                style={{ alignItems: "center", flexDirection: "row", gap: 5 }}
              >
                <Ionicons
                  color={colors.ink}
                  name="checkmark-circle-outline"
                  size={20}
                />
                <Text style={{ color: colors.ink }}>选择</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {!selecting && (
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          {[
            ["-created_at", "最近添加"],
            ["title", "书名"],
            ["category", "分类"],
            ["-updated_at", "最近更新"],
          ].map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setOrdering(value)}
              style={{
                backgroundColor:
                  ordering === value ? colors.ink : colors.paperBright,
                borderRadius: 8,
                padding: 8,
              }}
            >
              <Text
                style={{
                  color: ordering === value ? colors.white : colors.muted,
                  fontSize: 10,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <FlatList
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{
            gap: spacing.md,
            paddingBottom: selecting ? 180 : 120,
          }}
          data={books}
          keyExtractor={(book) => String(book.id)}
          numColumns={columns}
          onEndReached={() =>
            void loadMore().catch(() => setError("更多藏书加载失败。"))
          }
          onEndReachedThreshold={0.65}
          refreshControl={
            <RefreshControl
              colors={[colors.terracotta]}
              onRefresh={() => {
                setRefreshing(true);
                void load()
                  .catch(() => setError("藏书暂时无法加载。"))
                  .finally(() => setRefreshing(false));
              }}
              refreshing={refreshing}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                selecting
                  ? toggle(item.id)
                  : navigation.navigate("BookDetail", { bookId: item.id })
              }
              style={{ width: itemWidth }}
            >
              <View>
                <BookCover
                  category={item.category}
                  coverUrl={item.cover_url || item.cover}
                  seed={item.id}
                  small
                  title={item.title}
                />
                {selecting && (
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: selected.includes(item.id)
                        ? colors.terracotta
                        : colors.paperBright,
                      borderColor: colors.white,
                      borderRadius: 12,
                      borderWidth: 2,
                      height: 24,
                      justifyContent: "center",
                      position: "absolute",
                      right: 5,
                      top: 5,
                      width: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: selected.includes(item.id)
                          ? colors.white
                          : colors.muted,
                        fontSize: 14,
                      }}
                    >
                      {selected.includes(item.id) ? "✓" : ""}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                numberOfLines={2}
                style={{ color: colors.ink, fontSize: 10, marginTop: 5 }}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.trim() ? (
              <View style={{ alignItems: "center", paddingTop: spacing.xxl }}>
                <Text
                  style={{ color: colors.ink, fontSize: 20, fontWeight: "700" }}
                >
                  没有找到相关书籍
                </Text>
                <Text style={{ color: colors.muted, marginTop: spacing.sm }}>
                  试试其他书名、作者或分类
                </Text>
                <TouchableOpacity
                  accessibilityLabel="清除搜索"
                  accessibilityRole="button"
                  onPress={() => setQuery("")}
                  style={{ marginTop: spacing.md }}
                >
                  <Text style={{ color: colors.terracotta }}>清除搜索</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <EmptyState title="书架还是空的" copy="点击右侧导入第一本书。" />
            )
          }
          ListFooterComponent={
            <View style={{ alignItems: "center", paddingTop: spacing.lg }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                共 {totalBookCount} 个书名 · {totalCopyCount} 本纸质书
                {loadingMore ? " · 正在加载" : ""}
              </Text>
            </View>
          }
        />
      )}
      {selecting && (
        <View
          style={{
            bottom: 0,
            left: 0,
            padding: spacing.md,
            position: "absolute",
            right: 0,
          }}
        >
          <ActionButton disabled={!selected.length} onPress={bulkDelete}>
            删除所选
          </ActionButton>
        </View>
      )}
      <Modal
        animationType="fade"
        transparent
        visible={importOpen}
        onRequestClose={() => setImportOpen(false)}
      >
        <TouchableOpacity
          onPress={() => setImportOpen(false)}
          style={{
            backgroundColor: "rgba(0,0,0,.35)",
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.paperBright,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: spacing.xl,
              paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.md),
            }}
          >
            <Text
              style={{
                color: colors.ink,
                fontSize: 25,
                fontWeight: "700",
                marginBottom: spacing.lg,
              }}
            >
              导入书籍
            </Text>
            <ActionButton
              onPress={() => {
                setImportOpen(false);
                navigation.navigate("AddBook");
              }}
            >
              扫码/拍照添加实体书
            </ActionButton>
            <View style={{ marginTop: spacing.md }}>
              <ImportEbookButton />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
