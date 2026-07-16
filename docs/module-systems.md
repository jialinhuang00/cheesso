# JavaScript Module Systems: CJS, AMD, UMD, ESM

2009 年之前，JavaScript 沒有模組系統。所有東西丟進全域。一個 `<script>` 蓋掉另一個 `<script>` 的變數，沒人知道是誰幹的。

## CJS — 伺服器先動了

2009，Node.js 誕生。Ryan Dahl 需要一套方法讓檔案之間互相引用。他選了 CommonJS 規範。

```js
const fs = require('fs');
module.exports = { readConfig };
```

`require()` 是函式呼叫。執行期才跑。你可以塞在 `if` 裡面，可以用變數拼路徑。靈活，但沒人能在不執行的情況下知道一個檔案到底 export 了什麼。

CJS 解決了伺服器端的問題。瀏覽器端沒辦法用 — `require()` 是同步的，瀏覽器載檔案要發 HTTP request，同步等於凍結畫面。

## AMD — 瀏覽器的回應

2010，James Burke 寫了 RequireJS，實作 AMD（Asynchronous Module Definition）。

```js
define(['jquery', 'lodash'], function($, _) {
  return { init: function() { /* ... */ } };
});
```

非同步載入，不卡畫面。解決了瀏覽器的問題。但語法繁瑣，callback 包 callback。沒人喜歡寫 `define`。

而且生態分裂了。npm 上的套件用 CJS。瀏覽器套件用 AMD。同一份邏輯要寫兩次，或者選邊站。

## UMD — 膠水方案

兩邊都要支援怎麼辦？UMD（Universal Module Definition）出現了。

```js
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['dependency'], factory);        // AMD
  } else if (typeof module === 'object') {
    module.exports = factory(require('dependency')); // CJS
  } else {
    root.MyLib = factory(root.Dependency);  // 全域變數
  }
})(this, function(dep) {
  return { /* ... */ };
});
```

看執行環境決定用哪種格式。能跑，但沒人想手寫這段。它是妥協，不是解法。

到這裡，問題很清楚：JavaScript 需要一個**語言層級**的模組系統，不是 library 層級的 hack。

## ESM — 語言標準介入

2015，ES2015 (ES6) 規範加入了 `import` / `export`。

```js
import { readConfig } from './config.js';
export function start() { /* ... */ }
```

兩個根本性的改變：

1. **靜態結構**。`import` 和 `export` 必須寫在最上層，不能塞在 `if` 裡。Parser 光看語法就知道依賴關係，不用執行。
2. **語言原生**。不是函式呼叫，不是 library，是語法。引擎可以做最佳化。

但落地花了很久。Node.js 直到 2020 年（v12.17 起穩定支援）才正式啟用 ESM。中間五年，生態繼續跑在 CJS 上。

## Timeline

| 年份 | 事件 |
|------|------|
| 2009 | Node.js 採用 CommonJS |
| 2010 | RequireJS / AMD 出現 |
| 2011 | UMD pattern 流行 |
| 2015 | ES2015 規範定義 ESM 語法 |
| 2017 | 瀏覽器開始原生支援 `<script type="module">` |
| 2020 | Node.js 穩定支援 ESM（v12.17+） |
| 2024 | 主流套件開始 ESM-only 發佈（chalk, execa, etc.） |

AMD 和 UMD 的角色已經結束。今天的選擇只剩兩個：CJS 和 ESM。

---

## Zoom In: ESM vs CJS

### 核心差異

| | CJS | ESM |
|---|---|---|
| 載入時機 | 執行期（`require()` 跑到那行才載） | 解析期（引擎先掃完所有 import 再執行） |
| Export 結構 | 動態。`module.exports` 是物件，內容執行時決定 | 靜態。`export` 是語法宣告，parse 時確定 |
| Tree-shaking | 不行。Bundler 無法靜態判斷哪些 property 被用到 | 可以。未被 import 的 export 直接移除 |
| 頂層 await | 不支援 | 支援 |
| `this` | `this === module.exports` | `this === undefined` |
| 副檔名 | `.js`（預設）、`.cjs` | `.mjs`，或 `.js` + `"type": "module"` |

### 為什麼 tree-shaking 只在 ESM 有效

CJS：

```js
// utils.js
module.exports.add = (a, b) => a + b;
module.exports.multiply = (a, b) => a * b;

// app.js — 只用了 add
const { add } = require('./utils');
```

