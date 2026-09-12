#!/usr/bin/env bash
set -euo pipefail

# Validate a signed iOS .app before installing it on a device.
# A free Apple Development profile is valid for a short period, so a package
# with fourteen days or less remaining must not be shipped accidentally.

APP_PATH="${1:-${IOS_APP_PATH:-}}"
if [[ -z "$APP_PATH" ]]; then
  echo "用法: $0 /path/to/app.app" >&2
  exit 2
fi

if [[ ! -d "$APP_PATH" || "${APP_PATH##*.}" != "app" ]]; then
  echo "错误：找不到 iOS 应用包：$APP_PATH" >&2
  exit 2
fi

if ! codesign --verify --deep --strict --verbose=2 "$APP_PATH"; then
  echo "错误：iOS 应用签名校验失败：$APP_PATH" >&2
  exit 1
fi

PROFILE="$APP_PATH/embedded.mobileprovision"
if [[ ! -f "$PROFILE" ]]; then
  echo "错误：应用包没有 embedded.mobileprovision，无法确认真机安装资格" >&2
  exit 1
fi

PROFILE_PLIST="$(mktemp -t cloudpavilion-profile).plist"
trap 'rm -f "$PROFILE_PLIST"' EXIT
if ! security cms -D -i "$PROFILE" > "$PROFILE_PLIST" 2>/dev/null; then
  echo "错误：无法解析 embedded.mobileprovision" >&2
  exit 1
fi

EXPIRATION="$(/usr/libexec/PlistBuddy -c 'Print :ExpirationDate' "$PROFILE_PLIST" 2>/dev/null || true)"
APP_ID="$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$PROFILE_PLIST" 2>/dev/null || true)"
if [[ -z "$EXPIRATION" ]]; then
  echo "错误：描述文件缺少 ExpirationDate" >&2
  exit 1
fi

EXPIRATION_EPOCH="$(
  date -j -f '%a %b %d %H:%M:%S %Z %Y' "$EXPIRATION" +%s 2>/dev/null \
    || date -j -f '%Y-%m-%d %H:%M:%S %z' "$EXPIRATION" +%s 2>/dev/null \
    || date -j -f '%Y-%m-%d %H:%M:%S %Z' "$EXPIRATION" +%s 2>/dev/null \
    || true
)"
if [[ -z "$EXPIRATION_EPOCH" ]]; then
  echo "错误：无法解析描述文件过期时间：$EXPIRATION" >&2
  exit 1
fi

NOW_EPOCH="$(date +%s)"
REMAINING_SECONDS=$((EXPIRATION_EPOCH - NOW_EPOCH))
REMAINING_DAYS=$((REMAINING_SECONDS / 86400))

echo "签名校验通过：$APP_PATH"
echo "应用标识：${APP_ID:-未知}"
echo "描述文件到期：${EXPIRATION}（剩余约 ${REMAINING_DAYS} 天）"

if (( REMAINING_SECONDS <= 0 )); then
  echo "错误：描述文件已过期，请使用新的签名凭据重新构建" >&2
  exit 1
fi
if (( REMAINING_SECONDS <= 14 * 86400 )); then
  echo "警告：描述文件将在 14 天内过期，请切换到 TestFlight、Ad Hoc 或 App Store 签名" >&2
fi

echo "Release 包可以安装到真机。"
