<template>
  <div class="about">
    <div>
      <h2>特徴</h2>
      <p>すべての処理をブラウザ上で動く JavaScript で実装しました</p>
      <p>VRMファイルの流出の心配がない安全なしくみです</p>
      <h2>使い方</h2>
      <div class="how_to_use">
        <ol>
          <li>[VRMファイルを選択]をおしてVRMファイルを選択する</li>
          <li>VRMがビュワーに表示される</li>
          <li>画像ファイル一覧で色変更したい場所 [エクスポート] を押して 画像ファイルをダウンロードする</li>
          <li>ダウンロードした画像を 画像編集 アプリ等で加工する</li>
          <li>[インポート] を押して 加工した画像を選択する</li>
          <li>変更が反映された内容でVRMがビュワーが更新される</li>
          <li>[VRMファイルを出力] を押して変更後のVRMファイルをダウンロードする</li>
        </ol>      
      </div>
      <h2>リポジトリ</h2>
      <p><a href="https://github.com/cecil-tools/CopyTheAvatarSettings">VRMEditorTools</a></p>
      <h2>作った人</h2>
      <p><a href="https://twitter.com/t_furu">t_furu</a></p> 
      <h2>支援</h2>
      <p><a href="https://www.amazon.co.jp/hz/wishlist/ls/1U1BNCYHORFTC?ref_=wl_share">Amazonギフト券 500円を送る</a></p>
      <p>モチベーション維持,サーバ維持費になるのでお待ちしてます</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .how_to_use {
    width: 500px;
    margin: 0 auto;

    li {
      text-align: left;
    }
  }

  @media screen and (max-width: 767px) {
    .how_to_use {
      width: 300px;
    }
  }
</style>