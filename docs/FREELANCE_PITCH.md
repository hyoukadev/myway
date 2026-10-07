# 浏览器插件定制 · 作品集

> 我独立开发并维护了一个上线级的浏览器扩展 **myway**(Chrome / Edge / Firefox 三端),
> 基于 Manifest V3。下方是能证明我能力的技术细节。

---

## 🛠️ 我能为你做什么

- **浏览器插件定制开发**(Chrome / Edge / Firefox,Manifest V3)
- **现有插件 bug 修复、功能扩展、性能优化**
- **网页自动化脚本**(content script 注入、DOM 操作、跨页面流程)
- **插件 UI 重构**(设置页、弹窗、可视化编辑器)
- **多商店打包上架**(Chrome Web Store / Edge / AMO 全流程)

---

## 💎 代表作:myway

一个 **Vim 风格的网页键盘导航扩展**,三端发布、工程化完整。

### 技术亮点(每一项都能直接迁移到你的项目)

| 能力 | 在 myway 里体现在哪 |
|------|---------------------|
| **Manifest V3 全套** | service worker 后台、content script 注入、`<all_urls>` 权限管理、web_accessible_resources |
| **复杂权限申请** | tabs/bookmarks/history/storage/sessions/scripting/favicon/webNavigation/search —— 拿得到、审得过 |
| **中大型代码库二次开发** | 在 Vimium(数万行)基础上做架构级改造,读懂整套 mode/handler_stack/completer 架构 |
| **工程化构建** | 一套源码 → Chrome/Edge/Firefox 三个 zip,`npm run build` 一键产出,带静态校验 `npm run check` |
| **前端 UI 能力** | 现代化设置页(明暗双主题、卡片式布局、响应式)、可视化快捷键编辑器(按键录制器、搜索、重置) |
| **上架合规** | 隐私政策、权限说明、商店素材(截图/宣传图)、多语言(中英)listing |

### 可量化的工程产出

- ✅ 三端同时打包(Chrome / Edge / Firefox),每端独立 manifest
- ✅ 图标自动栅格化(SVG → PNG,sharp)
- ✅ 自动截图、商店素材生成
- ✅ 静态校验:manifest 完整性、文件存在性、品牌一致性、被移除绑定的检查
- ✅ 可视化快捷键编辑器 —— 原 Vimium 没有,我独立设计与实现

---

## 📋 可承接的典型需求

| 需求类型 | 举例 | 周期参考 |
|---------|------|---------|
| 数据采集 | 采集某网站商品/评论/列表数据 | 1–3 天 |
| 网页增强 | 去广告、去复制限制、自动填表、批量操作 | 1–2 天 |
| 自动化 | 自动打卡、自动签到、流程脚本 | 1–3 天 |
| UI/功能开发 | 给现有插件加设置页、加弹窗、加新命令 | 1–5 天 |
| 全新插件 | 从 0 做一个带 UI 的完整插件 | 3–10 天 |

---

## 📞 联系方式

- 联系:[你的微信 / 邮箱]
- 交付方式:源码 + 打包好的 zip + 上架指引
- 支持售后:bug 随时改

> ⚠️ 发送前替换上面的联系方式。myway 源码可在面试/谈单时按需展示。
