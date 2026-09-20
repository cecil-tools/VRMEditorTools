<template>
  <div class="tabContents tabTextureColor" v-if="selectTabType === 'tab_texture_color'">
    <!-- 上部: テクスチャセレクタ（複数選択対応サムネイルリスト） -->
    <div class="texture-selector-bar">
      <div class="selector-header">
        <div class="header-left">
          <span class="selector-title">🖼️ {{ $t('textureColor.selectTexture') }}</span>
          <span class="selected-count-badge">
            {{ $t('textureColor.selectedCount', { count: selectedImages.length }) }}
          </span>
        </div>
        <div class="header-right">
          <button type="button" class="btn-tool-mini" @click="toggleSelectAll">
            {{ isAllSelected ? $t('textureColor.deselectAll') : $t('textureColor.selectAll') }}
          </button>
          <button
            type="button"
            class="btn-tool-mini"
            v-if="selectedImages.length > 0 && !isAllSelected"
            @click="deselectAll"
          >
            {{ $t('textureColor.deselectAll') }}
          </button>
          <button
            type="button"
            class="btn-tool-mini btn-toggle-simple"
            :class="{ active: isSimpleView }"
            @click="toggleSimpleView"
            :title="isSimpleView ? $t('textureColor.detailView') : $t('textureColor.simpleView')"
          >
            {{ isSimpleView ? '⚡ ' + $t('textureColor.simpleView') : '⚙️ ' + $t('textureColor.detailView') }}
          </button>
        </div>
      </div>

      <div class="texture-thumbnails-scroll">
        <div
          v-for="(img, idx) in vrmImages"
          :key="idx"
          class="texture-card"
          :class="{
            selected: isSelected(img),
            active: activeImage && isSameImage(activeImage, img)
          }"
          @click="onCardClick(img)"
        >
          <!-- チェックボックス（複数選択用） -->
          <div class="card-checkbox-wrapper" @click.stop="toggleSelectImage(img)">
            <input
              type="checkbox"
              :checked="isSelected(img)"
              @click.stop
              @change="toggleSelectImage(img)"
            />
          </div>

          <div class="thumb-box">
            <img :src="img.src" :alt="img.name" />
            <span v-if="activeImage && isSameImage(activeImage, img)" class="active-badge">
              {{ $t('textureColor.activePreview') }}
            </span>
          </div>
          <p class="thumb-name" :title="img.name">{{ img.name }}</p>
        </div>
      </div>
    </div>

    <!-- モバイル用ナビゲーション切り替えバー (幅768px以下で表示) -->
    <div class="mobile-nav-bar" v-if="activeImage">
      <div class="mobile-tab-group">
        <button
          type="button"
          class="mobile-tab-btn"
          :class="{ active: mobileActiveTab === 'adjust' }"
          @click="mobileActiveTab = 'adjust'"
        >
          🎨 {{ $t('textureColor.tabAdjust') }}
        </button>
        <button
          type="button"
          class="mobile-tab-btn"
          :class="{ active: mobileActiveTab === 'preview' }"
          @click="mobileActiveTab = 'preview'"
        >
          👁️ {{ $t('textureColor.tabPreview') }}
        </button>
      </div>
      <button
        type="button"
        class="btn-simple-toggle-mobile"
        :class="{ active: isSimpleView }"
        @click="toggleSimpleView"
      >
        {{ isSimpleView ? '⚡ ' + $t('textureColor.simpleView') : '⚙️ ' + $t('textureColor.detailView') }}
      </button>
    </div>

    <!-- メインエリア: コントロールパネル + プレビューパネル -->
    <div
      class="color-editor-main"
      v-if="activeImage"
      :class="{
        'mobile-show-adjust': mobileActiveTab === 'adjust',
        'mobile-show-preview': mobileActiveTab === 'preview'
      }"
    >
      <!-- 左側: 色調調整コントロールパネル -->
      <div class="controls-panel" :class="{ 'is-simple': isSimpleView }">
        <!-- 選択中テクスチャ情報 -->
        <div class="section-card texture-info-card" :class="{ 'compact-info': isSimpleView }">
          <div class="info-row">
            <span class="info-label">{{ $t('textureColor.selectedTextureInfo') }}:</span>
            <span class="info-value font-bold" :title="activeImage ? activeImage.name : ''">
              {{ activeImage ? activeImage.name : '' }}
              <span v-if="selectedImages.length > 1" class="multi-hint">
                (+ 他{{ selectedImages.length - 1 }}件)
              </span>
            </span>
          </div>
          <div class="info-grid" v-if="!isSimpleView">
            <div>
              <span class="info-label">{{ $t('textureColor.dimension') }}:</span>
              <span class="info-value">{{ imageNaturalWidth }} × {{ imageNaturalHeight }}</span>
            </div>
            <div>
              <span class="info-label">{{ $t('textureColor.fileSize') }}:</span>
              <span class="info-value">{{ activeImage ? formatFileSize(activeImage.size) : '0 B' }}</span>
            </div>
          </div>
          <div class="info-row" v-if="!isSimpleView && associatedMaterials.length > 0">
            <span class="info-label">{{ $t('textureColor.activeMaterials') }}:</span>
            <span class="info-tags">
              <span v-for="(matName, mIdx) in associatedMaterials" :key="mIdx" class="mat-tag">{{ matName }}</span>
            </span>
          </div>
        </div>

        <!-- プリセットボタン -->
        <div class="section-card presets-card">
          <label class="section-label">⚡ {{ $t('textureColor.presets') }}</label>
          <div class="preset-btn-group">
            <button type="button" class="btn-preset" @click="applyPreset('default')">{{ $t('textureColor.presetDefault') }}</button>
            <button type="button" class="btn-preset" @click="applyPreset('vivid')">{{ $t('textureColor.presetVivid') }}</button>
            <button type="button" class="btn-preset" @click="applyPreset('warm')">{{ $t('textureColor.presetWarm') }}</button>
            <button type="button" class="btn-preset" @click="applyPreset('cool')">{{ $t('textureColor.presetCool') }}</button>
            <button type="button" class="btn-preset" @click="applyPreset('grayscale')">{{ $t('textureColor.presetGrayscale') }}</button>
            <button type="button" class="btn-preset" @click="applyPreset('sepia')">{{ $t('textureColor.presetSepia') }}</button>
            <button type="button" class="btn-preset" @click="applyPreset('invert')">{{ $t('textureColor.presetInvert') }}</button>
          </div>
        </div>

        <!-- 色相環 (Color Wheel) : 詳細表示時またはシンプル表示で展開時 -->
        <div class="section-card color-wheel-card" v-if="!isSimpleView || showColorWheelInSimple">
          <div class="section-header-row">
            <label class="section-label">🎨 {{ $t('textureColor.colorWheelTitle') }}</label>
            <span class="wheel-degree">{{ hue >= 0 ? '+' : '' }}{{ hue }}°</span>
          </div>
          <div class="wheel-container">
            <canvas
              ref="colorWheelCanvas"
              width="180"
              height="180"
              class="wheel-canvas"
              @mousedown="startWheelDrag"
              @mousemove="onWheelDrag"
              @mouseup="stopWheelDrag"
              @mouseleave="stopWheelDrag"
              @touchstart="onTouchStartWheel"
              @touchmove="onTouchMoveWheel"
              @touchend="stopWheelDrag"
            ></canvas>
            <div class="wheel-center-info" :style="{ backgroundColor: getHueColor(hue) }">
              <span class="center-text">{{ hue }}°</span>
            </div>
          </div>
        </div>

        <!-- シンプル表示時の色相環アコーディオン開閉ボタン -->
        <div class="color-wheel-accordion-row" v-if="isSimpleView">
          <button
            type="button"
            class="btn-toggle-wheel-accordion"
            @click="toggleColorWheelInSimple"
          >
            {{ showColorWheelInSimple ? '▲ ' + $t('textureColor.hideColorWheel') : '▼ 🎨 ' + $t('textureColor.showColorWheel') }}
          </button>
        </div>

        <!-- 各種スライダー -->
        <div class="section-card sliders-card">
          <!-- 色相スライダー -->
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">{{ $t('textureColor.hue') }}</span>
              <div class="slider-val-box">
                <input type="number" min="-180" max="180" v-model.number="hue" @input="onParameterChange" class="num-input" />
                <span class="unit">°</span>
                <button type="button" class="btn-reset-param" @click="resetParam('hue')" title="Reset">↺</button>
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              v-model.number="hue"
              @input="onParameterChange"
              class="range-slider slider-hue"
            />
          </div>

          <!-- 彩度スライダー -->
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">{{ $t('textureColor.saturation') }}</span>
              <div class="slider-val-box">
                <input type="number" min="-100" max="100" v-model.number="saturation" @input="onParameterChange" class="num-input" />
                <span class="unit">%</span>
                <button type="button" class="btn-reset-param" @click="resetParam('saturation')" title="Reset">↺</button>
              </div>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              v-model.number="saturation"
              @input="onParameterChange"
              class="range-slider"
            />
          </div>

          <!-- 明度スライダー -->
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">{{ $t('textureColor.brightness') }}</span>
              <div class="slider-val-box">
                <input type="number" min="-100" max="100" v-model.number="brightness" @input="onParameterChange" class="num-input" />
                <span class="unit">%</span>
                <button type="button" class="btn-reset-param" @click="resetParam('brightness')" title="Reset">↺</button>
              </div>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              v-model.number="brightness"
              @input="onParameterChange"
              class="range-slider"
            />
          </div>

          <!-- コントラストスライダー -->
          <div class="slider-row">
            <div class="slider-header">
              <span class="slider-label">{{ $t('textureColor.contrast') }}</span>
              <div class="slider-val-box">
                <input type="number" min="-100" max="100" v-model.number="contrast" @input="onParameterChange" class="num-input" />
                <span class="unit">%</span>
                <button type="button" class="btn-reset-param" @click="resetParam('contrast')" title="Reset">↺</button>
              </div>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              v-model.number="contrast"
              @input="onParameterChange"
              class="range-slider"
            />
          </div>
        </div>

        <!-- カラー着色 / オーバーレイ -->
        <div class="section-card tint-card" :class="{ 'collapsed': isSimpleView && !enableTint }">
          <div class="section-header-row">
            <label class="toggle-container">
              <input type="checkbox" v-model="enableTint" @change="onParameterChange" />
              <span class="toggle-text">🌈 {{ $t('textureColor.tintTitle') }}</span>
            </label>
          </div>
          <div v-if="enableTint" class="tint-options">
            <div class="tint-row">
              <span class="sub-label">{{ $t('textureColor.tintColor') }}:</span>
              <input type="color" v-model="tintColor" @input="onParameterChange" class="color-picker-input" />
              <span class="color-hex">{{ tintColor }}</span>
            </div>
            <div class="tint-row">
              <span class="sub-label">{{ $t('textureColor.blendMode') }}:</span>
              <select v-model="tintBlendMode" @change="onParameterChange" class="select-input">
                <option value="multiply">{{ $t('textureColor.blendMultiply') }}</option>
                <option value="overlay">{{ $t('textureColor.blendOverlay') }}</option>
                <option value="colorize">{{ $t('textureColor.blendColorize') }}</option>
              </select>
            </div>
            <div class="tint-row">
              <span class="sub-label">{{ $t('textureColor.tintIntensity') }}:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                v-model.number="tintIntensity"
                @input="onParameterChange"
                class="range-slider mini-slider"
              />
              <span class="val-text">{{ tintIntensity }}%</span>
            </div>
          </div>
        </div>

        <!-- リアルタイム反映設定 & リセット -->
        <div class="section-card footer-card">
          <label class="toggle-container">
            <input type="checkbox" v-model="enable3DPreview" @change="onToggle3DPreview" />
            <span class="toggle-text">🌐 {{ $t('textureColor.realtimePreview') }}</span>
          </label>
          <button type="button" class="btn-reset-all" @click="confirmResetAll">
            ↺ {{ $t('textureColor.resetAll') }}
          </button>
        </div>
      </div>

      <!-- 右側: 2Dプレビュー & ビフォーアフター比較キャンバス -->
      <div class="preview-panel">
        <!-- プレビューツールバー -->
        <div class="preview-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-title">👁️ {{ $t('textureColor.previewTitle') }}</span>
            <label class="toggle-mini">
              <input type="checkbox" v-model="isSplitCompare" />
              <span>↔️ {{ $t('textureColor.splitCompare') }}</span>
            </label>
            <button
              type="button"
              class="btn-hold-compare"
              @mousedown="isHoldingCompare = true"
              @mouseup="isHoldingCompare = false"
              @mouseleave="isHoldingCompare = false"
              @touchstart="isHoldingCompare = true"
              @touchend="isHoldingCompare = false"
            >
              👀 {{ $t('textureColor.holdCompare') }}
            </button>
          </div>

          <div class="toolbar-right">
            <button type="button" class="btn-tool-mini" @click="zoomOut" title="Zoom Out">-</button>
            <span class="zoom-badge">{{ Math.round(zoom * 100) }}%</span>
            <button type="button" class="btn-tool-mini" @click="zoomIn" title="Zoom In">+</button>
            <button type="button" class="btn-tool-mini" @click="zoom100">{{ $t('textureColor.zoom100') }}</button>
            <button type="button" class="btn-tool-mini" @click="zoomFit">{{ $t('textureColor.zoomFit') }}</button>
          </div>
        </div>

        <!-- プレビュー表示エリア -->
        <div
          class="preview-canvas-viewport"
          ref="viewportRef"
          @mousedown="onViewportMouseDown"
          @wheel.prevent="onViewportWheel"
        >
          <div
            class="canvas-wrapper"
            :style="{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }"
          >
            <!-- 市松模様背景 -->
            <div
              class="checker-bg"
              :style="{ width: imageNaturalWidth + 'px', height: imageNaturalHeight + 'px' }"
            >
              <!-- 編集後画像キャンバス -->
              <canvas
                ref="adjustedCanvas"
                :width="imageNaturalWidth"
                :height="imageNaturalHeight"
                class="main-canvas"
                v-show="!isHoldingCompare"
              ></canvas>

              <!-- 元画像（長押し比較時またはスプリット比較用） -->
              <img
                v-if="activeImage"
                :src="activeImage.src"
                ref="originalImgRef"
                class="original-img"
                v-show="isHoldingCompare"
                :style="{ width: imageNaturalWidth + 'px', height: imageNaturalHeight + 'px' }"
                alt="Original"
              />

              <!-- スプリット比較オーバーレイ -->
              <div
                v-if="isSplitCompare && !isHoldingCompare && activeImage"
                class="split-overlay-container"
                :style="{ width: imageNaturalWidth + 'px', height: imageNaturalHeight + 'px' }"
              >
                <!-- 左側: 元画像クリップ -->
                <div
                  class="split-left-clip"
                  :style="{ width: splitPosition + '%' }"
                >
                  <img
                    :src="activeImage.src"
                    class="split-original-img"
                    :style="{ width: imageNaturalWidth + 'px', height: imageNaturalHeight + 'px' }"
                    alt="Original Split"
                  />
                  <span class="split-badge badge-left">Before</span>
                </div>
                <!-- 右側バッジ -->
                <span class="split-badge badge-right">After</span>

                <!-- スプリットバーハンドル -->
                <div
                  class="split-divider"
                  :style="{ left: splitPosition + '%' }"
                  @mousedown.stop="startSplitDrag"
                  @touchstart.stop="onTouchStartSplit"
                >
                  <div class="divider-line"></div>
                  <div class="divider-handle">↔</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 共通アクションバー（VRM適用・ダウンロード） -->
    <div class="common-actions-bar" v-if="activeImage">
      <div class="action-status">
        <span v-if="isApplying" class="status-loading">⏳ 適用中 ({{ appliedCount }}/{{ selectedImages.length }})...</span>
        <span v-else-if="selectedImages.length === 0" class="status-unsaved">
          ● 適用対象未選択 (0件選択中)
        </span>
        <span v-else-if="hasChanges" class="status-unsaved">
          ● 未適用の変更があります ({{ selectedImages.length }}件)
        </span>
        <span v-else class="status-saved">✓ 最新の状態です</span>
      </div>

      <div class="action-buttons">
        <button
          type="button"
          class="btn-action-sec"
          @click="downloadModifiedTexture"
          :disabled="!activeImage || isApplying"
        >
          💾 <span class="btn-text-full">{{ $t('textureColor.downloadTexture') }}</span><span class="btn-text-short">{{ $t('textureColor.downloadShort') }}</span>
        </button>
        <button
          type="button"
          class="btn-action-pri"
          @click="applyToVRM"
          :disabled="selectedImages.length === 0 || !hasChanges || isApplying"
        >
          ✨ <span class="btn-text-full">{{ selectedImages.length > 0 ? $t('textureColor.applyToSelected', { count: selectedImages.length }) : $t('textureColor.applyToVRM') }}</span><span class="btn-text-short">{{ $t('textureColor.applyShort', { count: selectedImages.length }) }}</span>
        </button>
      </div>
    </div>

    <!-- テクスチャ未選択時の案内 -->
    <div v-else class="no-texture-selected">
      <p>👈 {{ $t('textureColor.selectTexture') }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component
export default class TabTextureColor extends Vue {
  @Prop() selectTabType!: string
  @Prop() vrmImages!: any[]
  @Prop() drawVrm!: (file: File) => void
  @Prop() vrmVersion!: any
  @Prop() json!: any

  // 選択中テクスチャリスト（複数選択対応）
  selectedImages: any[] = []
  // メインプレビュー対象テクスチャ
  activeImage: any = null
  loadedImageElement: HTMLImageElement | null = null
  imageNaturalWidth = 512
  imageNaturalHeight = 512

  // モバイル & シンプル表示
  isMobile = false
  isSimpleView = true // 基本をシンプル表示
  mobileActiveTab: 'adjust' | 'preview' = 'adjust'
  showColorWheelInSimple = false

  // 画像キャッシュ（複数選択時の処理用）
  private imageElementsCache: Map<string, HTMLImageElement> = new Map()

  // 色調補正パラメータ
  hue = 0             // -180 ~ 180 (度)
  saturation = 0      // -100 ~ 100 (%)
  brightness = 0      // -100 ~ 100 (%)
  contrast = 0        // -100 ~ 100 (%)

  // カラー着色 / オーバーレイ
  enableTint = false
  tintColor = '#3b82f6'
  tintIntensity = 50  // 0 ~ 100 (%)
  tintBlendMode: 'multiply' | 'overlay' | 'colorize' = 'multiply'

  // オプション
  enable3DPreview = true
  isSplitCompare = true
  splitPosition = 50  // %
  isHoldingCompare = false
  isApplying = false
  appliedCount = 0

  // ズーム & パン
  zoom = 1.0
  panX = 0
  panY = 0
  isPanning = false
  panStartX = 0
  panStartY = 0

  // ドラッグ状態
  isDraggingWheel = false
  isDraggingSplit = false

  // 変更フラグ
  hasChanges = false

  // 処理最適化用のタイマー/raf
  private animationFrameId: number | null = null
  private preview3DTimeout: any = null

  toggleSimpleView() {
    this.isSimpleView = !this.isSimpleView
    if (!this.isSimpleView) {
      this.$nextTick(() => {
        this.drawColorWheel()
      })
    }
  }

  toggleColorWheelInSimple() {
    this.showColorWheelInSimple = !this.showColorWheelInSimple
    if (this.showColorWheelInSimple) {
      this.$nextTick(() => {
        this.drawColorWheel()
      })
    }
  }

  checkMobile() {
    if (typeof window !== 'undefined') {
      this.isMobile = window.innerWidth <= 768
    }
  }

  private onWindowResize = () => {
    this.checkMobile()
  }

  private onWindowTouchMove = (e: TouchEvent) => {
    if (this.isDraggingSplit && e.touches.length > 0) {
      const vp = this.$refs.viewportRef as HTMLElement
      if (!vp) return
      const rect = vp.getBoundingClientRect()
      const currentCanvasLeft = rect.left + this.panX
      const currentCanvasWidth = this.imageNaturalWidth * this.zoom
      const relativeX = e.touches[0].clientX - currentCanvasLeft
      const percent = Math.min(100, Math.max(0, (relativeX / currentCanvasWidth) * 100))
      this.splitPosition = Math.round(percent)
    }
  }

  private onWindowTouchEnd = () => {
    this.isDraggingSplit = false
  }

  get isAllSelected(): boolean {
    if (!this.vrmImages || this.vrmImages.length === 0) return false
    return this.selectedImages.length === this.vrmImages.length
  }

  isSelected(img: any): boolean {
    return this.selectedImages.some(i => this.isSameImage(i, img))
  }

  isSameImage(a: any, b: any): boolean {
    if (!a || !b) return false
    if (typeof a.imageIndex === 'number' && typeof b.imageIndex === 'number') {
      return a.imageIndex === b.imageIndex
    }
    return a.index === b.index && a.name === b.name
  }

  get associatedMaterials(): string[] {
    if (!this.activeImage || !VRMParser.json?.materials) return []
    const imgIdx = typeof this.activeImage.imageIndex === 'number'
      ? this.activeImage.imageIndex
      : this.activeImage.index

    const matchedMaterials: string[] = []
    const textures = VRMParser.json.textures || []

    // VRM 0.x / 1.0 のマテリアルを走査
    VRMParser.json.materials.forEach((mat: any) => {
      let isReferenced = false

      // glTF 2.0 pbrMetallicRoughness
      const baseTex = mat.pbrMetallicRoughness?.baseColorTexture?.index
      if (typeof baseTex === 'number' && textures[baseTex]?.source === imgIdx) {
        isReferenced = true
      }

      // VRM 0.x VRM.materialProperties
      if (!isReferenced && mat.textureProperties) {
        Object.values(mat.textureProperties).forEach((texIdx: any) => {
          if (textures[texIdx]?.source === imgIdx) isReferenced = true
        })
      }

      if (isReferenced && mat.name) {
        matchedMaterials.push(mat.name)
      }
    })

    return Array.from(new Set(matchedMaterials))
  }

  mounted() {
    this.checkMobile()
    this.$nextTick(() => {
      this.drawColorWheel()
      if (this.vrmImages && this.vrmImages.length > 0 && this.selectedImages.length === 0) {
        this.selectSingleImage(this.vrmImages[0])
      }
    })

    window.addEventListener('resize', this.onWindowResize)
    window.addEventListener('mousemove', this.onWindowMouseMove)
    window.addEventListener('mouseup', this.onWindowMouseUp)
    window.addEventListener('touchmove', this.onWindowTouchMove, { passive: true })
    window.addEventListener('touchend', this.onWindowTouchEnd)
  }

  beforeDestroy() {
    window.removeEventListener('resize', this.onWindowResize)
    window.removeEventListener('mousemove', this.onWindowMouseMove)
    window.removeEventListener('mouseup', this.onWindowMouseUp)
    window.removeEventListener('touchmove', this.onWindowTouchMove)
    window.removeEventListener('touchend', this.onWindowTouchEnd)
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    // 3Dプレビューを元に戻す
    this.$emit('reset-texture-preview')
  }

  @Watch('vrmImages')
  onVrmImagesChange(newVal: any[]) {
    if (newVal && newVal.length > 0) {
      // 既存の選択が有効か確認
      const validSelected = this.selectedImages.filter(sel =>
        newVal.some(img => this.isSameImage(sel, img))
      )
      if (validSelected.length > 0) {
        this.selectedImages = validSelected
        if (!this.activeImage || !newVal.some(img => this.isSameImage(this.activeImage, img))) {
          this.setActiveImage(this.selectedImages[0])
        }
      } else {
        this.selectSingleImage(newVal[0])
      }
    } else {
      this.selectedImages = []
      this.activeImage = null
      this.loadedImageElement = null
    }
  }

  @Watch('selectTabType')
  onSelectTabType(newTab: string) {
    if (newTab === 'tab_texture_color') {
      this.$nextTick(() => {
        this.drawColorWheel()
        if (this.selectedImages.length === 0 && this.vrmImages && this.vrmImages.length > 0) {
          this.selectSingleImage(this.vrmImages[0])
        } else if (this.activeImage) {
          this.renderAdjustedImage()
          if (this.enable3DPreview && this.hasChanges) {
            this.send3DPreview()
          }
        }
      })
    }
  }

  // カードクリック時
  onCardClick(img: any) {
    this.setActiveImage(img)
    if (!this.isSelected(img)) {
      this.selectedImages.push(img)
    }
  }

  // 単一画像を選択してアクティブにする
  selectSingleImage(img: any) {
    this.selectedImages = [img]
    this.setActiveImage(img)
  }

  // チェックボックストグル
  toggleSelectImage(img: any) {
    const idx = this.selectedImages.findIndex(i => this.isSameImage(i, img))
    if (idx !== -1) {
      this.selectedImages.splice(idx, 1)
    } else {
      this.selectedImages.push(img)
      if (!this.activeImage) {
        this.setActiveImage(img)
      }
    }

    if (this.enable3DPreview && this.hasChanges) {
      this.schedule3DPreview()
    }
  }

  // 全て選択 / 選択解除
  toggleSelectAll() {
    if (this.isAllSelected) {
      this.selectedImages = []
    } else {
      this.selectedImages = [...this.vrmImages]
      if (!this.activeImage && this.selectedImages.length > 0) {
        this.setActiveImage(this.selectedImages[0])
      }
    }

    if (this.enable3DPreview && this.hasChanges) {
      this.schedule3DPreview()
    }
  }

  // 選択解除
  deselectAll() {
    this.selectedImages = []
    if (this.enable3DPreview && this.hasChanges) {
      this.schedule3DPreview()
    }
  }

  // アクティブ画像を切り替え（プレビュー表示更新）
  setActiveImage(img: any) {
    this.activeImage = img

    const cached = this.imageElementsCache.get(img.src)
    if (cached && cached.complete) {
      this.loadedImageElement = cached
      this.imageNaturalWidth = cached.naturalWidth || cached.width
      this.imageNaturalHeight = cached.naturalHeight || cached.height
      this.$nextTick(() => {
        this.zoomFit()
        this.renderAdjustedImage()
      })
    } else {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        this.imageElementsCache.set(img.src, image)
        this.loadedImageElement = image
        this.imageNaturalWidth = image.naturalWidth || image.width
        this.imageNaturalHeight = image.naturalHeight || image.height
        this.$nextTick(() => {
          this.zoomFit()
          this.renderAdjustedImage()
        })
      }
      image.src = img.src
    }
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 色相環の描画
  drawColorWheel() {
    const canvas = this.$refs.colorWheelCanvas as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(cx, cy) - 10
    const innerRadius = radius - 26

    ctx.clearRect(0, 0, width, height)

    // 360度のリングを描画
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 90 - 1) * Math.PI) / 180
      const endAngle = ((angle - 90 + 1) * Math.PI) / 180

      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle, false)
      ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true)
      ctx.closePath()

      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`
      ctx.fill()
    }

    // 現在の色相（Hue）インジケーター針を描画
    const currentAngleDeg = (this.hue >= 0 ? this.hue : 360 + this.hue)
    const rad = ((currentAngleDeg - 90) * Math.PI) / 180
    const pointerR = (radius + innerRadius) / 2
    const px = cx + pointerR * Math.cos(rad)
    const py = cy + pointerR * Math.sin(rad)

    ctx.beginPath()
    ctx.arc(px, py, 9, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 4
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(px, py, 6, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(${currentAngleDeg}, 100%, 50%)`
    ctx.fill()
  }

  getHueColor(hueVal: number): string {
    const deg = hueVal >= 0 ? hueVal : 360 + hueVal
    return `hsl(${deg}, 85%, 50%)`
  }

  // 色相環ドラッグ操作
  startWheelDrag(e: MouseEvent) {
    this.isDraggingWheel = true
    this.handleWheelInput(e.offsetX, e.offsetY)
  }

  onWheelDrag(e: MouseEvent) {
    if (!this.isDraggingWheel) return
    this.handleWheelInput(e.offsetX, e.offsetY)
  }

  stopWheelDrag() {
    this.isDraggingWheel = false
  }

  onTouchStartWheel(e: TouchEvent) {
    if (e.touches.length > 0) {
      this.isDraggingWheel = true
      const rect = (this.$refs.colorWheelCanvas as HTMLCanvasElement).getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      const y = e.touches[0].clientY - rect.top
      this.handleWheelInput(x, y)
    }
  }

  onTouchMoveWheel(e: TouchEvent) {
    if (this.isDraggingWheel && e.touches.length > 0) {
      const rect = (this.$refs.colorWheelCanvas as HTMLCanvasElement).getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      const y = e.touches[0].clientY - rect.top
      this.handleWheelInput(x, y)
    }
  }

  handleWheelInput(x: number, y: number) {
    const canvas = this.$refs.colorWheelCanvas as HTMLCanvasElement
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const dx = x * scaleX - cx
    const dy = y * scaleY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0) angle += 360
    if (angle > 360) angle -= 360

    let hueVal = Math.round(angle)
    if (hueVal > 180) hueVal -= 360

    this.hue = hueVal
    this.onParameterChange()
  }

  // パラメータ変更通知
  onParameterChange() {
    this.hasChanges = (
      this.hue !== 0 ||
      this.saturation !== 0 ||
      this.brightness !== 0 ||
      this.contrast !== 0 ||
      this.enableTint
    )

    this.drawColorWheel()
    this.scheduleRender()

    if (this.enable3DPreview) {
      this.schedule3DPreview()
    }
  }

  resetParam(param: string) {
    if (param === 'hue') this.hue = 0
    else if (param === 'saturation') this.saturation = 0
    else if (param === 'brightness') this.brightness = 0
    else if (param === 'contrast') this.contrast = 0
    this.onParameterChange()
  }

  private resetParametersInternal() {
    this.hue = 0
    this.saturation = 0
    this.brightness = 0
    this.contrast = 0
    this.enableTint = false
    this.drawColorWheel()
  }

  confirmResetAll() {
    if (confirm(this.$t('textureColor.confirmReset') as string)) {
      this.resetParametersInternal()
      this.hasChanges = false
      this.scheduleRender()
      const targetIndices = this.selectedImages.map(img => img.imageIndex ?? img.index)
      this.$emit('reset-texture-preview', targetIndices)
    }
  }

  // プリセット適用
  applyPreset(type: string) {
    this.enableTint = false

    switch (type) {
      case 'default':
        this.hue = 0
        this.saturation = 0
        this.brightness = 0
        this.contrast = 0
        break
      case 'vivid':
        this.saturation = 45
        this.contrast = 20
        this.brightness = 5
        break
      case 'warm':
        this.hue = 15
        this.saturation = 15
        this.brightness = 5
        this.enableTint = true
        this.tintColor = '#ff9933'
        this.tintIntensity = 20
        this.tintBlendMode = 'overlay'
        break
      case 'cool':
        this.hue = -20
        this.saturation = 10
        this.brightness = 0
        this.enableTint = true
        this.tintColor = '#3399ff'
        this.tintIntensity = 20
        this.tintBlendMode = 'overlay'
        break
      case 'grayscale':
        this.saturation = -100
        this.contrast = 10
        break
      case 'sepia':
        this.saturation = -60
        this.contrast = 5
        this.brightness = 5
        this.enableTint = true
        this.tintColor = '#a87948'
        this.tintIntensity = 45
        this.tintBlendMode = 'colorize'
        break
      case 'invert':
        this.hue = 180
        this.contrast = 0
        this.brightness = 0
        break
    }

    this.onParameterChange()
  }

  // プレビュー描画（requestAnimationFrameで最適化）
  scheduleRender() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    this.animationFrameId = requestAnimationFrame(() => {
      this.renderAdjustedImage()
    })
  }

  renderAdjustedImage() {
    if (!this.loadedImageElement) return
    const canvas = this.$refs.adjustedCanvas as HTMLCanvasElement
    if (!canvas) return
    this.applyColorAdjustmentToCanvas(this.loadedImageElement, canvas)
  }

  // 指定のImage要素を指定のCanvasへ色調補正して描画する汎用メソッド
  applyColorAdjustmentToCanvas(imgElem: HTMLImageElement, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = imgElem.naturalWidth || imgElem.width
    const h = imgElem.naturalHeight || imgElem.height

    canvas.width = w
    canvas.height = h
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(imgElem, 0, 0, w, h)

    if (!this.hasChanges) return

    const imgData = ctx.getImageData(0, 0, w, h)
    const data = imgData.data

    const hueShift = this.hue
    const satAdj = this.saturation / 100
    const brightAdj = (this.brightness / 100) * 255
    const contrastFactor = (259 * (this.contrast + 255)) / (255 * (259 - this.contrast))

    let tR = 0, tG = 0, tB = 0
    if (this.enableTint) {
      const hex = this.tintColor.replace('#', '')
      tR = parseInt(hex.substring(0, 2), 16) || 0
      tG = parseInt(hex.substring(2, 4), 16) || 0
      tB = parseInt(hex.substring(4, 6), 16) || 0
    }
    const tIntensity = this.tintIntensity / 100

    const len = data.length
    for (let i = 0; i < len; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      const a = data[i + 3]

      if (a === 0) continue

      // 1. 色相 & 彩度
      if (hueShift !== 0 || satAdj !== 0) {
        const [hVal, sVal, lVal] = this.rgbToHsl(r, g, b)
        let newH = (hVal + hueShift) % 360
        if (newH < 0) newH += 360
        let newS = Math.min(1, Math.max(0, sVal + satAdj * (satAdj > 0 ? (1 - sVal) : sVal)))
        const [nr, ng, nb] = this.hslToRgb(newH, newS, lVal)
        r = nr
        g = ng
        b = nb
      }

      // 2. 明度
      if (this.brightness !== 0) {
        r = Math.min(255, Math.max(0, r + brightAdj))
        g = Math.min(255, Math.max(0, g + brightAdj))
        b = Math.min(255, Math.max(0, b + brightAdj))
      }

      // 3. コントラスト
      if (this.contrast !== 0) {
        r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128))
        g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128))
        b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128))
      }

      // 4. カラー着色 / オーバーレイ
      if (this.enableTint && tIntensity > 0) {
        let blendedR = r
        let blendedG = g
        let blendedB = b

        if (this.tintBlendMode === 'multiply') {
          blendedR = (r * tR) / 255
          blendedG = (g * tG) / 255
          blendedB = (b * tB) / 255
        } else if (this.tintBlendMode === 'overlay') {
          blendedR = r < 128 ? (2 * r * tR) / 255 : 255 - (2 * (255 - r) * (255 - tR)) / 255
          blendedG = g < 128 ? (2 * g * tG) / 255 : 255 - (2 * (255 - g) * (255 - tG)) / 255
          blendedB = b < 128 ? (2 * b * tB) / 255 : 255 - (2 * (255 - b) * (255 - tB)) / 255
        } else if (this.tintBlendMode === 'colorize') {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b
          blendedR = (gray * tR) / 255
          blendedG = (gray * tG) / 255
          blendedB = (gray * tB) / 255
        }

        r = r * (1 - tIntensity) + blendedR * tIntensity
        g = g * (1 - tIntensity) + blendedG * tIntensity
        b = b * (1 - tIntensity) + blendedB * tIntensity
      }

      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }

    ctx.putImageData(imgData, 0, 0)
  }

  // 3Dプレビュー送信（複数選択テクスチャを一括反映）
  schedule3DPreview() {
    if (this.preview3DTimeout) clearTimeout(this.preview3DTimeout)
    this.preview3DTimeout = setTimeout(() => {
      this.send3DPreview()
    }, 60)
  }

  async send3DPreview() {
    if (this.selectedImages.length === 0) return

    const previewItems: Array<{ imageIndex: number, canvas: HTMLCanvasElement }> = []

    for (const img of this.selectedImages) {
      const imgIdx = typeof img.imageIndex === 'number' ? img.imageIndex : img.index

      if (this.activeImage && this.isSameImage(this.activeImage, img)) {
        const activeCanvas = this.$refs.adjustedCanvas as HTMLCanvasElement
        if (activeCanvas) {
          previewItems.push({ imageIndex: imgIdx, canvas: activeCanvas })
          continue
        }
      }

      // 他の選択中画像はオフスクリーンCanvasで補正
      let imgElem = this.imageElementsCache.get(img.src)
      if (!imgElem || !imgElem.complete) {
        imgElem = await new Promise<HTMLImageElement>(resolve => {
          const el = new Image()
          el.crossOrigin = 'anonymous'
          el.onload = () => {
            this.imageElementsCache.set(img.src, el)
            resolve(el)
          }
          el.src = img.src
        })
      }

      const offCanvas = document.createElement('canvas')
      this.applyColorAdjustmentToCanvas(imgElem, offCanvas)
      previewItems.push({ imageIndex: imgIdx, canvas: offCanvas })
    }

    this.$emit('preview-texture', previewItems)
  }

  onToggle3DPreview() {
    if (!this.enable3DPreview) {
      const targetIndices = this.selectedImages.map(img => img.imageIndex ?? img.index)
      this.$emit('reset-texture-preview', targetIndices)
    } else {
      this.send3DPreview()
    }
  }

  // RGB <-> HSL 変換ヘルパー
  rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h *= 60
    }
    return [h, s, l]
  }

  hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, (h / 360) + 1 / 3)
      g = hue2rgb(p, q, h / 360)
      b = hue2rgb(p, q, (h / 360) - 1 / 3)
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  }

  // ズーム & パン操作
  zoomIn() {
    this.zoom = Math.min(5.0, this.zoom * 1.25)
  }

  zoomOut() {
    this.zoom = Math.max(0.1, this.zoom / 1.25)
  }

  zoom100() {
    this.zoom = 1.0
    this.centerImage()
  }

  zoomFit() {
    const vp = this.$refs.viewportRef as HTMLElement
    if (!vp) return
    const vw = vp.clientWidth - 40
    const vh = vp.clientHeight - 40
    const scaleX = vw / this.imageNaturalWidth
    const scaleY = vh / this.imageNaturalHeight
    this.zoom = Math.min(1.0, Math.max(0.05, Math.min(scaleX, scaleY)))
    this.centerImage()
  }

  centerImage() {
    const vp = this.$refs.viewportRef as HTMLElement
    if (!vp) return
    this.panX = Math.max(20, (vp.clientWidth - this.imageNaturalWidth * this.zoom) / 2)
    this.panY = Math.max(20, (vp.clientHeight - this.imageNaturalHeight * this.zoom) / 2)
  }

  onViewportMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.split-divider')) return
    this.isPanning = true
    this.panStartX = e.clientX - this.panX
    this.panStartY = e.clientY - this.panY
  }

  onViewportWheel(e: WheelEvent) {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.min(5.0, Math.max(0.1, this.zoom * zoomFactor))

    const vp = this.$refs.viewportRef as HTMLElement
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom)
    this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom)
    this.zoom = newZoom
  }

  // スプリット比較ドラッグ
  startSplitDrag(e: MouseEvent) {
    this.isDraggingSplit = true
  }

  onTouchStartSplit(e: TouchEvent) {
    this.isDraggingSplit = true
  }

  onWindowMouseMove(e: MouseEvent) {
    if (this.isPanning) {
      this.panX = e.clientX - this.panStartX
      this.panY = e.clientY - this.panStartY
    }

    if (this.isDraggingSplit) {
      const vp = this.$refs.viewportRef as HTMLElement
      if (!vp) return
      const rect = vp.getBoundingClientRect()
      const currentCanvasLeft = rect.left + this.panX
      const currentCanvasWidth = this.imageNaturalWidth * this.zoom
      const relativeX = e.clientX - currentCanvasLeft
      const percent = Math.min(100, Math.max(0, (relativeX / currentCanvasWidth) * 100))
      this.splitPosition = Math.round(percent)
    }
  }

  onWindowMouseUp() {
    this.isPanning = false
    this.isDraggingSplit = false
  }

  // VRMモデルへ適用（選択中テクスチャを一括処理）
  async applyToVRM() {
    if (this.selectedImages.length === 0 || this.isApplying) return

    this.isApplying = true
    this.appliedCount = 0

    try {
      // 選択された各画像に対して補正を適用
      for (const img of this.selectedImages) {
        let canvas: HTMLCanvasElement

        if (this.activeImage && this.isSameImage(this.activeImage, img)) {
          canvas = this.$refs.adjustedCanvas as HTMLCanvasElement
        } else {
          let imgElem = this.imageElementsCache.get(img.src)
          if (!imgElem || !imgElem.complete) {
            imgElem = await new Promise<HTMLImageElement>(resolve => {
              const el = new Image()
              el.crossOrigin = 'anonymous'
              el.onload = () => {
                this.imageElementsCache.set(img.src, el)
                resolve(el)
              }
              el.src = img.src
            })
          }
          canvas = document.createElement('canvas')
          this.applyColorAdjustmentToCanvas(imgElem, canvas)
        }

        const mimeType = img.mimeType || 'image/png'
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.95))
        if (!blob) throw new Error(`Failed to create Blob for ${img.name}`)

        const arrayBuffer = await blob.arrayBuffer()
        await VRMParser.replaceImage(img, arrayBuffer)

        this.appliedCount++
      }

      // VRMファイルを再生成
      const newVrmFile = await VRMParser.createVRMFile()

      // 画像一覧を再パースして更新
      await new Promise<void>(resolve => {
        VRMParser.parse(newVrmFile, (_json: any, images: any[]) => {
          this.vrmImages.splice(0, this.vrmImages.length)
          this.vrmImages.push(...images)

          // 選択中画像リストおよびアクティブ画像の参照を更新
          const updatedSelected: any[] = []
          for (const sel of this.selectedImages) {
            const found = images.find(img => img.name === sel.name)
            if (found) updatedSelected.push(found)
          }
          this.selectedImages = updatedSelected

          if (this.activeImage) {
            const foundActive = images.find(img => img.name === this.activeImage.name)
            if (foundActive) this.activeImage = foundActive
          }
          resolve()
        })
      })

      // 3Dビューを再描画
      if (this.drawVrm) {
        this.drawVrm(newVrmFile)
      }

      this.hasChanges = false
      alert(this.$t('textureColor.appliedMultiSuccess', { count: this.selectedImages.length }) as string)
    } catch (err) {
      console.error('applyToVRM error', err)
      alert('適用エラー: ' + err)
    } finally {
      this.isApplying = false
      this.appliedCount = 0
    }
  }

  // 調整後テクスチャダウンロード
  downloadModifiedTexture() {
    const canvas = this.$refs.adjustedCanvas as HTMLCanvasElement
    if (!canvas || !this.activeImage) return

    const mimeType = this.activeImage.mimeType || 'image/png'
    const ext = mimeType === 'image/jpeg' ? '.jpg' : '.png'
    const origName = this.activeImage.name || 'texture'
    const baseName = origName.replace(/\.[^/.]+$/, '')
    const downloadName = `${baseName}_adjusted${ext}`

    const link = document.createElement('a')
    link.href = canvas.toDataURL(mimeType, 0.95)
    link.download = downloadName
    link.click()
  }
}
</script>

