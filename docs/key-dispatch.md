# 按键分发流水线

> 从用户按下键，到动作执行，中间发生了什么。这是整个扩展最核心的逻辑。

## 全景图

```
┌──────────────────────────────────────────────────────────────┐
│ 浏览器 DOM                                                    │
│  window keydown 事件                                          │
└──────────┬───────────────────────────────────────────────────┘
           │ installListener (vimium_frontend.js:204)
           │ 检查: extension 未卸载? 当前 URL 已启用?
           ▼
┌──────────────────────────────────────────────────────────────┐
│ handlerStack.bubbleEvent("keydown", event)                    │
│ (handler_stack.js:49)                                         │
│                                                               │
│  从栈顶 → 栈底遍历每个 handler:                                  │
│    跳过已移除的 (id == null)                                     │
│    跳过没有 keydown 方法的                                       │
│    调用 handler.keydown(event)                                 │
│    根据返回值决定:                                                │
│      passEventToPage    → 停止冒泡，让页面看到按键 (return true) │
│      suppressPropagation → 停止冒泡，吃掉事件                     │
│      restartBubbling    → 从新栈顶重新冒泡                       │
│      continueBubbling   → 继续往下                              │
│      (falsy)            → 吃掉事件 + preventDefault             │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼ 栈顶通常是当前活跃的 Mode
┌──────────────────────────────────────────────────────────────┐
│ Mode 的 keydown 处理                                           │
│                                                               │
│  NormalMode / VisualMode → KeyHandlerMode.onKeydown           │
│  InsertMode              → 自己的逻辑（多数情况放行）             │
│  FindMode                → 转发到 HUD 输入框                    │
│  LinkHintsMode           → 匹配 hint 字符                      │
└──────────┬───────────────────────────────────────────────────┘
           │ (以 NormalMode 为例)
           ▼
┌──────────────────────────────────────────────────────────────┐
│ KeyHandlerMode.onKeydown (mode_key_handler.js:60)             │
│                                                               │
│  1. Escape + 有进度 → reset()                                  │
│  2. Escape + 帮助对话框开着 → 切换帮助                           │
│  3. Escape (其他) → 放行                                       │
│  4. 数字键 → 累加 countPrefix (如 99j = 滚动 99 次)             │
│  5. 已映射键 → handleKeyChar(keyChar)                          │
│  6. 其他 → reset() + 放行                                      │
└──────────┬───────────────────────────────────────────────────┘
           ▼
┌──────────────────────────────────────────────────────────────┐
│ handleKeyChar (mode_key_handler.js:123)                       │
│                                                               │
│  在按键 trie 里前进:                                            │
│    keyState = [{g: {g: scrollToTop, t: nextTab}, ...}]        │
│  按 'g' → keyState = [{g: scrollToTop, t: nextTab}]           │
│  再按 'g' → 命中叶子 command=scrollToTop                       │
│                                                               │
│  命中叶子时: commandHandler({command: registryEntry, count})   │
│  未命中叶子: 继续等待下一个键                                     │
│  完全无匹配: reset()                                            │
└──────────┬───────────────────────────────────────────────────┘
           ▼
┌──────────────────────────────────────────────────────────────┐
│ NormalMode.commandHandler (mode_normal.js:33)                 │
│                                                               │
│  1. 计算 count（用户前缀 × binding 内置 count × noRepeat 限制） │
│  2. 超过 repeatLimit → 弹确认                                   │
│  3. 路由分发:                                                   │
│     • registryEntry.topFrame  → 广播到顶层 frame 执行           │
│     • registryEntry.background → 发消息到 service worker 执行   │
│     • 其他 → 本地执行 NormalModeCommands[command](count)        │
└──────────────────────────────────────────────────────────────┘
```

## 按键 trie（核心数据结构）

用户的 keyMappings 文本（`map gg scrollToTop` / `map gt nextTab`）被 background 的 `Commands.installKeyStateMapping`（commands.js:336）编译成一个嵌套对象：

