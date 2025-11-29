# Implementation Plan

- [x] 1. プロジェクト構造とコア設定のセットアップ
  - TypeScriptプロジェクトの初期化（backend/frontend分離）
  - 必要な依存関係のインストール（Express, React, Vite, Socket.IO, AWS SDK, CodeMirror, marked, qrcode, keytar）
  - テストフレームワークのセットアップ（Jest, React Testing Library, Supertest）
  - 開発環境の設定（ESLint, Prettier, tsconfig）
  - _Requirements: 全体_

- [x] 2. バックエンド基盤の実装（TDD）
  - [x] 2.1 Express サーバーとHTTPS設定
    - Express サーバーの基本構造テストを作成
    - Express サーバーの基本構造を実装
    - HTTPS設定のテストを作成
    - 自己署名証明書の生成とHTTPS設定を実装
    - CORS設定のテストを作成
    - CORS設定（localhost制限）を実装
    - _Requirements: 4.1, 4.2, 7.10_
  
  - [x] 2.2 ConfigService実装（OS keychain統合）
    - ConfigServiceのテストを作成（keytar統合、保存・読み込み）
    - keytarライブラリの統合（macOS Keychain、Windows Credential Manager）
    - AWS認証情報のOS keychain保存機能を実装
    - OS keychainからの読み込み機能を実装
    - 設定存在確認機能を実装
    - 全データ削除機能（keychainエントリ削除）を実装
    - _Requirements: 6.2, 6.6, 6.7_
  
  - [x] 2.3 AuthService実装
    - AuthServiceのテストを作成（トークン生成・検証・期限切れ）
    - QRトークン生成機能（UUID v4、5分有効期限）を実装
    - セッショントークン発行機能（1時間有効期限）を実装
    - トークン検証・無効化機能を実装
    - メモリ内トークンストアを実装
    - _Requirements: 7.1, 7.3, 7.4, 7.6, 7.7, 7.8_
  
  - [x] 2.4 S3Service実装
    - S3Serviceのテストを作成（AWS SDKモック、アップロード・削除・一覧）
    - AWS SDK初期化を実装
    - 画像アップロード機能（一意のファイル名生成）を実装
    - 画像削除機能を実装
    - 画像一覧取得機能を実装
    - S3接続テスト機能を実装
    - _Requirements: 1.3, 1.4, 3.1, 3.2, 6.3, 6.4, 6.5_
  
  - [x] 2.5 FileService実装
    - FileServiceのテストを作成（ファイル読み書き、エラーハンドリング）
    - ローカルファイルシステムの読み込みを実装
    - ローカルファイルシステムへの書き込みを実装
    - 最近使用したファイルの一覧取得を実装
    - _Requirements: 2.3, 2.4_

- [x] 3. WebSocket通信の実装
  - [x] 3.1 Socket.IOサーバーセットアップ
    - Socket.IOサーバーの初期化
    - 認証ミドルウェア（セッショントークン検証）
    - 接続・切断ハンドリング
    - _Requirements: 1.4, 7.3_
  
  - [x] 3.2 WebSocketイベントハンドラ
    - 画像挿入イベント（スマホ→PC）
    - Article Tab一覧送信イベント（PC→スマホ）
    - Article Tab更新通知イベント
    - ハートビート（ping/pong）
    - _Requirements: 1.1, 1.2, 1.4_

- [x] 4. バックエンドAPIエンドポイントの実装
  - [x] 4.1 認証エンドポイント
    - `POST /api/auth/qr-token` - QRトークン生成
    - `POST /api/auth/session` - セッショントークン発行
    - `GET /api/auth/qr-code` - QRコード画像取得
    - _Requirements: 7.1, 7.2, 7.3, 7.8_
  
  - [x] 4.2 設定エンドポイント
    - `POST /api/config` - AWS認証情報保存
    - `GET /api/config/test` - S3接続テスト
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 4.3 画像管理エンドポイント
    - `POST /api/images/upload` - 画像アップロード
    - `GET /api/images` - 画像一覧取得
    - `DELETE /api/images/:key` - 画像削除
    - _Requirements: 1.3, 1.4, 1.5, 3.1, 3.2_
  
  - [x] 4.4 ファイル管理エンドポイント
    - `GET /api/files` - 最近使用したファイル一覧
    - `GET /api/files/:path` - ファイル読み込み
    - `POST /api/files` - ファイル保存
    - _Requirements: 2.3, 2.4_