<style scoped lang="scss">
$primary: #0284c7;
$primary-dark: #0369a1;
$border-color: #cbd5e1;
$bg-card: #ffffff;
$bg-subtle: #f8fafc;
$text-main: #1e293b;
$text-sub: #64748b;

.tabTextureColor {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: #f1f5f9;
  overflow-x: hidden;
}

/* 上部テクスチャセレクタ */
.texture-selector-bar {
  background: #ffffff;
  border-bottom: 1px solid $border-color;
  padding: 8px 12px;
  flex-shrink: 0;

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .selector-title {
        font-size: 13px;
        font-weight: 700;
        color: $text-main;
      }

      .selected-count-badge {
        background: #e0f2fe;
        color: $primary;
        font-size: 11px;
        font-weight: 700;
        padding: 1px 8px;
        border-radius: 10px;
      }
    }

    .header-right {
      display: flex;
      gap: 6px;

      .btn-tool-mini {
        padding: 3px 8px;
        font-size: 11px;
        background: #f8fafc;
        border: 1px solid $border-color;
        border-radius: 3px;
        cursor: pointer;

        &:hover {
          background: #e2e8f0;
        }

        &.btn-toggle-simple {
          background: #e0f2fe;
          color: $primary-dark;
          font-weight: 600;
          border-color: #bae6fd;

          &.active {
            background: #fef3c7;
            color: #92400e;
            border-color: #fde68a;
          }
        }
      }
    }
  }

  .texture-thumbnails-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      height: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .texture-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 78px;
      min-width: 78px;
      padding: 4px;
      background: $bg-subtle;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #e2e8f0;
      }

      &.selected {
        border-color: $primary;
        background: #f0f9ff;
      }

      &.active {
        box-shadow: 0 0 0 2px #38bdf8;
      }

      .card-checkbox-wrapper {
        position: absolute;
        top: 2px;
        left: 2px;
        z-index: 2;
        background: rgba(255, 255, 255, 0.85);
        border-radius: 3px;
        padding: 1px;
        display: flex;
        align-items: center;
        justify-content: center;

        input {
          cursor: pointer;
          margin: 0;
          width: 14px;
          height: 14px;
        }
      }

      .thumb-box {
        position: relative;
        width: 64px;
        height: 64px;
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

        .active-badge {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(2, 132, 199, 0.9);
          color: #ffffff;
          font-size: 8px;
          font-weight: 700;
          text-align: center;
          padding: 1px 0;
        }
      }

      .thumb-name {
        margin: 4px 0 0 0;
        font-size: 10px;
        color: $text-main;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }
    }
  }
}

