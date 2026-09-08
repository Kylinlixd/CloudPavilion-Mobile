# 书籍详情信息与简介刮削 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将书籍详情页改为封面左侧、元信息右侧、简介下置的响应式布局，并可靠补全中文书籍简介与封面元数据。

**Architecture:** 后端继续提供 `/reading/metadata/search/`，在豆瓣候选结果上增加详情页简介解析，并在入库时只补全已有书籍的空字段。移动端详情页在加载空简介书籍时调用该搜索接口，将首个有简介的候选通过 PATCH 回写后刷新展示；网络失败只影响简介补全，不阻塞详情页。

**Tech Stack:** Django/DRF、requests、Django TestCase、React Native、TypeScript、React Navigation、xcodebuild。

---

### Task 1: 后端豆瓣详情简介解析

**Files:**
- Modify: `/Users/leexd/CloudPavilion/catalog/reading.py`
- Test: `/Users/leexd/CloudPavilion/catalog/tests/test_reading.py`

- [ ] **Step 1: 写失败测试**：mock 搜索响应和豆瓣详情 HTML，断言候选的 `description` 来自 `meta[name=description]`，详情请求失败时仍返回候选且简介为空。
- [ ] **Step 2: 运行测试确认失败**：`python manage.py test catalog.tests.test_reading.MetadataSearchTests -v 2`，预期新断言失败。
- [ ] **Step 3: 实现最小解析器**：新增 `_douban_description(url)`，使用现有 requests 超时设置和 `html.parser`/正则提取 description，限制长度 8000；在豆瓣候选映射时调用它并捕获 RequestException、ValueError、TypeError。
- [ ] **Step 4: 运行测试确认通过**：再次运行上述测试，预期 PASS。
- [ ] **Step 5: 提交**：`git add catalog/reading.py catalog/tests/test_reading.py && git commit -m "feat: scrape douban book descriptions"`。

### Task 2: 入库时只补全空元数据

**Files:**
- Modify: `/Users/leexd/CloudPavilion/catalog/services.py`
- Test: `/Users/leexd/CloudPavilion/catalog/tests/test_api.py`

- [ ] **Step 1: 写失败测试**：创建已有 ISBN、仅有标题的 Book，调用 `CatalogService.add_book_copy` 传入 description/cover/author/publisher，断言空字段被补齐且已有非空 description 不被覆盖。
- [ ] **Step 2: 运行测试确认失败**：`python manage.py test catalog.tests.test_api -v 2`。
- [ ] **Step 3: 实现字段补全**：`get_or_create` 后遍历允许补全字段（author、publisher、publish_date、category、description、cover_url），仅当现值为空且新值非空时设置并保存；不改变副本创建逻辑。
- [ ] **Step 4: 运行测试确认通过**：再次运行 `python manage.py test catalog.tests.test_api -v 2`。
- [ ] **Step 5: 提交**：`git add catalog/services.py catalog/tests/test_api.py && git commit -m "fix: enrich existing books with missing metadata"`。

### Task 3: 移动端详情页响应式信息头

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/BookDetailScreen.tsx`
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/BookDetailScreen.test.tsx`（若测试基础设施不支持渲染，则以 typecheck/lint 和纯函数断言覆盖布局数据）

- [ ] **Step 1: 写失败测试**：新建 `src/test/BookDetailScreen.test.tsx`，覆盖元信息字段过滤（空出版社/ISBN 不渲染）和窄屏/iPad 的封面宽度计算。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- --run src/test/BookDetailScreen.test.tsx`。
- [ ] **Step 3: 实现布局**：使用 `useWindowDimensions` 计算 `isTablet` 与封面宽度；将封面和右侧信息放入横向 View，右侧显示书名、作者、版权信息、出版社、出版日期、ISBN；在下方新增“内容简介”标题和简介文本；保留实体副本/电子书/书摘顺序和原操作。
- [ ] **Step 4: 运行移动端静态检查**：`npm run typecheck && npm run lint`。
- [ ] **Step 5: 提交**：`git add src/screens/BookDetailScreen.tsx src/test/BookDetailScreen.test.tsx && git commit -m "feat: redesign responsive book detail header"`。

### Task 4: 移动端空简介自动补全

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/BookDetailScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/lib/types.ts`（仅在搜索结果类型缺少字段时）
- Test: `/Users/leexd/CloudPavilion-Mobile/src/test/BookDetailScreen.test.tsx`