- [ ] 5. フロントエンド基盤の実装（PC Editor）
  - [x] 5.1 React + Viteプロジェクトセットアップ
    - Viteプロジェクトの初期化
    - React Router設定
    - グローバルスタイル設定
    - _Requirements: 全体_
  
  - [x] 5.2 状態管理の実装
    - Article状態管理（useState/useReducer）
    - WebSocket接続管理
    - 認証状態管理
    - _Requirements: 2.1, 2.6, 2.8_
  
  - [x] 5.3 EditorLayoutコンポーネント
    - 全体レイアウト構造
    - Article Tab管理ロジック
    - QRコード表示エリア
    - _Requirements: 2.6, 2.8, 7.2_

- [x] 6. Article Tab機能の実装
  - [x] 6.1 ArticleTabBarコンポーネント
    - タブ表示UI
    - タブクリック処理（Active Article切り替え）
    - タブ閉じるボタン（未保存警告）
    - 新規タブ作成ボタン
    - _Requirements: 2.5, 2.6, 2.7, 2.8_
  
  - [x] 6.2 Article状態管理
    - Article追加・削除・更新ロジック
    - Active Article切り替えロジック
    - isDirtyフラグ管理
    - _Requirements: 2.4, 2.5, 2.7_

- [x] 7. マークダウンエディタの実装（TDD）
  - [x] 7.1 MarkdownEditorコンポーネント（CodeMirror統合）
    - MarkdownEditorのテストを作成（初期化、入力、カーソル位置）
    - CodeMirror 6の初期化を実装
    - マークダウンシンタックスハイライトを実装
    - カーソル位置管理を実装
    - _Requirements: 2.1_
  
  - [x] 7.2 画像ドラッグ&ドロップ機能
    - ドラッグ&ドロップのテストを作成
    - ドロップイベントハンドリングを実装
    - S3アップロード処理を実装
    - マークダウン画像タグ挿入を実装
    - _Requirements: 2.2_
  
  - [x] 7.3 自動保存機能
    - 自動保存のテストを作成（デバウンス、保存タイミング）
    - 5秒間操作なしで自動保存を実装
    - デバウンス処理を実装
    - 保存状態表示を実装
    - _Requirements: 2.4_
  
  - [x] 7.4 LocalStorageバックアップ
    - LocalStorageバックアップのテストを作成
    - 編集内容の自動バックアップを実装
    - ブラウザクラッシュ後の復元機能を実装
    - バックアップクリーンアップを実装
    - _Requirements: 2.4_

- [x] 8. マークダウンプレビューの実装
  - [x] 8.1 MarkdownPreviewコンポーネント
    - marked.jsによるマークダウンパース
    - HTMLレンダリング
    - リアルタイム更新（デバウンス300ms）
    - _Requirements: 2.1_
  
  - [x] 8.2 プレビュースタイリング
    - WordPress Jetpack Markdown互換スタイル
    - 画像表示最適化
    - コードブロックシンタックスハイライト
    - _Requirements: 5.2_

- [x] 9. QRコード表示機能の実装
  - [x] 9.1 QRCodeDisplayコンポーネント
    - QRコード画像表示
    - QRコード再生成ボタン
    - トークン有効期限表示
    - _Requirements: 7.2, 7.8_
  
  - [x] 9.2 QRコード生成ロジック
    - qrcodeライブラリ統合
    - トークン付きURL生成
    - QRコードDataURL生成
    - _Requirements: 7.1, 7.2_

- [x] 10. 画像ギャラリーの実装
  - [x] 10.1 ImageGalleryコンポーネント
    - 画像一覧表示（サムネイル）
    - 画像削除機能
    - 画像URLコピー機能
    - 画像フルサイズプレビュー
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 10.2 画像管理API連携
    - S3画像一覧取得
    - 画像削除処理
    - エラーハンドリング
    - _Requirements: 3.1, 3.2, 3.5_

- [x] 11. AWS設定画面の実装
  - [x] 11.1 ConfigModalコンポーネント
    - AWS認証情報入力フォーム
    - バリデーション
    - 保存ボタン（OS keychainに保存）
    - 全データ削除ボタン（keychainエントリ削除）
    - _Requirements: 6.1, 6.2_
  
  - [x] 11.2 初回起動フロー
    - OS keychain設定存在確認
    - AWS認証情報入力画面表示
    - S3接続テスト
    - OS keychainに保存
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.7_
  
  - [x] 11.3 2回目以降の起動フロー
    - OS keychainから認証情報を自動読み込み
    - Editor画面表示
    - _Requirements: 6.7_

