# twitter-easy-block

　これはWeb版Twitterの機能を拡張するGreasemonkeyスクリプトで、以下のような
邪魔なtweetを画面から消し去ります。

1. 言語が中国語または韓国語である。
2. 中国でしか使われていない漢字を含んでいる。
3. 禁止されているユーザー名。（禁止名リストは同じくカスタマイズ不可）
4. 禁止語を含んでいる。（禁止語リストは現在ハードコーディングのためカスタマイズ不可）
5. 7つ以上のハッシュタグを含んでいる

　1,2,3の行為を一度でも行ったアカウントはBANNリストに入れて、以降はその人のTweet
を全て消し去ります。4と5については、３回までは該当ツイートのみを消しますが、
４回目を行うと同じくBANNリストにいれて以降はその人のTweetを全て消し去ります。

## 制限事項

1. 言語判別はTwitter側の判別結果を利用しています。そのせいか、たまに誤判定
   があります。(Twitterの言語設定を中国語にしている人だと思われる）
2. 禁止ユーザー名と禁止語は現在カスタマイズ不可です。
3. BANNリストもどこにも保存していないので、ブラウザのタブを閉じると消えます。
4. 埋め込みretweetは検査対象外です

## 今後やりたい事

1. 初見のアカウントはプロフィールと過去ツイートを確認してBANNリストに入れる機能。
2. 一定の条件を満たしたアカウントはAPIを通じてシステムレベルでブロックする機能。
3. 埋め込みretweetも検査する
4. 禁止tweetを一定数以上リツイートしたアカウントを自動的にBANNリストに入れる機能。
5. BANNリストの保存と信用できるユーザー同士の共有
6. 中国語漢字リストが厳しすぎるので、日本語の常用としてありえない漢字を全部省い
   てもいいかもしれない。
