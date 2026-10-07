# 模块索引

> 每个文件的职责、规模、是否核心。**精简时先看这里找目标；改动前看"核心"标记决定能否动。**

图例：🔴 核心（改动高风险）/ 🟡 引擎周边 / 🟢 功能（可安全改/删）/ ⚪ 非代码

## 根目录

| 文件 | 行 | 角色 | 标记 |
|---|---|---|---|
| `manifest.json` | 126 | Chrome/Edge MV3 manifest（service worker） | ⚪ |
| `manifest.firefox.json` | 110 | Firefox MV3 manifest（background scripts + clipboard + gecko id） | ⚪ |
| `README.md` | — | 项目说明 | ⚪ |
| `package.json` | — | 构建 scripts + 依赖（sharp/adm-zip/puppeteer-core） | ⚪ |

## background_scripts/（service worker，4173 行）

| 文件 | 行 | 职责 | 标记 | 改动风险 |
|---|---|---|---|---|
| `main.js` | 948 | SW 入口。消息路由、BackgroundCommands 实现表、标签页操作、内容脚本注入、升级通知 | 🔴 | 高（消息路由是枢纽） |
| `all_commands.js` | 648 | **命令目录**。所有命令的元数据定义（name/desc/group/options） | 🟡 | 中（加命令必改，删命令改这里） |
| `commands.js` | 502 | keyMappings 解析器、defaultKeyMappings、trie 编译、RegistryEntry | 🔴 | 高（解析逻辑复杂） |
| `completion/completers.js` | 908 | 所有补全器（Bookmark/History/Domain/Tab/Search/Command）+ Suggestion + MultiCompleter | 🟡 | 中（Raycast 升级主战场） |
| `completion/search_engines.js` | 266 | 内置搜索引擎补全（Google/Wikipedia/YouTube...的 suggestion API） | 🟢 | 低 |
| `completion/search_wrapper.js` | 171 | 搜索引擎补全的包装层 | 🟢 | 低 |
| `completion/ranking.js` | 165 | 补全结果排序算法（ relevancy 打分、matches 匹配） | 🟢 | 低 |
| `marks.js` | ~~131~~ | ~~跳转标记后台~~ **已删除** | — | |
| `tab_recency.js` | 139 | 标签页访问时间记录（用于 `^` visitPreviousTab） | 🟢 | 低 |
| `tab_operations.js` | 118 | 标签页操作工具（openUrlInNewTab 等） | 🟢 | 低 |
| `exclusions.js` | 78 | URL 排除规则匹配 | 🟢 | 低 |
| `user_search_engines.js` | 53 | 解析用户配置的搜索引擎（自定义命令的雏形） | 🟢 | 低 |
| `bg_utils.js` | 19 | 后台工具函数 | 🟢 | 低 |
| `reload.js` | ~~27~~ | ~~开发用重载~~ **已删除** | — | |

## content_scripts/（注入每个网页，5565 行）

