# Angular & Oxc · Compiler Lab

同じ Angular コンポーネントを公式の AOT コンパイラ（ngc）と Oxc に渡し、生成コードと診断をブラウザで並べて読む小さなアプリです。この比較画面自体も、Angular CLI と Oxc + Vite のどちらでも動きます。

![Angular と Oxc のコンパイル結果を横に並べた画面](docs/comparison.png)

## 試す

Node.js 24.22.3 で確認しています。nvm を使っている場合は、クローンしたディレクトリで `nvm install` を実行すると `.nvmrc` のバージョンを利用できます。

```sh
git clone https://github.com/nagahara-naoki/oxc-angular-starter.git
cd oxc-angular-starter
npm ci
npm start
```

**Oxc + Vite** で起動した画面は <http://localhost:5173>。もう一つのターミナルで `npm run dev:angular` を実行すると、**Angular CLI の AOT** で同じ画面を <http://localhost:4200> に起動します。どちらの画面にも両コンパイラの比較結果が表示されます。ページ上部の「この画面のビルド」が、そのページを生成した側です。

## 二つの比較例

| 共通の入力 | Angular 22.2.4 | Oxc 0.0.45 |
| --- | --- | --- |
| [シグナルカウンター](fixtures/counter.ts) | コンパイル成功。クリックで値を更新 | コンパイル成功。同じ操作と表示を確認できる |
| [フェーズを省略したイベント](fixtures/missing-phase.ts) | `(@fade)` に対して `NG5002` | コンパイル成功。`ɵɵdomListener("fade", …)` を生成 |

正常例では、クリックを受ける命令と、シグナルの値をテキストに反映する命令を比較できます。イベントの例は不正な入力に対する診断の違いを確認するものです。このサンプルを `(@fade.done)` に変えて `npm run compare` を実行すると、両方が成功する対照実験になります。[関連する upstream Issue #726](https://github.com/voidzero-dev/oxc-angular-compiler/issues/726)

## 比較の仕組み

[比較スクリプト](scripts/compare.mjs) は同一ファイルを Angular の `@angular/compiler-cli` と `@oxc-angular/vite/api` に渡します。Oxc の対象 Angular バージョンには実際にインストールされた `@angular/core` の版を指定します。ブラウザの二つのパネルには、その実行で得たテンプレート関数かエラーを表示します。関数の表示には同一の TypeScript プリンターを使っています。

```sh
npm run compare       # 比較だけを再実行
npm run build:angular # 公式 CLI ビルド → dist/angular/browser/
npm run build:oxc     # Oxc + Vite ビルド → dist/oxc/
npm run build         # 比較を生成して両方をビルド
```

各入力の生の出力・診断は `.compiler-output/*.txt` に保存されます。Oxc API の出力は Vite が後続の変換をする前のコードです。画面データは `src/generated/comparison.json` に生成されます。サンプルを編集したら `npm run compare` で更新してください。依存のインストール後、起動・ビルドコマンドは比較データを自動生成します。

標準側の設定は [angular.json](angular.json)、Oxc 側は [vite.config.ts](vite.config.ts)、共通の起動処理は [src/main.ts](src/main.ts) にあります。CLI 側はテンプレートの型検査も行います。2種類の本番ビルドはバンドラーや最適化設定も異なるので、生成サイズや所要時間はコンパイラ単体のベンチマークには使えません。