/* モバイルナビゲーションバー (幅768px以下で表示) */
.mobile-nav-bar {
  display: none;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  gap: 8px;

  .mobile-tab-group {
    display: flex;
    gap: 4px;

    .mobile-tab-btn {
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;

      &.active {
        background: $primary;
        color: #ffffff;
        border-color: $primary;
      }
    }
  }

  .btn-simple-toggle-mobile {
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #f1f5f9;
    background: #334155;
    border: 1px solid #475569;
    border-radius: 4px;
    cursor: pointer;

    &.active {
      background: #f59e0b;
      color: #0f172a;
      border-color: #fbbf24;
    }
  }
}

/* メインエリア */
.color-editor-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  max-width: 100%;
}

/* 左側コントロールパネル */
.controls-panel {
  width: 320px;
  min-width: 320px;
  background: #ffffff;
  border-right: 1px solid $border-color;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  &.is-simple {
    gap: 8px;
    padding: 10px;
  }
}

.section-card {
  background: $bg-subtle;
  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 10px;
  box-sizing: border-box;

  .section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .section-label {
    font-size: 12px;
    font-weight: 700;
    color: $text-main;
    display: block;
    margin-bottom: 6px;
  }
}

/* テクスチャ情報カード */
.texture-info-card {
  &.compact-info {
    padding: 6px 10px;
    .info-row {
      margin-bottom: 0;
    }
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    margin-bottom: 4px;

    .info-label {
      color: $text-sub;
    }
    .info-value {
      color: $text-main;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .font-bold {
      font-weight: 700;
    }
    .multi-hint {
      font-size: 10px;
      color: $primary;
      font-weight: normal;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    font-size: 11px;
    margin-bottom: 4px;

    .info-label {
      color: $text-sub;
      margin-right: 4px;
    }
    .info-value {
      color: $text-main;
      font-weight: 600;
    }
  }

  .info-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    .mat-tag {
      background: #e2e8f0;
      color: #334155;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
    }
  }
}

/* プリセットボタン */
.presets-card {
  .preset-btn-group {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    .btn-preset {
      flex: 1 1 calc(33.3% - 4px);
      padding: 4px 6px;
      font-size: 11px;
      background: #ffffff;
      border: 1px solid $border-color;
      border-radius: 4px;
      cursor: pointer;
      text-align: center;
      transition: all 0.1s;

      &:hover {
        background: #e0f2fe;
        border-color: $primary;
        color: $primary-dark;
      }
    }
  }
}

/* 色相環カード */
.color-wheel-card {
  .wheel-degree {
    font-size: 12px;
    font-weight: 700;
    color: $primary;
    background: #e0f2fe;
    padding: 1px 6px;
    border-radius: 8px;
  }

  .wheel-container {
    position: relative;
    width: 180px;
    height: 180px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;

    .wheel-canvas {
      width: 180px;
      height: 180px;
      cursor: crosshair;
      border-radius: 50%;
      touch-action: none;
    }

    .wheel-center-info {
      position: absolute;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      transition: background-color 0.1s;

      .center-text {
        font-size: 12px;
        font-weight: 700;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      }
    }
  }
}

/* シンプル表示時の色相環アコーディオン開閉 */
.color-wheel-accordion-row {
  display: flex;
  justify-content: center;
  margin-bottom: 2px;

  .btn-toggle-wheel-accordion {
    width: 100%;
    padding: 5px;
    font-size: 11px;
    font-weight: 600;
    color: $primary-dark;
    background: #e0f2fe;
    border: 1px dashed #7dd3fc;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: #bae6fd;
    }
  }
}

