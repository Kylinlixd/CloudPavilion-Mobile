import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { ActionButton } from "../components/ActionButton";
import { AppHeader } from "../components/AppHeader";
import { EmptyState } from "../components/EmptyState";
import { UserAvatar } from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../lib/auth";
import { useFamily } from "../context/FamilyContext";
import { ApiError, apiClient } from "../lib/api";
import type { Family, Membership } from "../lib/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

function asList<T>(value: T[] | { results: T[] }) {
  return Array.isArray(value) ? value : value.results;
}
export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { familyId, family, setCurrentFamilyId, refreshFamily } = useFamily();
  const [input, setInput] = useState(familyId || "");
  const [members, setMembers] = useState<Membership[]>([]);
  const [name, setName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  useEffect(() => {
    if (!familyId) return;
    void Promise.all([
      refreshFamily(),
      apiClient.get<Membership[] | { results: Membership[] }>("/memberships/"),
    ]).then(([, value]) => setMembers(asList(value)));
  }, [familyId, refreshFamily]);
  async function saveFamily() {
    await setCurrentFamilyId(input);
    await refreshFamily().catch(() => undefined);
    Alert.alert("家庭已切换", `当前家庭 ID：${input}`);
  }
  async function createFamily() {
    if (!name.trim()) return;
    const created = await apiClient.post<Family>("/families/", {
      name: name.trim(),
    });
    await setCurrentFamilyId(String(created.id));
    setName("");
    Alert.alert("家庭已创建", created.name);
  }
  async function submitPasswordChange() {
    setPasswordError("");
    if (!oldPassword || !newPassword || !newPasswordConfirm) {
      setPasswordError("请完整填写密码。");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("两次输入的新密码不一致。");
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(oldPassword, newPassword, newPasswordConfirm);
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      Alert.alert("密码已修改", "为保护账号安全，请使用新密码重新登录。", [
        {
          text: "确定",
          onPress: () => {
            void logout();
            navigation.navigate("Login");
          },
        },
      ]);
    } catch (caught) {
      setPasswordError(
        caught instanceof ApiError
          ? caught.message
          : "修改密码失败，请稍后重试。",
      );
    } finally {
      setPasswordBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
      style={{ backgroundColor: colors.paper }}
    >
      <AppHeader title="设置" />
      <View
        style={{
          backgroundColor: colors.ink,
          borderRadius: 16,
          padding: spacing.xl,
        }}
      >
        <Text
          style={{
            color: colors.terracottaLight,
            fontFamily: typography.mono,
            fontSize: 10,
            letterSpacing: 1,
          }}
        >
          当前家庭
        </Text>
        <Text
          style={{
            color: colors.white,
            fontFamily: typography.display,
            fontSize: 28,
            marginTop: 22,
          }}
        >
          {family?.name || (familyId ? `家庭 ${familyId}` : "还没有选择")}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,.62)",
            fontFamily: typography.body,
            fontSize: 12,
            marginTop: 7,
          }}
        >
          家庭 ID {familyId || "—"}
        </Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setInput}
          placeholder="输入家庭 ID"
          placeholderTextColor="rgba(255,255,255,.45)"
          style={{
            borderBottomColor: "rgba(255,255,255,.26)",
            borderBottomWidth: 1,
            color: colors.white,
            marginTop: 24,
            paddingBottom: 10,
          }}
        />
        <View style={{ marginTop: spacing.lg }}>
          <ActionButton onPress={() => void saveFamily()}>
            切换家庭
          </ActionButton>
        </View>
      </View>
      <View
        style={{
          backgroundColor: colors.paperBright,
          borderRadius: 16,
          marginTop: spacing.md,
          padding: spacing.xl,
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
          创建新家庭
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontFamily: typography.display,
            fontSize: 24,
            marginTop: 20,
          }}
        >
          从一个名字开始。
        </Text>
        <TextInput
          onChangeText={setName}
          placeholder="例如：周末阅读会"
          placeholderTextColor={colors.muted}
          style={{
            borderBottomColor: colors.line,
            borderBottomWidth: 1,
            color: colors.ink,
            marginTop: 20,
            paddingBottom: 10,
          }}
        />
        <View style={{ marginTop: spacing.lg }}>
          <ActionButton onPress={() => void createFamily()}>
            创建家庭
          </ActionButton>
        </View>
      </View>
      <Text
        style={{
          color: colors.ink,
          fontFamily: typography.display,
          fontSize: 25,
          marginTop: spacing.xxl,
        }}
      >
        家庭成员
      </Text>
      <View
        style={{
          backgroundColor: colors.paperBright,
          borderRadius: 16,
          gap: spacing.md,
          marginTop: spacing.md,
          padding: spacing.xl,
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
          账号与安全
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontFamily: typography.display,
            fontSize: 24,
          }}
        >
          修改密码
        </Text>
        {[
          ["旧密码", oldPassword, setOldPassword],
          ["新密码", newPassword, setNewPassword],
          ["确认新密码", newPasswordConfirm, setNewPasswordConfirm],
        ].map(([label, value, setter]) => (
          <TextInput
            key={label as string}
            onChangeText={setter as (value: string) => void}
            placeholder={label as string}
            placeholderTextColor={colors.muted}
            secureTextEntry={!passwordVisible}
            style={{
              borderBottomColor: colors.line,
              borderBottomWidth: 1,
              color: colors.ink,
              paddingBottom: 10,
            }}
            value={value as string}
          />
        ))}
        <TouchableOpacity
          onPress={() => setPasswordVisible((visible) => !visible)}
        >
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {passwordVisible ? "隐藏密码" : "显示密码"}
          </Text>
        </TouchableOpacity>
        {passwordError ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger, fontSize: 13 }}
          >
            {passwordError}
          </Text>
        ) : null}
        <ActionButton
          disabled={passwordBusy}
          loading={passwordBusy}
          onPress={() => void submitPasswordChange()}
        >
          确认修改密码
        </ActionButton>
      </View>
      <View style={{ marginTop: spacing.md }}>
        {members.length ? (
          members.map((member) => (
            <View
              key={member.id}
              style={{
                alignItems: "center",
                borderBottomColor: colors.line,
                borderBottomWidth: 1,
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: spacing.md,
              }}
            >
              <UserAvatar avatar={member.user_detail.avatar} size={36} />
              <View>
                <Text
                  style={{
                    color: colors.ink,
                    fontFamily: typography.body,
                    fontSize: 15,
                  }}
                >
                  {member.user_detail.nickname || member.user_detail.username}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: typography.body,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {member.user_detail.email || "未留下邮箱"}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.terracotta,
                  fontFamily: typography.mono,
                  fontSize: 10,
                }}
              >
                {member.role}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState
            title="暂时没有成员资料"
            copy="确认家庭 ID 正确后再试一次。"
          />
        )}
      </View>
      <View style={{ marginTop: spacing.xxl }}>
        <ActionButton
          onPress={() => {
            void logout();
            navigation.navigate("Login");
          }}
          quiet
        >
          退出登录
        </ActionButton>
      </View>
    </ScrollView>
  );
}
