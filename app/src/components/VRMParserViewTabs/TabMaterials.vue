<template>
  <div class="tabContents tabMaterials" v-if="selectTabType == 'tab_materials'">
    <table class="table">
      <thead>
        <tr>
          <th>
            <p>Name</p>
            <p>Material</p>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(mat, i) in vrmMaterials" :key="i">
          <td class="tableDetail">
            <div class="material-header">
              <p class="material-name">{{ mat.name }}</p>
            </div>
            <table class="inner-table">
              <tbody>
                <!-- baseColor -->
                <tr v-if="mat.baseColorTexture && mat.baseColorTexture.img">
                  <td class="title">baseColor</td>
                  <td class="thumb-cell">
                    <div class="thumbnail-wrapper">
                      <img class="src_thumbnail" :src="mat.baseColorTexture.img.src" :alt="mat.baseColorTexture.img.name" />
                    </div>
                  </td>
                  <td class="btn-group-cell">
                    <p><button class="btn-action" @click="exportImage(mat.baseColorTexture.img)">{{ $t('exportImage') }}</button></p>
                    <p><button class="btn-action" @click="importImage(mat.baseColorTexture.img)">{{ $t('importImage') }}</button></p>
                  </td>
                </tr>

                <!-- normal -->
                <tr v-if="mat.normalTexture && mat.normalTexture.img">
                  <td class="title">normal</td>
                  <td class="thumb-cell">
                    <div class="thumbnail-wrapper">
                      <img class="src_thumbnail" :src="mat.normalTexture.img.src" :alt="mat.normalTexture.img.name" />
                    </div>
                  </td>
                  <td class="btn-group-cell">
                    <p><button class="btn-action" @click="exportImage(mat.normalTexture.img)">{{ $t('exportImage') }}</button></p>
                    <p><button class="btn-action" @click="importImage(mat.normalTexture.img)">{{ $t('importImage') }}</button></p>
                  </td>
                </tr>

                <!-- outline (設定済み) -->
                <tr v-if="mat.outlineTexture && mat.outlineTexture.img">
                  <td class="title">{{ $t('outline.title') }}</td>
                  <td class="thumb-cell">
                    <div class="thumbnail-wrapper">
                      <img class="src_thumbnail" :src="mat.outlineTexture.img.src" :alt="mat.outlineTexture.img.name" />
                    </div>
                  </td>
                  <td class="btn-group-cell">
                    <p><button class="btn-action" @click="exportImage(mat.outlineTexture.img)">{{ $t('exportImage') }}</button></p>
                    <p><button class="btn-action" @click="importImage(mat.outlineTexture.img)">{{ $t('importImage') }}</button></p>
                    <p><button class="btn-action btn-danger" @click="removeOutlineTexture(mat)">{{ $t('outline.removeBtn') }}</button></p>
                  </td>
                </tr>

                <!-- outline (未設定) -->
                <tr v-else>
                  <td class="title">{{ $t('outline.title') }}</td>
                  <td colspan="2" class="outline-add-cell">
                    <div class="outline-add-actions">
                      <button class="btn-add-outline" @click="addOutlineFromFile(mat)">
                        📁 {{ $t('outline.fromFile') }}
                      </button>
                      <button class="btn-add-outline" @click="openSelectModal(mat)">
                        🖼️ {{ $t('outline.fromExisting') }}
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- outline width (線の太さ) -->
                <tr class="outline-width-row">
                  <td class="title">{{ $t('outline.widthTitle') }}</td>
                  <td colspan="2" class="outline-width-cell">
                    <div class="slider-with-val">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        v-model.number="mat.outlineWidth"
                        @input="onOutlineWidthInput(mat)"
                        @change="onOutlineWidthChange(mat)"
                        class="range-slider"
                      />
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.01"
                        v-model.number="mat.outlineWidth"
                        @input="onOutlineWidthInput(mat)"
                        @change="onOutlineWidthChange(mat)"
                        class="number-input-mini"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 既存テクスチャ選択モーダル -->
    <div v-if="isSelectModalOpen" class="modal-overlay" @click.self="isSelectModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ $t('outline.selectModalTitle') }}</h3>
          <button class="btn-close" @click="isSelectModalOpen = false">✕</button>
        </div>
        <p class="modal-prompt">{{ $t('outline.selectPrompt') }}</p>
        <div class="texture-grid">
          <div
            v-for="(texImg, tIdx) in vrmImages"
            :key="tIdx"
            class="texture-card"
            @click="selectExistingTexture(texImg)"
          >
            <div class="card-thumb">
              <img :src="texImg.src" :alt="texImg.name" />
            </div>
            <p class="card-name" :title="texImg.name">{{ texImg.name }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component
export default class TabMaterials extends Vue {
  @Prop() drawVrm!: (file: File) => void
  @Prop() selectTabType!: string
  @Prop() vrmImages!: any[]

  vrmMaterials: any[] = []
  isSelectModalOpen = false
  targetMaterial: any = null

  mounted() {
    this.vrmMaterials = this.reloadVrmMaterials()
  }

  @Watch('selectTabType')
  private changeSelectTabType(newVal: string) {
    if (newVal === 'tab_materials') {
      this.vrmMaterials = this.reloadVrmMaterials()
    }
  }

  @Watch('vrmImages')
  private changeVrmImages() {
    this.vrmMaterials = this.reloadVrmMaterials()
  }

  reloadVrmMaterials(): any[] {
    const materials: any[] = []
    const images = VRMParser.images
    if (!VRMParser.json || !VRMParser.json.materials) return materials

    VRMParser.json.materials.forEach((elem: any, i: number) => {
      const outlineInfo = VRMParser.getMaterialOutlineTexture(i)
      materials.push({
        index: i,
        name: elem.name,
        normalTexture: {
          img: elem.normalTexture && typeof elem.normalTexture.index === 'number' ? images[elem.normalTexture.index] : null
        },
        baseColorTexture: {
          img: elem.pbrMetallicRoughness?.baseColorTexture && typeof elem.pbrMetallicRoughness.baseColorTexture.index === 'number'
            ? images[elem.pbrMetallicRoughness.baseColorTexture.index]
            : null
        },
        outlineTexture: outlineInfo ? {
          img: outlineInfo.img,
          textureIndex: outlineInfo.textureIndex
        } : null,
        outlineWidth: VRMParser.getMaterialOutlineWidth(i),
        outlineMode: VRMParser.getMaterialOutlineMode(i)
      })
    })

    return materials
  }

  // 更新後の共通処理（VRMファイル再生成、画像再パース、3Dビュー更新、マテリアル一覧更新）
  private async afterUpdate(): Promise<void> {
    try {
      const newFile = await VRMParser.createVRMFile()
      await new Promise<void>(resolve => {
        VRMParser.parse(newFile, (_json: any, images: any[]) => {
          this.vrmImages.splice(0, this.vrmImages.length)
          this.vrmImages.push(...images)
          resolve()
        })
      })

      if (this.drawVrm) {
        this.drawVrm(newFile)
      }

      this.vrmMaterials = this.reloadVrmMaterials()
    } catch (e) {
      console.error('Failed to update VRM after material change', e)
      alert('更新に失敗しました: ' + e)
    }
  }

  // 画像ファイル ダウンロード
  exportImage(img: any) {
    if (!img || !img.src) return
    const link = document.createElement('a')
    link.href = img.src
    link.download = img.name || 'texture.png'
    link.click()
  }

  // 画像ファイル差し替え
  importImage(img: any) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg'
    input.onchange = async (event: any) => {
      const file = event.currentTarget.files?.[0]
      if (!file) return

      const raw: ArrayBuffer = await file.arrayBuffer()
      try {
        await VRMParser.replaceImage(img, raw)
        await this.afterUpdate()
      } catch (e) {
        console.error('replaceImage error', e)
        alert('画像の差し替えに失敗しました: ' + e)
      }
    }
    input.click()
  }

  // ファイルから新規画像を登録してアウトラインテクスチャに追加
  addOutlineFromFile(mat: any) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg'
    input.onchange = async (event: any) => {
      const file = event.currentTarget.files?.[0]
      if (!file) return

      const raw: ArrayBuffer = await file.arrayBuffer()
      try {
        await VRMParser.setMaterialOutlineTextureFromFile(mat.index, raw, file.type, file.name)
        await this.afterUpdate()
      } catch (e) {
        console.error('addOutlineFromFile error', e)
        alert('アウトラインテクスチャの追加に失敗しました: ' + e)
      }
    }
    input.click()
  }

  // 既存テクスチャ選択モーダルを開く
  openSelectModal(mat: any) {
    this.targetMaterial = mat
    this.isSelectModalOpen = true
  }

  // 既存テクスチャを選択してアウトラインテクスチャに設定
  async selectExistingTexture(texImg: any) {
    if (!this.targetMaterial) return
    this.isSelectModalOpen = false

    const imageIdx = typeof texImg.imageIndex === 'number' ? texImg.imageIndex : texImg.index
    try {
      await VRMParser.setMaterialOutlineTextureFromExisting(this.targetMaterial.index, imageIdx)
      await this.afterUpdate()
    } catch (e) {
      console.error('selectExistingTexture error', e)
      alert('アウトラインテクスチャの割当に失敗しました: ' + e)
    } finally {
      this.targetMaterial = null
    }
  }

  // アウトラインテクスチャを削除
  async removeOutlineTexture(mat: any) {
    const confirmed = confirm(this.$t('outline.confirmRemove') as string)
    if (!confirmed) return

    try {
      await VRMParser.removeMaterialOutlineTexture(mat.index)
      await this.afterUpdate()
    } catch (e) {
      console.error('removeOutlineTexture error', e)
      alert('アウトラインテクスチャの削除に失敗しました: ' + e)
    }
  }

  // スライダー操作中のリアルタイムプレビュー
  onOutlineWidthInput(mat: any) {
    const width = typeof mat.outlineWidth === 'number' ? mat.outlineWidth : 0
    this.$emit('preview-material-outline-width', {
      materialIndex: mat.index,
      materialName: mat.name,
      width: width
    })
  }

  // スライダー操作完了時のデータ保存（チャンク再構築）
  async onOutlineWidthChange(mat: any) {
    const width = typeof mat.outlineWidth === 'number' ? mat.outlineWidth : 0
    try {
      await VRMParser.setMaterialOutlineWidth(mat.index, width)
      this.$emit('preview-material-outline-width', {
        materialIndex: mat.index,
        materialName: mat.name,
        width: width
      })
    } catch (e) {
      console.error('setMaterialOutlineWidth error', e)
      alert('アウトライン太さの更新に失敗しました: ' + e)
    }
  }
}
</script>

