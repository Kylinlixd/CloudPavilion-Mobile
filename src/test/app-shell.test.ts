import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("native app shell", () => {
  it("keeps every screen below the top safe area", () => {
    const appSource = readFileSync(resolve(projectRoot, "App.tsx"), "utf8");

    expect(appSource).toContain("SafeAreaView");
    expect(appSource).toContain("edges={['top']}");
  });

  it("uses 云阁 as the installed app name", () => {
    const appConfig = JSON.parse(
      readFileSync(resolve(projectRoot, "app.json"), "utf8"),
    );

    expect(appConfig.expo.name).toBe("云阁");
  });

  it("configures offline vector icons and Chinese labels for every main tab", () => {
    const navigatorSource = readFileSync(
      resolve(projectRoot, "src/navigation/RootNavigator.tsx"),
      "utf8",
    );

    expect(navigatorSource).toContain(
      "import Ionicons from '@expo/vector-icons/Ionicons'",
    );
    expect(navigatorSource).toContain("Home: 'home-outline'");
    expect(navigatorSource).toContain("Catalog: 'library-outline'");
    expect(navigatorSource).toContain("Loans: 'swap-horizontal-outline'");
    expect(navigatorSource).toContain("Profile: 'person-outline'");
    expect(navigatorSource).toContain("title: '首页'");
    expect(navigatorSource).toContain("title: '藏书'");
    expect(navigatorSource).toContain("title: '借阅'");
    expect(navigatorSource).toContain("title: '我的'");
    expect(navigatorSource).toContain("tabBarItemStyle: { flex: 1 }");
    expect(navigatorSource).toContain("height: 56 + insets.bottom");
  });

  it("gives the shelf a searchable empty state and accessible import actions", () => {
    const catalogSource = readFileSync(
      resolve(projectRoot, "src/screens/CatalogScreen.tsx"),
      "utf8",
    );
    const ebookImportSource = readFileSync(
      resolve(projectRoot, "src/components/ImportEbookButton.tsx"),
      "utf8",
    );

    expect(catalogSource).toContain("没有找到相关书籍");
    expect(catalogSource).toContain("清除搜索");
    expect(catalogSource).toContain("add-circle-outline");
    expect(catalogSource).toContain("checkmark-circle-outline");
    expect(catalogSource).toContain('accessibilityLabel="导入书籍"');
    expect(catalogSource).toContain('accessibilityLabel="选择书籍"');
    expect(catalogSource).toContain("扫码/拍照添加纸质书");
    expect(catalogSource).toContain('accessibilityLabel="书架统计"');
    expect(catalogSource).toContain('navigation.navigate("AddBook")');
    expect(ebookImportSource).toContain("导入电子书 · EPUB / PDF / TXT");
    expect(ebookImportSource).toContain("navigation.navigate('BookDetail'");
  });

  it("keeps lending actions independently loading", () => {
    const loansSource = readFileSync(
      resolve(projectRoot, "src/screens/LoansScreen.tsx"),
      "utf8",
    );

    expect(loansSource).toContain("pendingActions");
    expect(loansSource).toContain("pendingActions.has(`${item.id}:renew`)");
    expect(loansSource).toContain("pendingActions.has(`${item.id}:return`)");
  });

  it("integrates account-scoped offline fallback into shelf and profile flows", () => {
    const catalogSource = readFileSync(
      resolve(projectRoot, "src/screens/CatalogScreen.tsx"),
      "utf8",
    );
    const profileSource = readFileSync(
      resolve(projectRoot, "src/screens/EditProfileScreen.tsx"),
      "utf8",
    );

    expect(catalogSource).toContain("getWithOfflineCache");
    expect(catalogSource).toContain("当前离线，显示上次同步的藏书");
    expect(profileSource).toContain("getWithOfflineCache");
    expect(profileSource).toContain("mutateWithOfflineQueue");
    expect(profileSource).toContain("联网后自动同步");
  });
});