```js
// 存入 chrome.storage.session.normalModeKeyStateMapping
{
  "j": { "command": "scrollDown" },           // 单键
  "g": {                                      // 多键序列前缀
    "g": { "command": "scrollToTop" },        // gg
    "t": { "command": "nextTab" },            // gt
    "u": { "command": "goUp" },               // gu
    "U": { "command": "goToRoot" },           // gU
  },
  "<c-e>": { ... }  // （myway 已从默认移除，但用户仍可手动绑定）
}
```

前端的 `KeyHandlerMode` 持有一个 `keyState` **列表**（不是单个指针），表示在 trie 中的所有并行位置。这样用户按了 `g` 后，既可以继续按 `g`（完成 `gg`），也可以按 `j`（开始新的 `j` 命令）——trie 在 `handleKeyChar` 末尾会重新追加 `this.keyMapping` 实现"随时可以开始新序列"。

## count 前缀

按数字键会累加 `countPrefix`（mode_key_handler.js:77-80）。例如 `5j` = 向下滚动 5 次。count 传给 `commandHandler`，最终成为命令函数的第一个参数。

特殊规则（mode_normal.js:45-52）：
- `noRepeat: true` 的命令 → count 永远是 1
- 超过 `repeatLimit` → 弹 HUD 确认
- `closeTabsOnLeft/Right` → count 默认 0 而非 1

## Mode 栈详解

`Mode.modes`（mode.js:290）是所有活跃 Mode 的扁平列表。栈顶 = 最后构造的 Mode。

每个 Mode 在构造时通过 `handlerStack.push()` 注册一个 handler 记录，包含可选的 `keydown`/`keypress`/`keyup` 回调。Mode 退出时（`.exit()`）移除自己的 handler。

### Mode 的退出钩子

Mode 基类提供 5 个可选的"退出触发器"（mode.js:103-160），在构造时按需启用：

| 钩子 | 触发条件 | 典型用途 |
|---|---|---|
| `exitOnEscape` | 按 Esc | FindMode、LinkHints、HelpDialog |
| `exitOnBlur` | 焦点离开当前元素 | |
| `exitOnClick` | 鼠标点击页面 | LinkHints、FindMode |
| `exitOnFocus` | 焦点进入可编辑元素 | GrabBackFocus |
| `exitOnScroll` | 页面滚动 | |

### 单例 Mode

设置 `options.singleton` 的 Mode 会注册到 `Mode.singletons` 字典。再构造同名 Mode 时，旧的会自动 `.exit()`。例如 link-hints（`"link-hints-mode"`）、visual（`"visual-mode-group"`）。

## 跨 frame 通信

网页可能有多个 iframe。myway 的某些命令需要在特定 frame 执行：

| 场景 | 机制 |
|---|---|
| `topFrame` 命令（如 scrollToTop） | background 广播 `runInTopFrame`，只有顶层 frame 执行 |
| link hints | `HintCoordinator` 跨 frame 协议：所有 frame 上报各自的链接 → 合并 → 统一分配 hint 字符 |
| 滚动位置保存/恢复 | `getScrollPosition`/`setScrollPosition` 消息 |

link hints 的跨帧协议（link_hints.js:162-309）是最复杂的部分：每个 frame 收集本地可点击元素 → 发给 background → background 广播给所有 frame → 每个 frame 用全局视角渲染 hint。

## UIComponent（iframe 通道）

HUD、Vomnibar、帮助对话框不是直接在网页 DOM 里渲染的，而是装在 **shadow DOM 包裹的 iframe** 里（ui_component.js:57-64）。原因：
1. 页面 CSS 不会污染 myway 的 UI
2. 通过 `MessageChannel` + `vimiumSecret` 握手，防止恶意页面 JS 冒充

通信流程：
```
content script (HUD/Vomnibar 对象)
  → UIComponent.postMessage({name: "show", ...})
  → iframe 接收 (ui_component_messenger.js)
  → iframe 渲染
  → iframe 回传用户输入
  → content script 处理
```

## 调试技巧

在任意网页打开 DevTools，可以访问这些全局对象：
- `handlerStack.stack` — 看当前 Mode 栈
- `Mode.modes` — 看所有活跃 Mode
- `Settings._settings` — 看已加载的设置
- `NormalModeCommands` — 看命令实现表

在 `chrome://extensions` → service worker → Inspect 可调试 background。