Bundler 看到 `require('./utils')` 回傳一個物件，`{ add }` 只是解構。但 `module.exports` 可能在任何地方被改過，bundler 不敢假設 `multiply` 沒被用。整包打進去。

ESM：

```js
// utils.js
export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b;

// app.js — 只用了 add
import { add } from './utils.js';
```

`multiply` 沒被任何檔案 import。Bundler 在 parse 階段就確認了這件事。直接刪掉。

### 互通：CJS 吃 ESM、ESM 吃 CJS

ESM 吃 CJS — 通常能動：

```js
import pkg from 'cjs-package'; // module.exports 變成 default export
import { named } from 'cjs-package'; // 有時行，看 bundler 的 interop
```

CJS 吃 ESM — 不能同步 require：

```js
const pkg = require('esm-package'); // ERR_REQUIRE_ESM
const pkg = await import('esm-package'); // 可以，但必須在 async context
```

這個不對稱是很多套件升 ESM-only 後使用者踩到的坑。

### Dual Package：同時出 CJS 和 ESM

`package.json` 的 `exports` 欄位讓一個套件同時提供兩種格式：

```json
"exports": {
  ".": {
    "import": "./dist/esm/index.js",
    "require": "./dist/index.js"
  }
}
```

Node.js 和 bundler 根據呼叫端的模組系統選條件。Bundler 看到 `import` 語法走 `"import"`，拿到 ESM，tree-shaking 生效。`require()` 走 `"require"`，拿到 CJS，整包吃。

### Tree-shaking 的兩個條件，缺一不可

光用 `import` 語法不夠。`"import"` 條件只是路由，決定載哪個檔案。Bundler 打開檔案一看是 `module.exports`，還是得整包吃。

Tree-shaking 生效需要兩件事同時成立：

1. 使用者用 `import` 語法（讓 bundler 走 `"import"` 條件）
2. `"import"` 指向的檔案是 ESM 格式（讓 bundler 能靜態分析）

| 使用者語法 | 拿到的格式 | Tree-shake |
|---|---|---|
| `import` | ESM | Yes |
| `import` | CJS | No — 條件走對了，但檔案格式不對 |
| `require()` | CJS | No |

改之前 cheesso 的 `"import"` 和 `"require"` 都指向同一份 CJS。Bundler 走了 `"import"` 條件，拿到的還是 CJS，shake 不動。改之後 `"import"` 指向 `dist/esm/index.js`，bundler 才真正拿到 ESM，該刪的刪。

這就是 cheesso v1.1.3 加 ESM output 的原因。CJS 留著保相容，ESM 讓 bundler 做該做的事。

---

## FAQ

### `await import()` 算 ESM 嗎？能 tree-shake 嗎？

語法上是 ESM，但不能 tree-shake。`await import()` 是動態的，路徑可以是變數：

```js
const mod = await import(`./plugins/${name}.js`); // 執行時才知道載什麼
```

Bundler 在 parse 階段無法確定你會用哪些 export，只能整包保留。Tree-shaking 需要靜態 `import`：

```js
import { Cheesso } from 'cheesso'; // parse 時確定，能 shake
```

### Node 會自己做 tree-shaking 嗎？

不會。Node 是 runtime，不是 bundler。`require('cheesso')` 載入檔案、執行、回傳 `module.exports`。沒有打包步驟，沒有移除未使用 export 的環節。每個檔案原封不動跑。

Tree-shaking 只發生在 bundler 把多個檔案合併成一個 bundle 的過程中。表格裡 Node 那幾列標 N/A，意思是「這個問題不適用」，不是「Node 自己會處理」。

### CJS 環境怎麼吃 ESM 套件？

`require()` 會炸 `ERR_REQUIRE_ESM`。唯一的路是 `await import()`：

```js
// app.cjs
async function main() {
  const { Cheesso } = await import('cheesso');
  const client = new Cheesso({ /* ... */ });
}
main();
```

這是 CJS 專案要用 ESM-only 套件時的唯一出路。缺點是必須包在 async function 裡。

### `"type"` 欄位有哪些值？

只有兩個：

| 值 | 效果 |
|---|---|
| `"commonjs"` | 預設。`.js` 當 CJS |
| `"module"` | `.js` 當 ESM |

想在同一個專案混用，靠副檔名覆蓋：`.cjs` 強制 CJS，`.mjs` 強制 ESM，不管 `"type"` 設什麼。
