import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ActionButton } from "../components/ActionButton";
import { UserAvatar } from "../components/UserAvatar";
import { apiClient, ApiError } from "../lib/api";
import { uploadFile } from "../lib/reading";
import type { User } from "../lib/types";
import { colors } from "../theme/colors"; import { spacing } from "../theme/spacing"; import { typography } from "../theme/typography";

export function EditProfileScreen() {
  const navigation = useNavigation<any>(); const [user, setUser] = useState<User | null>(null); const [nickname, setNickname] = useState(""); const [photo, setPhoto] = useState<any>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { const me = await apiClient.get<User>("/auth/me/"); setUser(me); setNickname(me.nickname || ""); }, []);
  useFocusEffect(useCallback(() => { void load().catch(() => setError("资料加载失败，请重试。")); }, [load]));
  async function pick() { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 }); if (!result.canceled) setPhoto(result.assets[0]); }
  async function save() { if (!nickname.trim()) { setError("用户名称不能为空。"); return; } setBusy(true); setError(""); try { await apiClient.patch<User>("/auth/me/", { nickname: nickname.trim() }); if (photo) await uploadFile<User>("/auth/me/avatar/", "avatar", photo); await load(); setPhoto(null); Alert.alert("已保存", "个人资料已更新。", [{ text: "完成", onPress: () => navigation.goBack() }]); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "保存失败，请稍后重试。"); } finally { setBusy(false); } }
  async function resetAvatar() { setBusy(true); try { const me = await apiClient.delete<User>("/auth/me/avatar/"); setUser(me); setPhoto(null); } catch { setError("恢复默认头像失败，请重试。"); } finally { setBusy(false); } }
  return <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} style={{ backgroundColor: colors.paper }} keyboardShouldPersistTaps="handled">
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: colors.terracotta, fontSize: 15 }}>‹ 返回我的</Text></TouchableOpacity>
    <Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 32, marginTop: spacing.xl }}>编辑个人资料</Text>
    <View style={{ alignItems: "center", marginVertical: spacing.xl }}>{photo ? <Image source={{ uri: photo.uri }} style={{ backgroundColor: colors.sage, borderRadius: 48, height: 96, width: 96 }} /> : <UserAvatar avatar={user?.avatar} size={96} />}<TouchableOpacity onPress={() => void pick()}><Text style={{ color: colors.terracotta, marginTop: spacing.md }}>从相册选择头像</Text></TouchableOpacity><TouchableOpacity onPress={() => void resetAvatar()}><Text style={{ color: colors.muted, marginTop: spacing.sm }}>恢复默认头像</Text></TouchableOpacity></View>
    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: spacing.xs }}>用户名称</Text><TextInput autoCapitalize="none" autoCorrect={false} maxLength={32} onChangeText={setNickname} placeholder="请输入用户名称" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.paperBright, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, minHeight: 54, paddingHorizontal: 16 }} value={nickname} />
    <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.lg }}>登录用户名</Text><Text style={{ color: colors.ink, fontFamily: typography.body, fontSize: 16, marginTop: spacing.xs }}>{user?.username || "—"}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>用于登录，修改用户名称不会改变它。</Text>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text> : null}<View style={{ marginTop: spacing.xl }}><ActionButton disabled={busy} loading={busy} onPress={() => void save()}>保存资料</ActionButton></View>
  </ScrollView>;
}
