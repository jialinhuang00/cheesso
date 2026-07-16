# dist/ 裡有一半的檔案沒人用

v1.1.3 cleanup.

## 兩種人，兩個 build，一團混亂

npm 使用者跑 `import { Cheesso } from 'cheesso'`。走 tsc 產出的 `dist/index.js`。
CDN 使用者塞一個 `<script>` tag。走 webpack 產出的 `dist/cheesso-complete.js`。

問題出在 `complete.ts`。它是 webpack 的 entry point，把 core + UI 合併成一包再掛 `window.Cheesso`。但 tsc 不知道它只給 webpack 用，照樣編出 `dist/complete.js` 和 `dist/complete.d.ts`。兩邊都不需要這些檔案。

## Q: 為什麼不直接用 index.ts 當 webpack entry？

`index.ts` 只 export core。CDN 使用者要的是 core + UI 一次到位。如果把 UI 塞進 `index.ts`，npm 使用者就沒辦法只拿 core。所以需要一個獨立的合併入口。

## 改了什麼

| before | after | why |
|--------|-------|-----|
| `src/complete.ts` | `src/cdn-entry.ts` | 名字說清楚用途 |
| `cheesso-complete.js` | `cheesso.min.js` | CDN 標準命名 |
| tsc 編譯 cdn-entry | tsconfig exclude 它 | 不再產出沒人要的 .js/.d.ts |
| ts-loader 產 `.d.ts` | webpack 設 `declaration: false` | webpack 只需要 .js |

## release:patch 炸了

`npm run release:patch` 報 "Git working directory not clean"。

原因：`preversion` script 跑 `build:all` 重新編譯了 dist/，但只 `git add src/version.ts`。dist 的改動留在 working tree，`npm version` 看到 dirty state 就拒絕了。修法：`git add` 加上 `dist`。

## Cookie 少了 secure flag

`cross-domain.ts` 裡兩處 `document.cookie` 沒加 `; secure`。SSO cookie 存了 uid、email、displayName，走 HTTP 就會明文傳輸。

考慮過 localhost 要不要跳過。結論：不用。現代瀏覽器把 localhost 視為 secure context，加了也能正常設 cookie。條件判斷只會多一條 code path 沒人測。

## 9 個 any 怎麼來的

根源是 CustomEvent。`event.detail` 的型別是 `any`，一路傳染到 `emitAuthEvent`、`on()` callback、`currentSSOState`。

修法：定義 `CheessoEventMap`，把每個 event name 對應到正確型別，用 generic 串起來。

```ts
interface CheessoEventMap {
  'auth-changed': CheessoAuthState;
  'login-success': CheessoUser;
  'logout-success': null;
  'auth-error': Error;
}

on<K extends keyof CheessoEventMap>(eventType: K, callback: (data: CheessoEventMap[K]) => void): () => void
```

一開始試 method overloads，失敗了。原因：callback 參數是 contravariant。`(data: Error) => void` 無法 assignable to `(data: CheessoAuthState | CheessoUser | Error | null) => void`。Generic event map 繞過這個問題，因為每個 overload 的 callback 型別由 `K` 獨立決定。
