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
- 书阁码切换、书阁成员和设置
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
npx eas build --platform ios --profile simulator
```

生产发布：

```bash
npx eas build --platform android --profile production
npx eas build --platform ios --profile simulator
```

Android 生产构建用于正式发布。iOS `simulator` 构建无需付费 Apple Developer 账号，只能在 macOS 的 Xcode Simulator 中运行，不能安装到真实 iPhone，也不能提交到 App Store；真实 iPhone IPA 需要 Apple Developer 账号和签名凭据。

### iOS 真机签名与到期检查

通过 Xcode 的 Apple Development 免费签名安装到真机时，描述文件通常只有短期有效期，不能作为正式发布方案。每次安装前对 Release 包执行：

```bash
npm run ios:release:check -- /path/to/Release-iphoneos/app.app
```

脚本会校验代码签名、真机描述文件和到期时间；剩余 14 天以内或已经过期会直接失败，避免把“云阁不再可用”的包继续安装到手机。

长期使用请加入 Apple Developer Program，并选择以下一种发布方式：

- TestFlight：适合团队测试和持续更新，安装后由 TestFlight 管理版本和更新。
- Ad Hoc：适合已登记 UDID 的少量内部设备，需要维护设备列表和年度证书/描述文件。
- App Store：面向正式用户，通过审核和商店分发。

长期发布构建应在 CI 中保存签名凭据，构建后仍必须执行上述检查；不要将 `.p12`、`.mobileprovision` 或 API 密钥提交到仓库。

## GitHub Release

仓库包含 `.github/workflows/mobile-release.yml`。发布新版本时创建版本标签：

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会使用 `EXPO_TOKEN` 调用 EAS，分别构建 Android production 和 iOS Simulator，并把产物上传到对应 GitHub Release。仓库管理员需要在 GitHub Settings → Secrets and variables → Actions 中添加 `EXPO_TOKEN`；EAS 账号需要有 Android 构建凭据权限，iOS Simulator 不需要 Apple 签名凭据。

## 验证

```bash
npm run typecheck
npm run lint
npm test -- --run
npx expo export --platform android
npx expo export --platform ios
```

当前移动端采用原生底部导航和大触控目标；推送通知、扫码录入、Face ID/指纹和 WebSocket 实时事件已预留为后续模块。
