import { Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { UserAvatar } from "./UserAvatar";

export function AppHeader({
  title,
  subtitle,
  onPress,
  avatar,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  avatar?: string | null;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.xl,
      }}
    >
      <View>
        <Text
          style={{
            color: colors.ink,
            fontFamily: typography.display,
            fontSize: 31,
            letterSpacing: -1.2,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              color: colors.muted,
              fontFamily: typography.body,
              fontSize: 13,
              marginTop: spacing.xs,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {onPress && (
        <TouchableOpacity accessibilityLabel="打开设置" onPress={onPress}>
          <UserAvatar avatar={avatar} size={40} />
        </TouchableOpacity>
      )}
    </View>
  );
}