/* スライダーカード */
.sliders-card {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .slider-row {
    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .slider-label {
        font-size: 11px;
        font-weight: 600;
        color: $text-main;
      }

      .slider-val-box {
        display: flex;
        align-items: center;
        gap: 2px;

        .num-input {
          width: 48px;
          padding: 2px 4px;
          font-size: 11px;
          border: 1px solid $border-color;
          border-radius: 3px;
          text-align: right;
        }

        .unit {
          font-size: 10px;
          color: $text-sub;
        }

        .btn-reset-param {
          background: none;
          border: none;
          color: $text-sub;
          cursor: pointer;
          font-size: 12px;
          padding: 0 2px;

          &:hover {
            color: $primary;
          }
        }
      }
    }

    .range-slider {
      width: 100%;
      margin: 0;
      height: 6px;
      cursor: pointer;

      &.slider-hue {
        background: linear-gradient(
          to right,
          #00ffff,
          #0000ff,
          #ff00ff,
          #ff0000,
          #ffff00,
          #00ff00,
          #00ffff
        );
      }
    }
  }
}

/* カラー着色カード */
.tint-card {
  &.collapsed {
    padding: 6px 10px;
    .section-header-row {
      margin-bottom: 0;
    }
  }

  .tint-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;

    .tint-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;

      .sub-label {
        width: 80px;
        color: $text-sub;
      }

      .color-picker-input {
        width: 32px;
        height: 24px;
        padding: 0;
        border: 1px solid $border-color;
        border-radius: 4px;
        cursor: pointer;
      }

      .color-hex {
        font-family: monospace;
        font-size: 11px;
        color: $text-main;
      }

      .select-input {
        flex: 1;
        padding: 2px 6px;
        font-size: 11px;
        border: 1px solid $border-color;
        border-radius: 3px;
        background: #ffffff;
      }

      .mini-slider {
        flex: 1;
      }

      .val-text {
        width: 32px;
        font-size: 11px;
        text-align: right;
        color: $text-main;
      }
    }
  }
}

