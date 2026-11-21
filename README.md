# Angular & Oxc · Compiler Lab

同じ Angular コンポーネントを公式の AOT コンパイラ（ngc）と Oxc に渡し、生成コードと診断をブラウザで並べて読む小さなアプリです。この比較画面自体も、Angular CLI と Oxc + Vite のどちらでも動きます。

公開デモを開く　[Oxc + Vite 版](https://nagahara-naoki.github.io/oxc-angular-starter/) · [Angular CLI 版](https://nagahara-naoki.github.io/oxc-angular-starter/angular/)

![Angular CLI と Oxc + Vite のビルド時間を比較するグラフ](docs/comparison.png)

## 試す

Node.js 24.22.3 で確認しています。nvm を使っている場合は、クローンしたディレクトリで `nvm install` を実行すると `.nvmrc` のバージョンを利用できます。

```sh
git clone https://github.com/nagahara-naoki/oxc-angular-starter.git
cd oxc-angular-starter
npm ci
npm start
```

**Oxc + Vite** で起動した画面は <http://localhost:5173>。もう一つのターミナルで `npm run dev:angular` を実行すると、**Angular CLI の AOT** で同じ画面を <http://localhost:4200> に起動します。どちらの画面にも両コンパイラの比較結果が表示されます。ページ上部の「この画面のビルド」が、そのページを生成した側です。

## ビルド速度を比較する

[公開グラフ](https://nagahara-naoki.github.io/oxc-angular-starter/#benchmark)で「本番ビルド」と「単一コンポーネント」を切り替えられます。棒はゼロを起点にした同一目盛りで、各方式6回の中央値を示します。時間差の割合は `(Angular の中央値 − Oxc の中央値) / Angular の中央値` から求めています。計測環境と各回の値はグラフ下で確認できます。

| 範囲 | Angular | Oxc |
| --- | --- | --- |
| 本番ビルド | このアプリの `ng build` | 同じアプリの `vite build`。いずれも新しいプロセスの起動から出力完了まで |
| 単一コンポーネント | `counter.ts` を新しい TypeScript プログラムでコンパイル。型検査・ファイル読み込みを含む | 同じソースを読み込み済みの Oxc API に渡して単一ファイルを変換 |

`npm run benchmark` で再計測できます。各方式1回の予熱後、先に測る方式を交替させ、同じマシンで直列実行します。依存は共通でインストール済み。本番ビルドは空の出力・プロジェクトキャッシュで毎回開始し、OS のファイルキャッシュは保持します。ファイルの準備と比較データ生成は計測外です。

ローカルでは同梱の [計測結果](public/benchmark.json) を表示します。GitHub Pages ではデプロイごとに Actions ランナー上で再計測し、その両ビルドで同じ結果を表示します。小規模なこのアプリを対象にした値で、規模や型検査、バンドラーの違いが結果に影響します。[計測スクリプト](scripts/benchmark.mjs)

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