- [ ] **Step 1: 在 `src/test/BookDetailScreen.test.tsx` 增加失败测试**：模拟空简介书籍和 metadata 搜索结果，断言只选取首个非空 description，并调用一次 PATCH；已有简介时断言不搜索、不 PATCH。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- --run src/test/BookDetailScreen.test.tsx`。
- [ ] **Step 3: 实现补全流程**：详情数据加载后若 `description.trim()` 为空，调用 `/reading/metadata/search/?q=...`；候选按 description 非空过滤，PATCH 仅传本地空字段对应值，成功后合并到 state；catch 静默记录为可恢复错误，不替换主内容错误态。
- [ ] **Step 4: 运行完整移动端测试**：`npm test -- --run`，预期全部通过。
- [ ] **Step 5: 提交**：`git add src/screens/BookDetailScreen.tsx src/lib/types.ts src/test/BookDetailScreen.test.tsx && git commit -m "feat: enrich missing book descriptions on detail"`。

### Task 5: 后端与真机验收

**Files:**
- No source changes; verify commits and generated build artifacts only.

- [ ] **Step 1: 运行后端相关测试**：`python manage.py test catalog.tests.test_metadata catalog.tests.test_reading catalog.tests.test_api -v 2`。
- [ ] **Step 2: 构建 iOS Release**：在 `/Users/leexd/CloudPavilion-Mobile` 执行 `cd ios && pod install --silent && cd .. && xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Release -destination 'id=00008130-0002345A02E2001C' -allowProvisioningUpdates DEVELOPMENT_TEAM=M7U9C9L2DF CODE_SIGN_STYLE=Automatic build`。
- [ ] **Step 3: 安装并启动真机**：使用 `xcrun devicectl device install app --device 00008130-0002345A02E2001C <Release app path>` 和 `xcrun devicectl device process launch --device 00008130-0002345A02E2001C com.kylinlixd.cloudpavilion`，确认详情页横向信息头和简介显示。
- [ ] **Step 4: 部署后端并健康检查**：打包上传 `/opt/cloudpavilion`，执行 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`，请求 `/cloudpavilion/health/ready/` 返回 database/redis 均为 ok。

### Task 6: 详情页杂志式视觉重排

**Files:**
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/screens/BookDetailScreen.tsx`
- Modify: `/Users/leexd/CloudPavilion-Mobile/src/components/BookCover.tsx`（仅在需要统一封面尺寸时）

- [ ] **Step 1: 写失败断言**：在 `src/test/book-detail.test.ts` 增加信息区节奏常量和窄屏封面尺寸断言，确保封面宽度低于旧版且信息区采用统一间距。
- [ ] **Step 2: 运行测试确认失败**：`npm test -- --run src/test/book-detail.test.ts`。
- [ ] **Step 3: 实现视觉重排**：详情头使用浅色信息区容器；返回按钮与头部增加垂直留白；封面宽度采用 120–136（手机）/210–230（iPad）；右侧只展示分类、标题、作者，出版社/日期/ISBN 收纳到低对比度细节行；简介标题前加入分隔线并使用 16px 正文行距。
- [ ] **Step 4: 运行静态检查与测试**：`npm run typecheck && npm run lint && npm test -- --run`。
- [ ] **Step 5: 提交**：`git add src/screens/BookDetailScreen.tsx src/components/BookCover.tsx src/test/book-detail.test.ts && git commit -m "style: refine book detail visual hierarchy"`。
