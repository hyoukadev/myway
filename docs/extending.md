# 扩展指南

> 想加新功能？这里列出最常见的扩展场景，每个都有 step-by-step。**先看 [architecture.md](./architecture.md) 和 [module-index.md](./module-index.md) 建立全局认知。**

## 场景 1：添加一个新命令（最常见）

例如：加一个 `copyPageTitle` 命令（复制当前页面标题到剪贴板）。

### 步骤

1. **注册命令定义** — `background_scripts/all_commands.js`
   ```js
   {
     name: "copyPageTitle",
     desc: "Copy page title to clipboard",
     group: "misc",
     background: false,  // 在 content script 执行（要读 document.title）
   }
   ```
   加到数组末尾（或合适的位置，影响帮助对话框顺序）。

2. **实现命令** — 取决于路由标记：

   **情况 A：content script 命令**（`background` 未设）→ `content_scripts/mode_normal.js` 的 `NormalModeCommands`
   ```js
   copyPageTitle(count, { registryEntry }) {
     HUD.copyToClipboard(window.document.title);
     HUD.show(`Copied: ${window.document.title}`);
   },
   ```

   **情况 B：background 命令**（`background: true`）→ `background_scripts/main.js` 的 `BackgroundCommands`
   ```js
   async someBackgroundCommand(request) {
     const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
     // ... 用 chrome.* API
   },
   ```

3. **（可选）加默认绑定** — `background_scripts/commands.js` 的 `defaultKeyMappings`
   ```js
   "yp": "copyPageTitle",
   ```
   不加的话，命令仍可通过 `:` 面板或快捷键编辑器使用。

4. **验证**
   ```bash
   npm run check   # 确认命令注册无误（check.js 会验证默认配置可解析）
   npm run build
   npm run smoke
   ```
   手动测试：`chrome://extensions` 重载扩展 → 网页按 `:` → 输入 "copy page title" → 执行。

### 命令带选项

如果命令需要参数（如 `setZoom level=2`），在 `all_commands.js` 定义 `options`：

```js
{
  name: "setZoom",
  desc: "Set page zoom",
  group: "navigation",
  options: { level: "Zoom level (e.g. 1.5)" },
  background: true,
}
```

实现里通过 `request.registryEntry.options.level` 读取。用户绑定：`map z2 setZoom level=2`。

特殊：`options: { "(any url)": "..." }` 表示接受任意 URL 参数（如 `createTab`）。

## 场景 2：添加一个新的 Vomnibar 补全源

例如：加一个"最近关闭的标签页"搜索源。

### 步骤

1. **写 Completer 类** — `background_scripts/completion/completers.js`
   ```js
   export class ClosedTabCompleter {
     async refresh() {
       this.tabs = await chrome.sessions.getRecentlyClosed();
     }
     async filter({ queryTerms }) {
       if (queryTerms.length === 0) return [];
       return this.tabs
         .filter(t => ranking.matches(queryTerms, t.tab.title + " " + t.tab.url))
         .map(t => new Suggestion({
           queryTerms,
           description: "recently closed",
           title: t.tab.title,
           url: t.tab.url,
           relevancy: 1,
         }));
     }
   }
   ```

2. **注册** — `background_scripts/main.js:45-64`
   ```js
   const closedTabs = new ClosedTabCompleter();
   completionSources = { ..., closedTabs };
   // 加到 omni 混合搜索：
   completers.omni = new MultiCompleter([bookmarks, history, domains, tabs, searchEngines, closedTabs]);
   ```

3. **（可选）加专属触发键** — 如果想用单独的键打开（如 `rc`）：
   - `content_scripts/vomnibar.js` 加 `Vomnibar.activateClosedTabs` 方法
   - `commands.js` 加 `"rc": "Vomnibar.activateClosedTabs"` 到 defaultKeyMappings
   - `all_commands.js` 注册 `Vomnibar.activateClosedTabs` 命令

4. 验证同场景 1。

## 场景 3：添加一个新的 Mode

例如：加一个"阅读模式"（高亮当前段落，j/k 移动段落）。

### 步骤

1. **写 Mode 类** — `content_scripts/your_mode.js`
   ```js
   class ReadingMode extends Mode {
     init() {
       super.init({
         name: "reading-mode",
         indicator: "Reading mode",  // HUD 显示
         exitOnEscape: true,
         exitOnClick: true,
         keydown: (event) => KeyboardUtils.getKeyCharString(event) ? this.onKey(...) : null,
       });
       this.highlightCurrentParagraph();
     }
     onKey(key) {
       if (key === "j") this.nextParagraph();
       else if (key === "k") this.prevParagraph();
       // ...
     }
   }
   globalThis.ReadingMode = ReadingMode;
   ```

2. **加触发命令** — `all_commands.js` + `mode_normal.js`
   ```js
   // all_commands.js
   { name: "enterReadingMode", desc: "Enter reading mode", group: "misc" }

   // mode_normal.js NormalModeCommands
   enterReadingMode() { new ReadingMode().init(); }
   ```