| 文件 | 行 | 职责 | 标记 | 改动风险 |
|---|---|---|---|---|
| `vimium_frontend.js` | 505 | **入口**。装 DOM 监听、初始化永久 Mode、消息路由、frame 焦点管理 | 🔴 | 高 |
| `link_hints.js` | 1559 | **链接提示**。最大模块。跨 frame 协调、hint 生成、过滤、激活 | 🟡 | 高（逻辑极复杂） |
| `mode_visual.js` | ~~615~~ | ~~可视模式（v/V）~~ **已删除** | — | 将以 Helix 式选择器重做 |
| `mode_normal.js` | 565 | Normal mode + **NormalModeCommands 实现表**（命令路由核心） | 🔴 | 高 |
| `scroller.js` | 470 | 平滑/瞬时滚动引擎 | 🟢 | 低 |
| `mode_find.js` | 511 | 查找模式（/）。正则、高亮、PostFindMode | 🟢 | 中 |
| `mode.js` | 327 | **Mode 基类**。栈管理、退出钩子、单例、HUD 指示器 | 🔴 | 极高（基石） |
| `hud.js` | 278 | HUD 单例。消息转发、Tween 动画、剪贴板中转 | 🟡 | 中 |
| `ui_component.js` | 211 | UIComponent 基类。shadow DOM iframe + secret 握手通道 | 🔴 | 高 |
| `mode_key_handler.js` | 149 | **按键 trie 引擎**。多键序列匹配、count 前缀 | 🔴 | 极高 |
| `mode_insert.js` | 142 | 插入模式。焦点追踪、PassNextKey | 🟢 | 低 |
| `marks.js` | ~~138~~ | ~~跳转标记前端~~ **已删除** | — | |
| `vomnibar.js` | 95 | Vomnibar 薄包装。触发方法 → UIComponent.show | 🟢 | 低 |
| `vimium.css` | 283 | 注入网页的样式（hint marker、HUD、Vomnibar） | 🟡 | 中（CSS 类名勿改） |
| `file_urls.css` | 6 | file:// URL 的样式 | ⚪ | — |

## lib/（共享工具，1998 行）

| 文件 | 行 | 职责 | 标记 | 改动风险 |
|---|---|---|---|---|
| `dom_utils.js` | 572 | DOM 操作工具（点击模拟、元素检测、模拟事件） | 🟡 | 中 |
| `utils.js` | 413 | 通用工具（版本比较、事件分发、消息监听封装、SimpleCache） | 🔴 | 高（全局 Utils） |
| `settings.js` | 276 | **设置系统**。defaultOptions、storage 读写、迁移、prune | 🔴 | 极高（存储键勿改） |
| `handler_stack.js` | 172 | **事件栈**。bubbleEvent、返回值协议（passEventToPage 等） | 🔴 | 极高 |
| `keyboard_utils.js` | 154 | 按键解析（event → keyCharString）、平台检测、Escape 判定 | 🟡 | 中 |
| `url_utils.js` | 135 | URL 解析/转换工具 | 🟢 | 低 |
| `rect.js` | 113 | 矩形几何（元素可见性判定，link hints 用） | 🟢 | 低 |
| `find_mode_history.js` | 64 | 查找历史（跨页持久化） | 🟢 | 低 |
| `chrome_api_stubs.js` | 83 | chrome.* API 的 stub（测试用） | ⚪ | — |
| `types.js` | 16 | JSDoc 类型定义 | ⚪ | — |

## pages/（扩展页面，2249 行 JS + 2353 行 HTML/CSS）

| 文件 | 行 | 职责 | 标记 |
|---|---|---|---|
| `options.js` | 372 | 设置页逻辑（表单绑定、校验、备份恢复） | 🟢 |
| `keybindings.js` | 433 | **快捷键编辑器**（绑定模型、渲染、录制器、序列化） | 🟢 |
| `vomnibar_page.js` | 509 | Vomnibar iframe 控制器（输入、键盘导航、渲染） | 🟡 |
| `help_dialog_page.js` | 226 | 帮助对话框 iframe 控制器 | 🟢 |
| `hud_page.js` | 236 | HUD iframe 控制器（查找输入框、剪贴板） | 🟢 |
| `action.js` | 168 | 工具栏弹窗（显示当前页启用状态、快速排除） | 🟢 |
| `ui_component_messenger.js` | 71 | UIComponent 的 iframe 侧（postMessage 封装） | 🟡 |
| `command_listing.js` | 85 | 命令列表页（静态 HTML 生成） | ⚪ |
| `exclusion_rules_editor.js` | 69 | 排除规则编辑器组件 | 🟢 |
| `doc_search_completion.js` | 53 | 搜索补全文档页 | ⚪ |
| `all_content_scripts.js` | 27 | content scripts 的统一 import（给扩展页面用） | 🟡 |
| `options.css` | 455 | 设置页样式（myway 重做的现代化样式） | 🟢 |
| `keybindings.css` | 201 | 快捷键编辑器样式 | 🟢 |
| `vomnibar_page.css` | 194 | Vomnibar 样式 | 🟢 |
| `help_dialog_page.css` | 169 | 帮助对话框样式 | 🟢 |
| `command_listing.css` | 117 | 命令列表页样式 | ⚪ |
| `options.html` | 296 | 设置页结构 | 🟢 |
| `help_dialog_page.html` | 100 | 帮助对话框结构 | 🟢 |
| `action.html` | 101 | 工具栏弹窗结构 | 🟢 |
| `keybindings.html` | 61 | 快捷键编辑器结构 | 🟢 |

