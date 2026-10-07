# 命令系统与 Vomnibar 补全器

> 这是"升级为浏览器内 Raycast"最相关的文档。理解了命令系统和补全器，就知道在哪里加新功能。

## 一、命令系统

### 命令的定义：`all_commands.js` (648 行)

所有命令定义在一个扁平数组里，顺序决定帮助对话框的显示顺序：

```js
{
  name: "scrollDown",          // 唯一标识，map/unmap 引用此名
  desc: "Scroll down",          // 帮助对话框 + : 命令面板的显示文字
  group: "navigation",          // 分组：navigation/vomnibar/find/history/tabs/misc
  // 以下可选:
  advanced: true,               // 高级命令，帮助对话框默认隐藏
  background: true,             // 需在 service worker 执行（有 chrome.* API）
  topFrame: true,               // 只在顶层 frame 执行
  noRepeat: true,               // 不接受 count 前缀
  repeatLimit: 20,              // count 超过此值时弹确认
  options: {                    // 命令支持的选项
    hard: "Reload without cache",  // flag 类型: reload hard
    position: "before|after",      // key=value 类型
    "(any url)": "...",            // 特殊：接受任意 URL 参数
  },
  details: "更详细的说明",       // 仅 command_listing 页面显示
}
```

### 命令的实现：分三处

命令定义在 `all_commands.js`，但**执行**取决于它的路由标记：

| 标记 | 实现位置 | 例子 |
|---|---|---|
| `background: true` | `background_scripts/main.js` 的 `BackgroundCommands` 对象 | reload、createTab、nextTab、removeTab |
| `topFrame: true` | 同上，但只顶层 frame 执行 | mainFrame |
| (都没有) | `content_scripts/mode_normal.js` 的 `NormalModeCommands` 对象 | scrollDown、enterInsertMode、Vomnibar.activate |

路由逻辑在 `mode_normal.js:62-75`。

### 命令的绑定：`commands.js` (502 行)

用户通过 `keyMappings` 设置文本绑定按键到命令：

```
map j scrollDown           # 基本绑定
map R reload hard          # 带 flag 选项
map z2 setZoom level=2     # 带 key=value 选项
map <c-e> scrollDown       # 带修饰键
unmap j                    # 解绑
unmapall                   # 清空全部
mapkey a b                 # 把按键 a 重映射到按键 b（字符级）
```

解析流程（`KeyMappingsParser.parse`, commands.js:67）：
1. 把 `defaultKeyMappings` 转成 `map` 行，与用户文本拼接
2. 逐行解析，构建 `keyToRegistryEntry`（key → RegistryEntry）
3. RegistryEntry 携带 `command`、`options`、`keySequence`

然后 `Commands.installKeyStateMapping`（commands.js:336）把 RegistryEntry 编译成 trie，存入 `chrome.storage.session.normalModeKeyStateMapping`，供前端 `NormalMode` 读取。

### 命令的默认绑定：`commands.js:409` `defaultKeyMappings`

myway 相对 Vimium 的改动：移除了 5 个冲突绑定。

| 按键 | 命令 | 状态 |
|---|---|---|
| `<c-e>` | scrollDown | **已移除**（与编辑器 caret 冲突） |
| `<c-y>` | scrollUp | **已移除** |
| `<a-f>` | LinkHints.activateModeWithQueue | **已移除** |
| `<a-p>` | togglePinTab | **已移除** |
| `<a-m>` | toggleMuteTab | **已移除** |

命令本身保留，用户可通过快捷键编辑器重新绑定。

## 二、Vomnibar（命令栏 / 未来 Raycast 面板）

### 双层结构

```
content_scripts/vomnibar.js  (95 行)
  → 薄包装。提供 Vomnibar.activate / activateBookmarks / activateCommandSelection 等方法
  → 每个方法只是设置 completer 名字 + 调用 UIComponent.show()
  → 加载 pages/vomnibar_page.html 到 iframe

pages/vomnibar_page.js  (509 行)
  → iframe 内的控制器。VomnibarUI 类
  → 处理输入、键盘导航（↑↓ Tab Enter）、渲染补全列表
  → 每次输入变化 → 发消息到 background → 拿回补全结果 → 渲染
```

### 触发方式与 completer

每个触发键绑定一个 completer（commands.js:452-460）：

| 键 | 命令 | completer | 说明 |
|---|---|---|---|
| `o` | Vomnibar.activate | `omni` | 万能搜索（书签+历史+标签+域名+搜索引擎） |
| `O` | Vomnibar.activateInNewTab | `omni` | 同上，新标签打开 |
| `T` | Vomnibar.activateTabSelection | `tabs` | 只搜标签页 |
| `b` | Vomnibar.activateBookmarks | `bookmarks` | 只搜书签 |
| `:` | Vomnibar.activateCommandSelection | `commands` | **命令面板**（未来 Raycast 入口） |
| `ge` | Vomnibar.activateEditUrl | `omni` | 编辑当前 URL |

唯一区别就是 `options.completer` 字段（vomnibar.js:10-67）。

## 三、补全器（Completers）

所有补全器在 `background_scripts/completion/completers.js` (908 行)。

### 补全器契约