3. **加到 manifest content_scripts.js 列表** — `manifest.json` + `manifest.firefox.json`

4. 验证。

### Mode 的能力

继承 `Mode` 或 `KeyHandlerMode` 自动获得：
- 按键处理（注册到 handlerStack）
- HUD 指示器
- 5 个退出钩子（exitOnEscape 等）
- 单例管理
- `onExit()` 清理回调

如果 Mode 要处理多键序列（如 `g` `g`），继承 `KeyHandlerMode` 并提供 `keyMapping` trie。

## 场景 4：修改 UI（Options / 快捷键编辑器 / Vomnibar）

### Options 页

- 结构：`pages/options.html`（卡片式分组）
- 逻辑：`pages/options.js`（设置读写、表单绑定、校验）
- 样式：`pages/options.css`（明暗主题、响应式）
- **加新设置项**：在 options.js 的 `options` 对象加声明 → options.html 加对应 `name="..."` 表单元素 → settings.js 的 `defaultOptions` 加默认值 → check.js 会验证字段齐全。

### 快捷键编辑器

- 结构：`pages/keybindings.html`
- 逻辑：`pages/keybindings.js`（绑定模型、渲染、录制器、序列化）
- 样式：`pages/keybindings.css`
- **改分组/显示**：keybindings.js 的 `GROUP_TITLES` / `GROUP_ORDER`。
- **改序列化格式**：`serialize()` 函数（当前用 `unmapall` + `map` 行）。

### Vomnibar

- iframe 控制器：`pages/vomnibar_page.js`（VomnibarUI 类）
- 样式：`pages/vomnibar_page.css`
- **改补全行渲染**：`background_scripts/completion/completers.js` 的 `Suggestion.generateHtml()`。
- **改键盘行为**：`vomnibar_page.js` 的 `onKeydown` / `handleEnterKey`。

## 场景 5：精简（删除功能）

### 删除一个命令

1. `all_commands.js` 删定义
2. `mode_normal.js` 删 NormalModeCommands 实现（或 main.js 的 BackgroundCommands）
3. `commands.js` 的 `defaultKeyMappings` 删绑定
4. 如果有测试，删 tests/unit_tests/ 相关用例
5. `npm run check` 确认无残留引用

### 删除一个完整功能模块

例如删掉 visual mode（节省 ~600 行）：

1. `manifest.json` + `manifest.firefox.json` 的 content_scripts.js 删 `mode_visual.js`
2. `pages/all_content_scripts.js` 删 import
3. `all_commands.js` 删 `enterVisualMode` / `enterVisualLineMode`
4. `commands.js` 删 `v` / `V` 默认绑定
5. `mode_normal.js` 删 NormalModeCommands 里的 enterVisual* 入口
6. 删 `content_scripts/mode_visual.js` 文件
7. `npm run check && npm run smoke` 确认不破坏

### 精简的风险点

- **别动 lib/handler_stack.js、lib/settings.js 的存储键、commands.js 的解析器**——这些是核心，动一个全盘崩。
- 删 CSS 类名（如 `vimiumHintMarker`）会让用户的自定义 CSS 失效。
- 删命令后，用户的 keyMappings 里引用该命令的行会报错（commands.js:109 会标记无效命令）。

## 场景 6：加用户自定义命令（Raycast 方向）

这是 `:` 面板升级的核心。设计草案：

```
# 用户在设置页配置（仿 searchEngines）
copy     copyCurrentUrl        Copy page URL
gh       openUrl https://github.com  Open GitHub
cl       closeTabsOnRight count=2  Close 2 right tabs
```

### 实现要点

1. **设置项**：`lib/settings.js` 加 `userCommands: ""` 默认值
2. **解析器**：新文件 `background_scripts/user_commands.js`，仿 `user_search_engines.js`，把文本解析成 `keyword → { command, options, description }` 映射
3. **补全器**：`UserCommandCompleter`，读用户命令映射，生成 Suggestion（`command` 字段动态构造 RegistryEntry）
4. **注册**：加入 `commands` 的 MultiCompleter，让用户命令出现在 `:` 面板
5. **设置页 UI**：options.html 加"Custom commands"卡片
6. **执行**：复用 `runNormalModeCommand` 路径——动态构造的 RegistryEntry 走正常的命令分发

关键：`RegistryEntry` 可以在运行时构造（不需要经过 map 绑定），`CommandCompleter` 已经在这么做了（completers.js:394-403 的 `createUnboundRegistryEntry`）。

## 测试

每个改动后跑：
```bash
npm run check    # 静态校验
npm run build    # 打包
npm run smoke    # 无头浏览器运行时测试
```

写新功能时建议加单元测试到 `tests/unit_tests/`（仿 `commands_test.js`），用 `#` shoulda 风格。
