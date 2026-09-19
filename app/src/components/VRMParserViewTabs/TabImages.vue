<template>
  <div class="tabContents tabImages" v-if="selectTabType == 'tab_images'">
    <!-- 上部アトラス化操作ツールバー -->
    <div class="images-toolbar">
      <div class="toolbar-left">
        <button type="button" class="btn-tool" @click="toggleSelectAll">
          {{ isAllSelected ? $t('atlas.deselectAll') : $t('atlas.selectAll') }}
        </button>
        <span class="selected-count-badge">
          {{ $t('atlas.selectedCount', { count: selectedImages.length }) }}
        </span>
      </div>

      <div class="toolbar-right">
        <button
          type="button"
          class="btn-atlas-open"
          :disabled="selectedImages.length < 2"
          @click="isAtlasModalOpen = true"
        >
          🗺️ {{ $t('atlas.createAtlasBtn') }}
        </button>
      </div>
    </div>

    <!-- テクスチャ一覧テーブル -->
    <table class="table">
      <thead>
        <tr>
          <th class="col-th-check">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              title="すべて選択/解除"
            />
          </th>
          <th>
            <p>Name</p>
            <p>Image</p>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(img, i) in vrmImages" :key="i" :class="{ 'row-selected': isSelected(img) }">
          <td class="col-td-check">
            <input
              type="checkbox"
              :checked="isSelected(img)"
              @change="toggleSelect(img)"
            />
          </td>
          <td class="tableDetail">
            <div class="img-header">
              <p class="img-name">{{ img.name }}</p>
              <span v-if="img.size <= 100" class="badge-placeholder">1x1 (アトラス化済)</span>
            </div>
            <div class="row-content">
              <div class="thumbnail-wrapper">
                <img class="src_thumbnail" :src="img.src" :alt="img.name" />
                <span v-if="img.size <= 100" class="thumbnail-placeholder-text">1x1</span>
              </div>
              <div class="btn-group">
                <button class="btn-action" @click="exportImage(img)">{{ $t('exportImage') }}</button>
                <button class="btn-action" @click="importImage(img)">{{ $t('importImage') }}</button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- アトラス化エディタモーダル -->
    <AtlasEditorModal
      :isOpen="isAtlasModalOpen"
      :selectedImages="selectedImages"
      :vrmVersion="vrmVersion"
      @close="isAtlasModalOpen = false"
      @apply-atlas="onApplyAtlas"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'
import AtlasEditorModal from './AtlasEditorModal.vue'

@Component({
  components: {
    AtlasEditorModal
  }
})
export default class TabImages extends Vue {
  @Prop() drawVrm!: (file: File) => void
  @Prop() selectTabType!: string
  @Prop() vrmImages!: any[]
  @Prop() vrmVersion!: any

  selectedImages: any[] = []
  isAtlasModalOpen = false

  get isAllSelected(): boolean {
    if (!this.vrmImages || this.vrmImages.length === 0) return false
    return this.selectedImages.length === this.vrmImages.length
  }

  isSelected(img: any): boolean {
    return this.selectedImages.some(i => i.index === img.index && i.name === img.name)
  }

  toggleSelect(img: any) {
    const idx = this.selectedImages.findIndex(i => i.index === img.index && i.name === img.name)
    if (idx !== -1) {
      this.selectedImages.splice(idx, 1)
    } else {
      this.selectedImages.push(img)
    }
  }

  toggleSelectAll() {
    if (this.isAllSelected) {
      this.selectedImages = []
    } else {
      this.selectedImages = [...this.vrmImages]
    }
  }

  // アトラス化実行
  async onApplyAtlas(data: { blob: Blob; items: any[] }) {
    this.isAtlasModalOpen = false

    try {
      // VRMParser でアトラス適用
      await VRMParser.applyTextureAtlas(data.blob, data.items)

      // VRMファイルを再生成
      const newFile = await VRMParser.createVRMFile()

      // 画像一覧を再パースして更新
      VRMParser.parse(newFile, (_json: any, images: any[]) => {
        this.vrmImages.splice(0, this.vrmImages.length)
        this.vrmImages.push(...images)
        this.selectedImages = []
      })

      // 3Dビュー描画を更新
      if (this.drawVrm) {
        this.drawVrm(newFile)
      }

      alert('アトラス化が正常に完了し、VRMモデルが更新されました！')
    } catch (e) {
      console.error('Failed to apply texture atlas', e)
      alert('アトラス化の適用に失敗しました: ' + e)
    }
  }

