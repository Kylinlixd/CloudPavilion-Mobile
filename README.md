# 云阁 CloudPavilion Mobile

Android 和 iOS 共用的 Expo React Native 移动端，连接现有 CloudPavilion Django API。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm start
```

启动后按 Expo CLI 提示选择 Android 模拟器、iOS 模拟器或 Expo Go。

本机后端地址配置：

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

真机调试时，不能使用 `127.0.0.1` 指向开发电脑，需要改为电脑在局域网中的 IP，例如：

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:8000/api/v1
```

## 功能

- JWT 登录、SecureStore 会话保存与自动刷新
- 家庭 ID 切换、家庭成员和设置
- 工作台统计、当前借阅和推荐
- 藏书搜索、图书详情和实体副本状态
- 借出、归还、续借、预约和取消预约
- 通知单条/全部已读
- 年度阅读报告和推荐

## Android / iOS 构建

本项目使用同一份 TypeScript 源码生成两个平台的应用。当前版本为 `1.0.0`，Android `versionCode=1`，iOS `buildNumber=1`。

本地构建需要先登录 Expo/EAS，并初始化项目：

```bash
npx eas login
npx eas init
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```

生产发布：

```bash
npx eas build --platform all --profile production
```

## GitHub Release

仓库包含 `.github/workflows/mobile-release.yml`。发布新版本时创建版本标签：

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会使用 `EXPO_TOKEN` 调用 EAS，同时构建 Android 和 iOS，并把产物上传到对应 GitHub Release。仓库管理员需要在 GitHub Settings → Secrets and variables → Actions 中添加 `EXPO_TOKEN`；EAS 账号还必须有 Android/iOS 签名凭据权限。

## 验证

```bash
npm run typecheck
npm run lint
npm test -- --run
npx expo export --platform android
npx expo export --platform ios
```

当前移动端采用原生底部导航和大触控目标；推送通知、扫码录入、Face ID/指纹和 WebSocket 实时事件已预留为后续模块。
