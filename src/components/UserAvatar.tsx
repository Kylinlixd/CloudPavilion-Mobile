import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colors } from "../theme/colors";

export function UserAvatar({
  avatar,
  size = 40,
}: {
  avatar?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(!avatar);
  useEffect(() => setFailed(!avatar), [avatar]);
  if (!failed && avatar)
    return (
      <Image
        accessibilityLabel="用户头像"
        onError={() => setFailed(true)}
        source={{ uri: avatar }}
        style={{
          backgroundColor: colors.sage,
          borderRadius: size / 2,
          height: size,
          width: size,
        }}
      />
    );
  return (
    <View
      accessibilityLabel="默认用户头像"
      style={{
        alignItems: "center",
        backgroundColor: colors.sage,
        borderRadius: size / 2,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      <Ionicons
        color={colors.ink}
        name="person-outline"
        size={Math.round(size * 0.54)}
      />
    </View>
  );
}