```js
class SomeCompleter {
  filter({ queryTerms, query, ... }) → Promise<Suggestion[]>
  refresh()        // 可选：刷新底层数据
  cancel()         // 可选：放弃进行中的请求
  postProcessSuggestions(request, suggestions)  // 可选：后处理
}
```

### 现有补全器

| 类 | source 名 | 数据源 |
|---|---|---|
| `BookmarkCompleter` | (混入 omni + bookmarks) | chrome.bookmarks |
| `HistoryCompleter` | (混入 omni) | chrome.history |
| `DomainCompleter` | (混入 omni) | 历史 + 书签的域名去重 |
| `TabCompleter` | tabs (混入 omni) | chrome.tabs（所有窗口） |
| `SearchEngineCompleter` | (混入 omni) | 用户配置的搜索引擎 + 内置补全 |
| `CommandCompleter` | commands | all_commands + 用户绑定 |
| `MultiCompleter` | — | 聚合多个 Completer，统一排序去重 |

### MultiCompleter 的组装（main.js:45-64）

```js
completionSources = { bookmarks, commands, history, domains, tabs, searchEngines }

completers = {
  omni:      new MultiCompleter([bookmarks, history, domains, tabs, searchEngines]),
  bookmarks: new MultiCompleter([bookmarks]),
  commands:  new MultiCompleter([commands]),
  tabs:      new MultiCompleter([tabs]),
}
```

`omni` 是个"混合搜索"，把 5 个源的结果合并排序。**想让某类结果出现在 `o` 搜索里，就把它的 Completer 加进 omni 的数组**。

### Suggestion 对象（补全器与 UI 的契约）

```js
new Suggestion({
  queryTerms,              // 用于高亮匹配
  description: "command",  // 来源标签
  title: "Scroll down",    // 主标题
  url, shortUrl,           // URL 类结果
  insertText,              // 选中后替换输入框内容（搜索引擎用）
  autoSelect: true,        // 自动选中第一条
  deDuplicate: false,      // 是否去重
  command: { registryEntry, keys },  // 命令类结果专用
  relevancy,               // 排序权重
})
```

渲染时 `Suggestion.generateHtml()`（completers.js:77）有 3 个分支：自定义搜索、命令、URL。

### CommandCompleter 详解（completers.js:381）—— 未来 Raycast 的核心

这是 `:` 命令面板的补全器，当前实现：

1. 从 `chrome.storage.session` 读 `commandToOptionsToKeys`（命令 → 选项 → 按键 的映射）
2. 用 `ranking.matches(queryTerms, c.desc)` 过滤命令（**只匹配描述文字**）
3. 每个匹配的命令生成一个 Suggestion，包含 `command.registryEntry`

**当前局限**（升级 Raycast 要解决的）：
- 只匹配 `desc`，不匹配 `name` / `group` / 别名
- 空输入不显示全部（只有 TabCompleter 支持空输入）
- `:reload hard` 不能直接执行——`hard` 只是作为文字匹配 desc，不会被解析成选项

### 补全流程时序

```
用户在 Vomnibar 输入 "sc"
  ↓
vomnibar_page.js: onInput → update() → updateCompletions()
  ↓ 发消息
chrome.runtime.sendMessage({ handler: "filterCompletions", completerName, queryTerms })
  ↓
main.js:735  completers[completerName].filter(request)
  ↓
MultiCompleter 并发调用各子 Completer.filter()
  ↓ 排序、去重、截断（默认 10 条）
返回 Suggestion[]
  ↓
vomnibar_page.js: renderCompletions() 渲染 HTML
```

## 四、用户搜索引擎（自定义命令的雏形）

`background_scripts/user_search_engines.js` (53 行) 解析用户的 `searchEngines` 设置：

```
w: https://wikipedia.org/?search=%s  Wikipedia
g: https://google.com/search?q=%s    Google
```

在 `o` 搜索里输入 `w foo` → `MultiCompleter` 检测到首词 `w` 匹配某引擎 → 整个 query 路由给该引擎（completers.js:751-757）。这是**用户自定义命令的现有模型**——未来的 `userCommands` 功能可以仿照这个做。

## 五、升级为 Raycast 的扩展点速查

| 想做的事 | 改哪里 |
|---|---|
| `:` 命令面板空输入显示全部 | completers.js:745（把 commands 加入"空输入白名单"） |
| `:` 匹配命令名/分组/别名 | completers.js:406（扩展 matchingCommands 的 filter） |
| `:` 接受自由参数（`:reload hard`） | vomnibar_page.js:266 handleEnterKey + CommandCompleter.filter，复用 parseCommandOptions |
| 命令行加图标/分组色标 | completers.js:77 generateHtml 的 command 分支 + vomnibar_page.css |
| 加新的搜索源（如 closed tabs） | 写新 Completer 类 → 注册到 completionSources → 加入某 MultiCompleter |
| 加新的内置命令 | all_commands.js 加定义 + NormalModeCommands/BackgroundCommands 加实现 |
| 加用户自定义命令 | 仿 user_search_engines.js 写 user_commands.js + 新 Completer |
| 让某源出现在 `o` 混合搜索 | main.js:55 把 Completer 加进 omni 的数组 |