/* フッターカード */
.footer-card {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .btn-reset-all {
    padding: 4px 10px;
    font-size: 11px;
    color: #ef4444;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: #fee2e2;
    }
  }
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  input[type='checkbox'] {
    cursor: pointer;
  }

  .toggle-text {
    font-size: 12px;
    font-weight: 700;
    color: $text-main;
  }
}

/* 右側プレビューパネル */
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #1e293b;
  min-width: 0;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  color: #ffffff;
  flex-shrink: 0;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .toolbar-title {
      font-size: 13px;
      font-weight: 700;
    }

    .toggle-mini {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #94a3b8;
      cursor: pointer;

      input {
        cursor: pointer;
      }
    }

    .btn-hold-compare {
      padding: 3px 8px;
      font-size: 11px;
      background: #334155;
      color: #ffffff;
      border: 1px solid #475569;
      border-radius: 3px;
      cursor: pointer;
      user-select: none;

      &:hover {
        background: #475569;
      }
      &:active {
        background: $primary;
      }
    }
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;

    .btn-tool-mini {
      padding: 3px 8px;
      font-size: 11px;
      background: #334155;
      color: #ffffff;
      border: 1px solid #475569;
      border-radius: 3px;
      cursor: pointer;

      &:hover {
        background: #475569;
      }
    }

    .zoom-badge {
      font-size: 11px;
      font-family: monospace;
      color: #94a3b8;
      min-width: 44px;
      text-align: center;
    }
  }
}