- [x] 12. モバイルアップロード画面の実装
  - [x] 12.1 MobileUploadLayoutコンポーネント
    - モバイル最適化レイアウト
    - セッショントークン管理
    - 認証エラーハンドリング
    - _Requirements: 1.1, 7.3, 7.7, 7.9_
  
  - [x] 12.2 ArticleSelectorコンポーネント
    - Article Tab一覧表示
    - 記事選択UI
    - 選択状態管理
    - _Requirements: 1.1, 1.2, 1.6_
  
  - [x] 12.3 ImageUploaderコンポーネント
    - ファイル選択UI（モバイル最適化）
    - アップロード処理
    - プログレス表示
    - エラーメッセージ表示
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 13. WebSocket連携の実装
  - [x] 13.1 PC側WebSocketクライアント
    - Socket.IO接続
    - 画像挿入イベント受信
    - Article Tab一覧送信
    - 自動再接続
    - _Requirements: 1.4, 1.1_
  
  - [x] 13.2 スマホ側WebSocketクライアント
    - Socket.IO接続（セッショントークン付き）
    - Article Tab一覧受信
    - 画像アップロード完了通知
    - _Requirements: 1.1, 1.4_

- [x] 14. エラーハンドリングの実装
  - [x] 14.1 グローバルエラーハンドラ
    - エラー分類（認証、S3、ファイルシステム、WebSocket）
    - エラーメッセージ表示
    - リトライロジック（指数バックオフ）
    - _Requirements: 1.5, 3.5, 6.5, 7.9_
  
  - [x] 14.2 ネットワークエラー処理
    - オフライン検知
    - 自動再接続
    - ユーザー通知
    - _Requirements: 1.5_

- [x] 15. ファイル操作機能の実装
  - [x] 15.1 ファイル開く機能
    - ファイル選択ダイアログ
    - ファイル読み込み処理
    - 新規Article Tab作成
    - _Requirements: 2.3_
  
  - [x] 15.2 ファイル保存機能
    - 保存ダイアログ（新規ファイル時）
    - ファイル書き込み処理
    - 保存成功通知
    - _Requirements: 2.4, 2.5_
  
  - [x] 15.3 未保存警告機能
    - タブ閉じる時の警告
    - ブラウザ閉じる時の警告（beforeunload）
    - 保存確認ダイアログ
    - _Requirements: 2.7_

- [x] 16. WordPress連携機能の実装
  - [x] 16.1 マークダウンコピー機能
    - 全選択コピー処理
    - クリップボードAPI統合
    - _Requirements: 5.1_
  
  - [x] 16.2 エクスポート機能
    - Jetpack Markdown互換形式変換
    - エクスポートボタンUI
    - クリップボードコピー
    - _Requirements: 5.3_

- [x] 17. セキュリティ機能の強化
  - [x] 17.1 Rate Limiting実装
    - 画像アップロード制限（1分間10回）
    - QRコード生成制限（1分間5回）
    - _Requirements: 7.1, 7.8_
  
  - [x] 17.2 トークン管理の強化
    - サーバー再起動時の全トークン無効化
    - トークン有効期限の厳密な管理
    - メモリリーク防止
    - _Requirements: 7.1, 7.4, 7.6, 7.7_

- [x] 18. パフォーマンス最適化
  - [x] 18.1 マークダウンプレビュー最適化
    - デバウンス処理（300ms）
    - 差分レンダリング
    - _Requirements: 2.1_
  
  - [x] 18.2 画像アップロード最適化
    - 2MB以上の画像自動圧縮
    - プログレス表示
    - 並列アップロード（最大3枚）
    - _Requirements: 1.3, 1.4_

- [x] 19. サーバー起動・停止機能の実装
  - [x] 19.1 サーバー起動処理
    - ローカルIPアドレス取得
    - ポート番号設定
    - URL表示（PC用・スマホ用）
    - _Requirements: 4.1, 4.2_
  
  - [x] 19.2 サーバー停止処理
    - 接続クローズ
    - リソース解放
    - クリーンアップ
    - _Requirements: 4.4_

- [x] 20. 統合とテスト
  - [x] 20.1 フロントエンド・バックエンド統合
    - API連携確認
    - WebSocket通信確認
    - エラーハンドリング確認
    - _Requirements: 全体_
  
  - [x] 20.2 エンドツーエンドフロー確認
    - 初回起動→AWS設定→記事作成→画像アップロード→保存→WordPress入稿
    - QRコード認証フロー
    - 複数タブ操作
    - _Requirements: 全体_
  
  - [x] 20.3 セキュリティテスト
    - トークン期限切れシナリオ
    - 不正アクセス試行
    - HTTPS通信確認
    - _Requirements: 7.1, 7.3, 7.6, 7.7, 7.9, 7.10_
