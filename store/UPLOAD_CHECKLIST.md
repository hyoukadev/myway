# myway 上传清单（照着勾）

每家商店的每个字段该填什么、截图放哪、权限说明粘哪段。打勾 = 完成。

> 通用准备（三家用同一套）：
> - [ ] 已 `npm run check`（All checks passed）
> - [ ] 已 `npm run build`（dist/chrome、dist/edge、dist/firefox 三个 zip）
> - [ ] 已 `npm run smoke`（SMOKE PASSED）
> - [ ] store/listing.md、PRIVACY.md、background_scripts/main.js 里的占位符已替换为真实信息并重新 build
> - [ ] 截图至少 3 张（1280×800）：①Options 顶部品牌+Keys 卡片 ②Key bindings 编辑器 ③任意网页按 `?` 的帮助对话框；另有 1 张暗色主题
> - [ ] store/assets/promo-440x280.png（小推广图）

---

## ① Chrome Web Store

注册（一次性）：
- [ ] 打开 https://chrome.google.com/webstore/devconsole ，用你的 Google 账号登录
- [ ] 支付 **$5** 一次性注册费（一次性信用卡/Google Pay）
- [ ] 完成手机号 + 邮箱验证

上传：
- [ ] **Item → Add new item** → 上传 `dist/chrome/myway-chrome-1.0.0.zip`

Store listing 逐字段（内容全部来自 `store/listing.md` 的 English 区块）：
- [ ] **Name**：`myway — Keyboard Shortcuts for the Web`
- [ ] **Summary**（≤132 字符）：复制 listing.md 的 "Summary"
- [ ] **Description**：复制 listing.md 的 "Description" 整段
- [ ] **Category**：Productivity
- [ ] **Language**：English（可再加 Chinese (Simplified) 区域，文案用 listing.md 的中文区块）
- [ ] **Icon**：上传 `icons/icon128.png`
- [ ] **Screenshots**：上传 3–5 张（见上方"通用准备"）
- [ ] **Small promo tile**：`store/assets/promo-440x280.png`
- [ ] **Homepage URL / Support URL / Support email**：填你提供的真实信息

Privacy（关键，容易卡审核）：
- [ ] **Privacy policy URL**：填你提供的隐私政策页 URL
- [ ] **"Are you selling..."**：No
- [ ] **"Is your extension collecting…"**：按 PRIVACY.md 回答——全部 No（myway 不收集任何数据）

权限说明（在权限页或注释里贴 `store/PERMISSIONS.md` 的表格要点）：
- [ ] `<all_urls>`：键盘导航需在所有页面运行，不读取页面内容用于其它用途
- [ ] `tabs / bookmarks / history / sessions`：标签/书签/历史操作
- [ ] `scripting`：MV3 下注入内容脚本与自定义 CSS
- [ ] `storage`：本地保存用户设置
- [ ] `notifications`：版本升级提示（可关）
- [ ] `webNavigation / search / favicon`：URL 变化检测、默认搜索、Vomnibar 显示 favicon

提交：
- [ ] **Submit for review** → 记录 listing URL 到 `store/listing.md`
- [ ] 审核 1–3 天

---

## ② Microsoft Edge Add-ons

注册（一次性）：
- [ ] 打开 https://partner.microsoft.com/dashboard/microsoftedge
- [ ] 用 Microsoft 账号登录，完成 Partner Center 账户创建（免费）

上传：
- [ ] **Create new extension** → 上传 `dist/edge/myway-edge-1.0.0.zip`（和 Chrome 同一份 Chromium MV3 包）

字段（基本复用 Chrome，Edge 支持同样字段）：
- [ ] **Name**：`myway — Keyboard Shortcuts for the Web`
- [ ] **Description**：同 listing.md
- [ ] **Category**：Productivity
- [ ] **Store logo**：`icons/icon128.png`
- [ ] **Screenshots**：同 Chrome 那 3–5 张
- [ ] **Privacy policy URL**：你的隐私政策页
- [ ] **Support / Website URL / Contact**：你的真实信息
- [ ] 权限说明：贴 PERMISSIONS.md（注意 Edge 也是 Chromium，权限与 Chrome 完全一致，含 favicon）

提交：
- [ ] 提交审核，记录 listing URL

---

## ③ Firefox Add-ons (AMO)

注册（一次性）：
- [ ] 打开 https://addons.mozilla.org/developers/ ，用 Mozilla 账号登录（免费）

上传：
- [ ] **Submit a New Add-on → On this site** → 上传 `dist/firefox/myway-firefox-1.0.0.zip`
- [ ] AMO 自动跑 linter：应通过（manifest 是干净 MV3）。有报错按提示改后重新 build

字段：
- [ ] **Name**：`myway — Keyboard Shortcuts for the Web`
- [ ] **Summary / Description**：用 listing.md（可加 Chinese 区域）
- [ ] **Categories**：Tabs / Bookmarks 类目下选合适
- [ ] **Icon**：`icons/icon128.png`
- [ ] **Screenshots**：同上
- [ ] **Privacy policy**：贴 PRIVACY.md 全文或 URL
- [ ] 权限说明：贴 PERMISSIONS.md（注意 Firefox 版**不含 favicon**，但**含 clipboardRead/clipboardWrite**）

AMO 特别项：
- [ ] **Source code**：myway 源码即打包源码，无需额外提供；可填你的公开仓库 URL
- [ ] 提交后等待自动 + 人工审核

---

## 提交后
- [ ] 把三家 listing URL 写回 `store/listing.md` 顶部，方便后续 in-extension 反馈链接指向
- [ ] 后续版本：同时改 `manifest.json` 和 `manifest.firefox.json` 的 `version`，重新 build（同版本号会被拒）
