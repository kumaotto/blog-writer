# Requirements Document

## Introduction

ブログ執筆補助アプリは、スマホで撮影した画像をシームレスにPCのマークダウンエディタに挿入し、WordPress（Jetpack Markdown）への入稿を効率化するローカルWebアプリケーションです。イベント会場などの外出先で、スマホからブラウザ経由で画像をアップロードし、PC上のエディタに自動的にマークダウン形式で挿入されることで、従来のSlack経由の手動ダウンロード作業を不要にします。

## Glossary

- **System**: ブログ執筆補助アプリケーション全体
- **Local Server**: PC上で動作するWebサーバー
- **Editor**: ブラウザベースのマークダウンエディタ
- **Mobile Upload Interface**: スマホのブラウザからアクセスする画像アップロード画面
- **S3**: Amazon S3ストレージサービス

- **Markdown File**: PC内に保存されるマークダウン形式のブログ記事ファイル
- **Image Gallery**: アップロードされた画像の一覧表示機能
- **Real-time Preview**: マークダウンのリアルタイムHTMLプレビュー表示
- **AWS Credentials**: AWS S3にアクセスするための認証情報（Access Key ID、Secret Access Key、Region、Bucket Name）
- **Configuration File**: ユーザーのAWS認証情報を保存するローカル設定ファイル
- **Article Tab**: Editor内で複数のMarkdown Fileを同時に開くためのタブ
- **Active Article**: 現在編集中のArticle Tab
- **Article ID**: 各記事に割り当てられる一意の識別子
- **QR Code Token**: スマホからの初回アクセス用の一時的な認証トークン
- **Session Token**: QRコードスキャン後に発行される長期間有効な認証トークン
- **QR Code**: スマホでスキャンしてMobile Upload Interfaceにアクセスするための二次元コード

## Requirements

### Requirement 1

**User Story:** ブログ執筆者として、スマホで撮影した画像をブラウザから簡単にアップロードし、PCのエディタに自動的に挿入されることで、画像転送の手間を省きたい

#### Acceptance Criteria

1. WHEN ユーザーが有効なSession Tokenを持ってMobile Upload Interfaceにアクセスする、THEN THE System SHALL 現在開いている全てのArticle Tabのリストを表示する
2. WHEN ユーザーがMobile Upload Interface内でArticle Tabを選択する、THEN THE System SHALL その記事を挿入先として設定する
3. WHEN ユーザーがMobile Upload Interfaceから画像ファイルを選択してアップロードボタンを押下する、THEN THE System SHALL その画像をS3にアップロードし、一意のファイル名を生成する
4. WHEN 画像のS3へのアップロードが完了する、THEN THE System SHALL S3の画像URLを含むマークダウン形式の画像タグを選択されたArticle Tabのカーソル位置に自動挿入する
5. WHEN 画像アップロードが失敗する、THEN THE System SHALL ユーザーに具体的なエラーメッセージを表示する
6. WHEN PC側でArticle Tabが一つも開かれていない、THEN THE System SHALL Mobile Upload Interfaceに「記事を開いてください」というメッセージを表示する

### Requirement 2

**User Story:** ブログ執筆者として、PC上でマークダウン形式でブログ記事を執筆し、リアルタイムでプレビューを確認しながら効率的に作業したい

#### Acceptance Criteria

1. WHEN ユーザーがActive Article内でマークダウンテキストを入力する、THEN THE System SHALL 入力内容をリアルタイムでHTMLプレビューに反映する
2. WHEN ユーザーがActive Articleに画像ファイルをドラッグ&ドロップする、THEN THE System SHALL その画像をS3にアップロードし、マークダウン形式の画像タグをドロップ位置に挿入する
3. WHEN ユーザーが既存のMarkdown Fileを開く操作を実行する、THEN THE System SHALL PC内のファイルシステムからファイルを読み込み、新しいArticle Tabを作成してEditorに内容を表示する
4. WHEN ユーザーがActive Articleで編集中のMarkdown Fileを保存する、THEN THE System SHALL PC内のファイルシステムに変更内容を書き込む
5. WHEN ユーザーが新規Markdown Fileを作成する、THEN THE System SHALL 空のArticle Tabを作成し、保存時にファイル名を指定できるようにする
6. WHEN ユーザーがArticle Tabをクリックする、THEN THE System SHALL そのタブをActive Articleに切り替える
7. WHEN ユーザーがArticle Tabの閉じるボタンを押下する、THEN THE System SHALL 未保存の変更がある場合は確認ダイアログを表示し、タブを閉じる
8. WHEN 複数のArticle Tabが開かれている、THEN THE System SHALL 各タブにファイル名とArticle IDを表示する

### Requirement 3

**User Story:** ブログ執筆者として、アップロードした画像を一覧で確認し、不要な画像を削除することで、ストレージを管理したい

#### Acceptance Criteria

1. WHEN ユーザーがImage Galleryを開く、THEN THE System SHALL S3にアップロードされた全画像のサムネイルとURLを一覧表示する
2. WHEN ユーザーがImage Gallery内の画像を選択して削除ボタンを押下する、THEN THE System SHALL S3から該当画像を削除し、一覧表示を更新する
3. WHEN ユーザーがImage Gallery内の画像URLをクリックする、THEN THE System SHALL そのURLをクリップボードにコピーする
4. WHEN ユーザーがImage Gallery内の画像をクリックする、THEN THE System SHALL 画像のフルサイズプレビューを表示する