## build_scripts/（构建工具）

| 文件 | 职责 | npm script |
|---|---|---|
| `build.js` | 打包 3 个 store zip + dist/unpacked | `npm run build` |
| `check.js` | 静态校验（manifest、文件、品牌、绑定、字段、引擎往返） | `npm run check` |
| `smoke.js` | 无头浏览器运行时冒烟测试 | `npm run smoke` |
| `build_icons.js` | SVG → PNG 图标栅格化 | `npm run icons` |
| `capture_screenshots.js` | 无头截图（5 张 1280×800） | `npm run screenshots` |
| `build_store_assets.js` | 生成 store promo 图占位 | `npm run assets` |
| `finalize.js` | 上架前填入真实邮箱/网站/仓库 | `npm run finalize` |
| `rebrand_myway.js` | VimKeys → myway 品牌替换（历史脚本） | — |
| `rebrand.js` | Vimium → VimKeys 品牌替换（历史脚本） | — |

## store/（发布物料）

| 文件 | 内容 |
|---|---|
| `PUBLISHING.md` | 三商店上架逐步指南 |
| `UPLOAD_CHECKLIST.md` | 逐字段上传勾选清单 |
| `listing.md` | 商店文案（英 + 中） |
| `PRIVACY.md` | 隐私政策 |
| `PERMISSIONS.md` | 权限说明 |
| `SCREENSHOTS.md` | 截图指南 |
| `assets/` | promo 图（占位） |
| `screenshots/` | 真截图（5 张，myway 品牌） |

## 规模统计

| 层 | JS 行数 | 占比 |
|---|---|---|
| background_scripts | 2452 | 21% |
| content_scripts | 4792 | 42% |
| lib | 1998 | 17% |
| pages | 2194 | 19% |
| **合计** | **11436** | |

最大的 5 个文件：`link_hints.js`(1559)、`main.js`(945)、`completers.js`(908)、`mode_find.js`(510)、`vimium_frontend.js`(504)。

> 已精简（相对 Vimium 原始 ~14000 行减少 ~18%）：visual mode、marks、开发文档页已删除。

## 已精简的模块（历史记录）

以下模块已从代码库中删除，为后续功能腾出空间：

| 已删模块 | 原行数 | 删除原因 | 备注 |
|---|---|---|---|
| visual mode（mode_visual.js + v/V） | ~615 | 将以 Helix 式元素块选择器重新实现 | 计划重做 |
| marks（前后台 marks.js + m/`） | ~270 | 跳转标记非核心，普通用户极少用 | find/goBack 的 setPreviousPosition 调用已一并移除 |
| 开发文档页（reload + doc_search_completion） | ~170 | 开发专用，用户不可见 | |

## 还可进一步精简的候选

| 候选 | 行数 | 难度 | 副作用 |
|---|---|---|---|
| 搜索补全（search_engines.js + search_wrapper.js） | ~437 | 中 | 失去 Google/Wiki 自动补全建议；用户自定义引擎保留 |

**不建议删**：handler_stack.js、mode.js、mode_key_handler.js、settings.js、ui_component.js——删任何一个都会让整个引擎崩溃。