<style scoped lang="scss">
$primary: #0284c7;
$primary-dark: #0369a1;
$border-color: #cbd5e1;
$danger: #ef4444;
$danger-dark: #dc2626;

.table {
  margin: 0 auto;
  width: 100%;
  border-collapse: collapse;

  thead {
    background-color: lightslategray;
    color: #ffffff;
    height: 60px;

    th {
      padding: 6px 8px;
      text-align: left;
    }
  }

  tbody {
    .tableDetail {
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;

      .material-header {
        display: flex;
        align-items: center;
        margin: 0 0 8px 0;
        padding-bottom: 4px;
        border-bottom: 1px solid #f1f5f9;

        .material-name {
          margin: 0;
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
          text-align: left;
        }
      }

      .inner-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;

        tr {
          border-bottom: 1px dashed #f1f5f9;

          &:last-child {
            border-bottom: none;
          }
        }

        .title {
          width: 90px;
          font-weight: 600;
          font-size: 12px;
          color: #475569;
          vertical-align: middle;
          text-align: left;
          padding: 6px 4px;
        }

        .thumb-cell {
          width: 70px;
          padding: 4px 0;
        }

        .thumbnail-wrapper {
          width: 60px;
          height: 60px;
          min-width: 60px;
          min-height: 60px;
          background: #333333;
          border-radius: 4px;
          border: 1px solid $border-color;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;

          .src_thumbnail {
            display: block;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        }

        .btn-group-cell {
          padding-left: 12px;
          vertical-align: middle;
          text-align: right;
          padding-right: 4px;

          p {
            margin: 3px 0;
            display: flex;
            justify-content: flex-end;
          }

          .btn-action {
            width: 100px;
            padding: 3px 8px;
            font-size: 11px;
            cursor: pointer;
            border: 1px solid $border-color;
            background: #ffffff;
            border-radius: 3px;
            text-align: center;

            &:hover {
              background: #f1f5f9;
            }

            &.btn-danger {
              color: $danger;
              border-color: #fca5a5;

              &:hover {
                background: #fef2f2;
              }
            }
          }
        }

        .outline-add-cell {
          padding: 6px 0;
          vertical-align: middle;
          text-align: left;

          .outline-add-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-start;

            .btn-add-outline {
              padding: 5px 12px;
              font-size: 11px;
              cursor: pointer;
              background: #ffffff;
              border: 1px dashed $border-color;
              border-radius: 4px;
              color: #334155;
              display: flex;
              align-items: center;
              gap: 4px;
              transition: all 0.15s;

              &:hover {
                background: #f0f9ff;
                border-color: $primary;
                color: $primary;
              }
            }
          }
        }



        .outline-width-cell {
          padding: 6px 0;
          vertical-align: middle;
          text-align: left;

          .slider-with-val {
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 260px;

            .range-slider {
              flex: 1;
              cursor: pointer;
              accent-color: $primary;
            }

            .number-input-mini {
              width: 54px;
              padding: 2px 4px;
              border: 1px solid $border-color;
              border-radius: 4px;
              font-size: 12px;
              text-align: right;
              color: #334155;
            }
          }
        }
      }
    }
  }
}

// 既存テクスチャ選択モーダル
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;

  .modal-content {
    background: #ffffff;
    border-radius: 8px;
    width: 90vw;
    max-width: 520px;
    max-height: 80vh;
    padding: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      h3 {
        margin: 0;
        font-size: 15px;
        color: #0f172a;
      }

      .btn-close {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #64748b;

        &:hover {
          color: #0f172a;
        }
      }
    }

    .modal-prompt {
      margin: 0 0 12px 0;
      font-size: 12px;
      color: #64748b;
    }

    .texture-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
      overflow-y: auto;
      max-height: 60vh;
      padding: 4px;

      .texture-card {
        border: 1px solid $border-color;
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
        transition: all 0.15s;
        text-align: center;
        background: #f8fafc;

        &:hover {
          border-color: $primary;
          background: #f0f9ff;
          transform: translateY(-1px);
        }

        .card-thumb {
          width: 80px;
          height: 80px;
          margin: 0 auto 6px;
          background: #333333;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;

          img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        }

        .card-name {
          margin: 0;
          font-size: 11px;
          font-weight: 500;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }
}
</style>