### Requirement 4

**User Story:** ブログ執筆者として、PC上でLocal Serverを起動し、同じWi-Fi内のスマホからアクセスできるようにしたい

#### Acceptance Criteria

1. WHEN ユーザーがLocal Serverを起動する、THEN THE System SHALL PCのローカルネットワークIPアドレスとポート番号でHTTPサーバーを開始する
2. WHEN Local Serverが起動する、THEN THE System SHALL アクセス可能なURL（PC用とスマホ用）をコンソールに表示する
3. WHEN 同じWi-Fi内のデバイスがLocal ServerのURLにアクセスする、THEN THE System SHALL 適切なインターフェース（EditorまたはMobile Upload Interface）を提供する
4. WHEN ユーザーがLocal Serverを停止する、THEN THE System SHALL 全ての接続を適切にクローズし、リソースを解放する

### Requirement 5

**User Story:** ブログ執筆者として、完成したマークダウン記事をWordPress（Jetpack Markdown）にコピペで簡単に入稿したい

#### Acceptance Criteria

1. WHEN ユーザーがEditorでマークダウンテキストを全選択してコピーする、THEN THE System SHALL S3の画像URLを含むマークダウン形式のテキストをクリップボードにコピーする
2. WHEN ユーザーがコピーしたマークダウンをWordPressのJetpack Markdownエディタに貼り付ける、THEN THE System SHALL 画像が正しく表示されるマークダウン形式である
3. WHERE ユーザーがWordPress用のエクスポート機能を使用する、WHEN ユーザーがエクスポートボタンを押下する、THEN THE System SHALL Jetpack Markdown互換形式でMarkdown Fileの内容をクリップボードにコピーする

### Requirement 6

**User Story:** アプリケーション利用者として、初回起動時に自分のAWS認証情報を設定し、その後は自動的にS3にアクセスできるようにしたい

#### Acceptance Criteria

1. WHEN ユーザーが初回起動時にSystemにアクセスする、THEN THE System SHALL AWS Credentials入力画面を表示する
2. WHEN ユーザーがAWS Access Key ID、Secret Access Key、Region、Bucket Nameを入力して保存ボタンを押下する、THEN THE System SHALL 入力内容をConfiguration Fileに暗号化して保存する
3. WHEN AWS Credentialsの保存が完了する、THEN THE System SHALL 入力されたAWS Credentialsを使用してS3への接続テストを実行する
4. WHEN S3接続テストが成功する、THEN THE System SHALL ユーザーに成功メッセージを表示し、Editor画面に遷移する
5. WHEN S3接続テストが失敗する、THEN THE System SHALL ユーザーに具体的なエラーメッセージを表示し、AWS Credentials入力画面に留まる
6. WHEN ユーザーが設定画面からAWS Credentialsを変更する、THEN THE System SHALL 新しいAWS CredentialsをConfiguration Fileに保存し、S3接続を再確立する
7. WHEN Configuration Fileが存在する状態でSystemを起動する、THEN THE System SHALL Configuration FileからAWS Credentialsを読み込み、Editor画面を表示する

### Requirement 7

**User Story:** ブログ執筆者として、大規模な公共Wi-Fi環境でも安全にスマホからPCにアクセスし、画像をアップロードしたい

#### Acceptance Criteria

1. WHEN Local Serverが起動する、THEN THE System SHALL ランダムなQR Code Tokenを生成し、10分間の有効期限を設定する
2. WHEN Local Serverが起動する、THEN THE System SHALL QR Code Tokenを含むURLをQR Codeとして画面に表示する
3. WHEN ユーザーがスマホでQR Codeをスキャンしてアクセスする、THEN THE System SHALL QR Code Tokenを検証し、有効な場合はSession Tokenを発行する
4. WHEN Session Tokenが発行される、THEN THE System SHALL 24時間の有効期限を設定し、スマホのブラウザCookieに保存する
5. WHEN ユーザーがMobile Upload Interfaceで画像アップロードなどの操作を実行する、THEN THE System SHALL Session Tokenの有効期限を自動的に延長する
6. WHEN QR Code Tokenの有効期限が切れる、THEN THE System SHALL そのトークンを無効化し、新しいQR Codeの生成を要求する
7. WHEN Session Tokenの有効期限が切れる、THEN THE System SHALL スマホに再認証を要求し、新しいQR Codeのスキャンを促す
8. WHEN ユーザーがPC画面で「QRコード再生成」ボタンを押下する、THEN THE System SHALL 既存のQR Code Tokenを無効化し、新しいQR Codeを生成して表示する
9. WHEN 無効なトークンでMobile Upload Interfaceにアクセスする、THEN THE System SHALL エラーメッセージを表示し、QR Codeのスキャンを促す
10. WHEN Local ServerがHTTPS通信を提供する、THEN THE System SHALL 自己署名証明書を使用して通信を暗号化する