  // 画像ファイル ダウンロード
  exportImage(img: any) {
    const link = document.createElement('a')
    link.href = img.src
    link.download = img.name
    link.click()
  }

  // 画像ファイル差し替え
  importImage(img: any) {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (event: any) => {
      const file = event.currentTarget.files[0]
      if (!file) return

      const fileReader = new FileReader()
      fileReader.onload = (e: any) => {
        const raw: ArrayBuffer = e.currentTarget.result

        VRMParser.replaceImage(img, raw)
          .then(() => {
            VRMParser.createVRMFile()
              .then((newVrmFile: File) => {
                VRMParser.parse(newVrmFile, (_json: any, images: any[]) => {
                  this.vrmImages.splice(0, this.vrmImages.length)
                  this.vrmImages.push(...images)
                })

                if (this.drawVrm) {
                  this.drawVrm(newVrmFile)
                }
              })
              .catch(err => console.error('createVRMFile error', err))
          })
          .catch(err => console.error('replaceImage error', err))
      }
      fileReader.readAsArrayBuffer(file)
    }
    input.click()
  }
}
</script>

<style scoped lang="scss">
$primary: #0284c7;
$primary-dark: #0369a1;
$border-color: #cbd5e1;

.images-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f1f5f9;
  border-bottom: 1px solid $border-color;
  margin-bottom: 8px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .btn-tool {
      padding: 4px 10px;
      font-size: 12px;
      background: #ffffff;
      border: 1px solid $border-color;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background: #e2e8f0;
      }
    }

    .selected-count-badge {
      font-size: 12px;
      font-weight: 600;
      color: $primary;
      background: #e0f2fe;
      padding: 2px 8px;
      border-radius: 10px;
    }
  }

  .btn-atlas-open {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #ffffff;
    background: $primary;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover:not(:disabled) {
      background: $primary-dark;
    }

    &:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
    }
  }
}

.table {
  margin: 0 auto;
  width: 100%;
  border-collapse: collapse;

  thead {
    background-color: lightslategray;
    color: #ffffff;

    th {
      padding: 6px 8px;
      text-align: left;
    }

    .col-th-check {
      width: 36px;
      text-align: center;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #e2e8f0;
      transition: background 0.1s;

      &:hover {
        background-color: #f8fafc;
      }

      &.row-selected {
        background-color: #f0f9ff;
      }
    }

    .col-td-check {
      width: 36px;
      text-align: center;
      vertical-align: middle;

      input[type="checkbox"] {
        cursor: pointer;
        width: 16px;
        height: 16px;
      }
    }

    .tableDetail {
      padding: 8px;

      .img-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;

        .img-name {
          margin: 0;
          font-weight: 600;
          font-size: 13px;
        }

        .badge-placeholder {
          font-size: 10px;
          color: #64748b;
          background: #e2e8f0;
          padding: 1px 6px;
          border-radius: 4px;
        }
      }

      .row-content {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .thumbnail-wrapper {
          width: 70px;
          height: 70px;
          min-width: 70px;
          min-height: 70px;
          background: #333333;
          border-radius: 4px;
          border: 1px solid $border-color;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;

          .src_thumbnail {
            display: block;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          .thumbnail-placeholder-text {
            position: absolute;
            font-size: 10px;
            color: #94a3b8;
            font-weight: 600;
            pointer-events: none;
          }
        }

        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-left: auto;

          .btn-action {
            width: 100px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            border: 1px solid $border-color;
            background: #ffffff;
            border-radius: 3px;
            text-align: center;

            &:hover {
              background: #f1f5f9;
            }
          }
        }
      }
    }
  }
}
</style>