/* プレビュービューポート */
.preview-canvas-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  .canvas-wrapper {
    position: absolute;
    top: 0;
    left: 0;
  }

  .checker-bg {
    position: relative;
    background-color: #262626;
    background-image:
      linear-gradient(45deg, #1f1f1f 25%, transparent 25%),
      linear-gradient(-45deg, #1f1f1f 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #1f1f1f 75%),
      linear-gradient(-45deg, transparent 75%, #1f1f1f 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);

    .main-canvas,
    .original-img {
      display: block;
      width: 100%;
      height: 100%;
    }
  }

  /* スプリット比較オーバーレイ */
  .split-overlay-container {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;

    .split-left-clip {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      overflow: hidden;
      border-right: 2px solid #38bdf8;
      pointer-events: none;

      .split-original-img {
        display: block;
        max-width: none;
      }
    }

    .split-badge {
      position: absolute;
      top: 10px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;

      &.badge-left {
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: #38bdf8;
      }

      &.badge-right {
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: #4ade80;
      }
    }

    .split-divider {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 30px;
      margin-left: -15px;
      cursor: ew-resize;
      pointer-events: auto;
      touch-action: none;
      display: flex;
      align-items: center;
      justify-content: center;

      .divider-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #38bdf8;
        box-shadow: 0 0 6px rgba(56, 189, 248, 0.8);
      }

      .divider-handle {
        width: 24px;
        height: 24px;
        background: #38bdf8;
        color: #0f172a;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        z-index: 2;
      }
    }
  }
}

/* 共通アクションバー (画面下部に配置) */
.common-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #0f172a;
  border-top: 1px solid #334155;
  flex-shrink: 0;
  z-index: 10;

  .action-status {
    font-size: 12px;

    .status-loading {
      color: #38bdf8;
    }
    .status-unsaved {
      color: #fbbf24;
      font-weight: 600;
    }
    .status-saved {
      color: #4ade80;
    }
  }

  .action-buttons {
    display: flex;
    gap: 10px;

    .btn-action-sec {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid #475569;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;

      &:hover:not(:disabled) {
        background: #334155;
      }
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-action-pri {
      padding: 6px 18px;
      font-size: 12px;
      font-weight: 700;
      background: $primary;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;

      &:hover:not(:disabled) {
        background: $primary-dark;
      }
      &:disabled {
        background: #475569;
        color: #94a3b8;
        cursor: not-allowed;
      }
    }
  }

  .btn-text-full {
    display: inline;
  }
  .btn-text-short {
    display: none;
  }
}

.no-texture-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: $text-sub;
}

