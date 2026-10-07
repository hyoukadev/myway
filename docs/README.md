# myway 开发文档

> 面向想精简或扩展 myway 的开发者。所有文档用中文写，代码引用用英文。

## 从哪开始

| 我想... | 看这篇 |
|---|---|
| 建立全局认知 | [architecture.md](./architecture.md) |
| 理解按键如何变成动作 | [key-dispatch.md](./key-dispatch.md) |
| 理解命令面板 / Vomnibar / 补全器 | [commands-and-completers.md](./commands-and-completers.md) |
| 加新命令 / 加补全源 / 加 Mode | [extending.md](./extending.md) |
| 找某个文件是干嘛的 / 想删功能 | [module-index.md](./module-index.md) |

## 5 分钟速览

myway 源自 Vimium，三层架构：

1. **content scripts**（注入每个网页）——Mode 栈处理按键，链接提示，滚动，查找
2. **background service worker** ——命令分发，标签页/书签/历史操作，补全器
3. **extension pages**（设置页/Vomnibar/HUD）——UI，通过 postMessage 或 chrome.runtime 通信

三个核心抽象：
- **Mode 栈**：所有交互状态叠在栈上，事件从顶往下冒泡（`mode.js` + `handler_stack.js`）
- **命令注册表**：`all_commands.js` 定义所有命令，`commands.js` 把按键编译成 trie
- **补全器**：`completers.js` 里每类搜索结果一个类，`MultiCompleter` 聚合

## 文档维护原则

- 改了核心架构 → 同步改 architecture.md + key-dispatch.md
- 加/删命令 → 改 commands-and-completers.md + module-index.md 的行数
- 加/删文件 → 改 module-index.md
- 加新扩展场景 → 加到 extending.md
