# myway 架构总览

> 本文档是开发文档的入口。如果你想：**精简功能** → 看 [module-index.md](./module-index.md) 找到要删的模块；**扩展功能** → 看 [extending.md](./extending.md) 的 step-by-step；**理解按键如何变成动作** → 看 [key-dispatch.md](./key-dispatch.md)；**理解命令面板** → 看 [commands-and-completers.md](./commands-and-completers.md)。

## 一句话定位

myway 是一个 **键盘驱动的浏览器增强扩展**，源自 [Vimium](https://github.com/philc/vimium)（MIT）。它在每个网页注入一套 Vim 风格的按键系统，并提供一个 Vomnibar 命令面板。正在向"浏览器内 Raycast"演进。

## 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  扩展页面 (extension pages)                              │
│  options.html / keybindings.html / help_dialog_page     │
│  vomnibar_page.html / hud_page.html / action.html        │
│  这些页面跑在 iframe 或独立 tab 里，有自己的 JS            │
└───────────────▲───────────────────────────▲─────────────┘
                │ chrome.runtime.sendMessage │ UIComponent (postMessage + secret)
                │ / chrome.storage           │
┌───────────────┴─────────────┐ ┌───────────┴──────────────┐
│  background_scripts/        │ │  content_scripts/         │
│  service worker (MV3)       │ │  注入到每个网页            │
│                             │ │                            │
│  • 命令注册与分发             │ │  • Mode 栈 + 按键处理       │
│  • 标签页/书签/历史操作        │ │  • 链接提示 (link hints)   │
│  • 补全器 (completers)       │ │  • 滚动 / 查找 / 可视模式    │
│  • 设置持久化                 │ │  • HUD 显示                │
└───────────────▲─────────────┘ └───────────────▲──────────┘
                │                                  │
        ┌───────┴───────┐                  ┌───────┴───────┐
        │   lib/        │                  │   lib/        │
        │   共享工具      │                  │   共享工具      │
        │   (无 DOM 依赖) │                  │               │
        └───────────────┘                  └───────────────┘
```

**关键边界**：
- **content scripts** 跑在每个网页里，能操作 DOM、拦截按键。这是体验的核心。
- **background (service worker)** 跑在扩展进程里，有完整 `chrome.*` API 权限（tabs/bookmarks/history），但不能操作网页 DOM。
- **extension pages** 是扩展自己的 HTML 页面（设置页、Vomnibar iframe、HUD iframe），通过 `UIComponent`（postMessage + 密钥握手）或 `chrome.runtime.sendMessage` 与 content/background 通信。

## 数据流：一次按键的旅程

```
用户按下 'j'
  ↓
window keydown 事件 (vimium_frontend.js:227)
  ↓
handlerStack.bubbleEvent("keydown") (handler_stack.js:49)
  ↓ 从栈顶往下冒泡
NormalMode 的 onKeydown (mode_key_handler.js:60)
  ↓ 在按键 trie 里前进
handleKeyChar('j') (mode_key_handler.js:123)
  ↓ 命中叶子节点，command = "scrollDown"
commandHandler({command, count}) (mode_normal.js:33)
  ↓ 查路由表
NormalModeCommands.scrollDown(count) (mode_normal.js:99)
  ↓
Scroller.scrollBy(0, count * scrollStepSize)  → 页面滚动
```

详见 [key-dispatch.md](./key-dispatch.md)。

## 三个核心抽象

理解这三个抽象，就理解了整个代码库：

### 1. Mode 栈 (`mode.js` + `handler_stack.js`)
所有交互状态（normal/insert/find/visual/link-hints）都是 **Mode** 的实例，叠在一个全局栈上。每个 Mode 注册按键处理器；事件从栈顶往下冒泡，第一个感兴趣的 Mode 处理它。Mode 可以随时 push/pop（比如按 `f` 进入 link-hints mode，按 Esc 退出）。

### 2. 命令注册表 (`all_commands.js` + `commands.js`)
所有可执行的动作（scrollDown、nextTab、reload...）定义在 `all_commands.js` 的扁平数组里。`commands.js` 把用户的 keyMappings 文本解析成 `key → RegistryEntry` 映射，再编译成 trie 存入 `chrome.storage.session`，供前端 `NormalMode` 读取。

### 3. 补全器 (`completion/completers.js`)
Vomnibar（命令栏）的每类结果（书签/历史/标签页/命令/搜索引擎）由一个 Completer 类提供。`MultiCompleter` 把多个 Completer 组合起来，统一排序去重。加新的搜索源 = 写一个新 Completer 类。

## 设置与存储

| 存储位置 | 用途 | 谁读写 |
|---|---|---|
| `chrome.storage.local` | 用户设置（keyMappings、exclusions、linkHintCharacters...） | settings.js 封装；options.html 编辑 |
| `chrome.storage.session` | 运行时派生数据（normalModeKeyStateMapping、commandToOptionsToKeys、mapKeyRegistry、vimiumSecret） | background 写，content 读 |
| 内存 | Mode 栈、handler 栈、临时状态 | 各模块自管 |

设置项清单见 `lib/settings.js` 的 `defaultOptions` 对象（约 30 项）。

## 构建与发布

```
manifest.json          → Chrome / Edge (MV3 service worker)
manifest.firefox.json  → Firefox (MV3 background scripts + clipboard + gecko id)
build_scripts/
  build.js             → 打包 3 个 store zip + dist/unpacked
  check.js             → 静态校验（manifest、文件存在、品牌、绑定）
  smoke.js             → 无头浏览器运行时冒烟测试
  build_icons.js       → SVG → PNG 图标
  capture_screenshots.js → 无头截图
  finalize.js          → 上架前填入真实邮箱/网站
```

详见 [store/PUBLISHING.md](../store/PUBLISHING.md)。

## 与原版 Vimium 的差异

1. **品牌**：Vimium → myway（内部标识符如 `vimiumHintMarker` CSS 类保留，避免破坏用户设置）
2. **精简默认绑定**：移除 `<c-e>` `<c-y>` `<a-f>` `<a-p>` `<a-m>`（避免与浏览器/OS/编辑器冲突）
3. **重做 UI**：现代化 Options 页 + 全新可视化快捷键编辑器 (`pages/keybindings.*`)
4. **构建系统**：原版用 Deno + make.js；myway 用 Node + 自带 build_scripts（适配 Windows）
5. **已删除的功能模块**（为精简和后续重做）：
   - **visual mode**（v/V）— 计划以 Helix 式"自动选中页面元素块"选择器重新实现
   - **marks**（m/`）— 跳转标记，普通用户极少使用
   - **开发文档页**（reload + doc_search_completion）— 开发专用
   - 代码量从原版 ~14000 行精简至 ~11400 行（-18%）