/* =========================================================
   レスポンシブ・スマホ向け調整 (768px以下 / 480px以下)
   ========================================================= */
@media screen and (max-width: 768px) {
  .mobile-nav-bar {
    display: flex;
  }

  .color-editor-main {
    flex-direction: column;

    &.mobile-show-adjust {
      .controls-panel {
        display: flex;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        flex: 1;
        border-right: none;
      }
      .preview-panel {
        display: none;
      }
    }

    &.mobile-show-preview {
      .controls-panel {
        display: none;
      }
      .preview-panel {
        display: flex;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        flex: 1;
        min-height: 380px;
      }
    }
  }

  .controls-panel {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    padding: 8px;
    border-right: none;
  }

  .preview-panel {
    width: 100%;
    min-width: 0;
    max-width: 100%;

    .preview-toolbar {
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 8px;

      .toolbar-left {
        gap: 6px;
        flex-wrap: wrap;
      }

      .toolbar-right {
        gap: 4px;
      }
    }
  }

  .common-actions-bar {
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;

    .action-status {
      font-size: 11px;
      text-align: center;
    }

    .action-buttons {
      width: 100%;
      gap: 6px;

      .btn-action-sec,
      .btn-action-pri {
        flex: 1;
        text-align: center;
        padding: 7px 6px;
        font-size: 11px;
      }
    }

    .btn-text-full {
      display: none;
    }
    .btn-text-short {
      display: inline;
    }
  }
}

@media screen and (max-width: 480px) {
  .texture-selector-bar {
    padding: 6px 8px;

    .selector-header {
      .selector-title {
        font-size: 12px;
      }
      .selected-count-badge {
        font-size: 10px;
        padding: 1px 6px;
      }
    }

    .texture-thumbnails-scroll {
      .texture-card {
        width: 68px;
        min-width: 68px;
        padding: 3px;

        .thumb-box {
          width: 56px;
          height: 56px;
        }
      }
    }
  }

  .presets-card {
    .preset-btn-group {
      .btn-preset {
        flex: 1 1 calc(50% - 4px);
        font-size: 10px;
        padding: 4px 2px;
      }
    }
  }

  .color-wheel-card {
    .wheel-container {
      width: 140px;
      height: 140px;

      .wheel-canvas {
        width: 140px;
        height: 140px;
      }

      .wheel-center-info {
        width: 44px;
        height: 44px;

        .center-text {
          font-size: 10px;
        }
      }
    }
  }

  .sliders-card {
    .slider-row {
      .slider-header {
        .slider-val-box {
          .num-input {
            width: 38px;
            font-size: 10px;
          }
        }
      }
    }
  }
}
</style>
