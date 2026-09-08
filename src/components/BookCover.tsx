import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type Props = {
  title: string;
  category?: string;
  seed: string | number;
  coverUrl?: string | null;
  small?: boolean;
  width?: number;
};

export function BookCover({
  title,
  category,
  coverUrl,
  small = false,
  width,
}: Props) {
  const coverWidth = width || (small ? 108 : 176);
  const [failed, setFailed] = useState(!coverUrl);
  useEffect(() => setFailed(!coverUrl), [coverUrl]);
  if (failed)
    return (
      <View
        accessibilityLabel={`${title}封面占位`}
        style={{
          alignItems: "flex-start",
          backgroundColor: colors.ink,
          borderRadius: 14,
          height: Math.round(coverWidth * 1.4),
          justifyContent: "flex-end",
          overflow: "hidden",
          padding: 13,
          width: coverWidth,
        }}
      >
        <Text
          style={{
            color: colors.terracottaLight,
            fontFamily: typography.mono,
            fontSize: 9,
            letterSpacing: 1,
          }}
        >
          {category || "云阁藏书"}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: colors.white,
            fontFamily: typography.display,
            fontSize: small ? 14 : 20,
            lineHeight: small ? 17 : 23,
            marginTop: 7,
          }}
        >
          {title}
        </Text>
      </View>
    );
  return (
    <Image
      accessibilityLabel={`${title}封面`}
      onError={() => setFailed(true)}
      resizeMode="cover"
      source={{
        headers: { Referer: "https://book.douban.com/" },
        uri: coverUrl || undefined,
      }}
      style={{
        backgroundColor: colors.paperMuted,
        borderRadius: 14,
        height: Math.round(coverWidth * 1.4),
        width: coverWidth,
      }}
    />
  );
}
