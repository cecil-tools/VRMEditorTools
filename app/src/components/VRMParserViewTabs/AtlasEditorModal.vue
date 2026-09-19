<template>
  <div class="atlas-modal-overlay" v-if="isOpen" @click.self="onClose">
    <div class="atlas-modal-container">
      <!-- ヘッダー -->
      <div class="modal-header">
        <div class="header-title">
          <h3>🗺️ {{ $t('atlas.editorTitle') }}</h3>
          <span class="header-badge">{{ items.length }} {{ $t('atlas.itemsSelected') }}</span>
        </div>
        <button type="button" class="btn-close" @click="onClose">✕</button>
      </div>

      <!-- ツールバー -->
      <div class="modal-toolbar">
        <div class="toolbar-group">
          <label class="toolbar-label">{{ $t('atlas.resolution') }}:</label>
          <select v-model.number="atlasSize" @change="onSizeChanged" class="size-select">
            <option :value="1024">1024 x 1024</option>
            <option :value="2048">2048 x 2048 (推奨)</option>
            <option :value="4096">4096 x 4096</option>
          </select>
        </div>

        <div class="toolbar-group">
          <label class="toolbar-label">{{ $t('atlas.padding') }}:</label>
          <input type="number" v-model.number="padding" min="0" max="32" class="num-input-small" />
          <span class="unit">px</span>
        </div>

        <div class="toolbar-group">
          <button type="button" class="btn-tool" @click="runAutoPack">
            🧩 {{ $t('atlas.autoPack') }}
          </button>
          <button type="button" class="btn-tool" @click="resetToOriginalSizes">
            ↺ {{ $t('atlas.resetSizes') }}
          </button>
        </div>

        <div class="toolbar-group">
          <label class="toggle-label-mini" :title="$t('atlas.snapTooltip')">
            <input type="checkbox" v-model="enableSnap" />
            <span>🧲 {{ $t('atlas.snap') }}</span>
          </label>
        </div>

        <div class="toolbar-group zoom-group">
          <button type="button" class="btn-mini" @click="zoomOut">-</button>
          <span class="zoom-text">{{ Math.round(zoom * 100) }}%</span>
          <button type="button" class="btn-mini" @click="zoomIn">+</button>
          <button type="button" class="btn-mini" @click="zoomFit">{{ $t('atlas.zoomFit') }}</button>
        </div>
      </div>

      <!-- メインエリア（キャンバス + インスペクター） -->
      <div class="modal-main-body">
        <!-- キャンバスビューポート -->
        <div class="canvas-viewport" ref="viewportRef">
          <div
            class="canvas-board"
            :style="{
              width: (atlasSize * zoom) + 'px',
              height: (atlasSize * zoom) + 'px'
            }"
            @mousedown="onCanvasBackgroundMouseDown"
          >
            <!-- 背景グリッド -->
            <div class="board-grid"></div>

            <!-- ガイド線 (Smart Guides) -->
            <div
              v-for="(gx, idx) in activeGuideLinesX"
              :key="'gx-' + idx"
              class="guide-line guide-line-x"
              :style="{ left: (gx * zoom) + 'px' }"
            ></div>
            <div
              v-for="(gy, idx) in activeGuideLinesY"
              :key="'gy-' + idx"
              class="guide-line guide-line-y"
              :style="{ top: (gy * zoom) + 'px' }"
            ></div>

            <!-- 配置アイテム -->
            <div
              v-for="item in items"
              :key="item.id"
              class="atlas-item-box"
              :class="{
                selected: selectedItemId === item.id,
                dragging: isDragging && selectedItemId === item.id,
                colliding: isItemColliding(item)
              }"
              :style="{
                left: (item.x * zoom) + 'px',
                top: (item.y * zoom) + 'px',
                width: (item.width * zoom) + 'px',
                height: (item.height * zoom) + 'px'
              }"
              @mousedown.stop="onItemMouseDown($event, item)"
            >
              <!-- テクスチャ画像 -->
              <img
                :src="item.src"
                :alt="item.name"
                class="item-img"
                draggable="false"
              />

              <!-- アイテム名ラベル -->
              <div class="item-label-tag" :title="item.name">
                {{ item.name }} ({{ item.width }}x{{ item.height }})
              </div>

              <!-- 座標バッジ（ドラッグ中表示） -->
              <div
                v-if="isDragging && selectedItemId === item.id"
                class="drag-coord-badge"
              >
                X: {{ item.x }} / Y: {{ item.y }}
              </div>

              <!-- 選択時のリサイズハンドル (8方向) -->
              <template v-if="selectedItemId === item.id">
                <div class="resize-handle handle-nw" @mousedown.stop="onHandleMouseDown($event, item, 'nw')"></div>
                <div class="resize-handle handle-ne" @mousedown.stop="onHandleMouseDown($event, item, 'ne')"></div>
                <div class="resize-handle handle-se" @mousedown.stop="onHandleMouseDown($event, item, 'se')"></div>
                <div class="resize-handle handle-sw" @mousedown.stop="onHandleMouseDown($event, item, 'sw')"></div>
                <div class="resize-handle handle-n" @mousedown.stop="onHandleMouseDown($event, item, 'n')"></div>
                <div class="resize-handle handle-s" @mousedown.stop="onHandleMouseDown($event, item, 's')"></div>
                <div class="resize-handle handle-e" @mousedown.stop="onHandleMouseDown($event, item, 'e')"></div>
                <div class="resize-handle handle-w" @mousedown.stop="onHandleMouseDown($event, item, 'w')"></div>
              </template>
            </div>
          </div>
        </div>

        <!-- 右側インスペクター -->
        <div class="modal-inspector">
          <!-- 警告表示 -->
          <div v-if="hasCollision" class="warning-banner">
            ⚠️ {{ $t('atlas.warnCollision') }}
          </div>
          <div v-if="hasOutOfBounds" class="warning-banner">
            ⚠️ {{ $t('atlas.warnOutOfBounds') }}
          </div>
          <div v-if="hasUVOverflowItems" class="warning-banner info">
            ℹ️ {{ $t('atlas.warnUVOverflow') }}
          </div>

          <!-- 選択中テクスチャのプロパティ -->
          <div class="inspector-section" v-if="selectedItem">
            <h4>{{ $t('atlas.selectedProperties') }}</h4>
            <div class="prop-item-header">
              <span class="prop-name" :title="selectedItem.name">{{ selectedItem.name }}</span>
              <span class="prop-orig-size">元サイズ: {{ selectedItem.originalWidth }}x{{ selectedItem.originalHeight }}</span>
            </div>

            <div class="prop-grid">
              <div class="prop-field">
                <label>X (px):</label>
                <input
                  type="number"
                  v-model.number="selectedItem.x"
                  :max="atlasSize - selectedItem.width"
                  min="0"
                />
              </div>
              <div class="prop-field">
                <label>Y (px):</label>
                <input
                  type="number"
                  v-model.number="selectedItem.y"
                  :max="atlasSize - selectedItem.height"
                  min="0"
                />
              </div>
              <div class="prop-field">
                <label>幅 (px):</label>
                <input
                  type="number"
                  :value="selectedItem.width"
                  @change="onWidthInputChange"
                  min="16"
                  :max="atlasSize"
                />
              </div>
              <div class="prop-field">
                <label>高さ (px):</label>
                <input
                  type="number"
                  :value="selectedItem.height"
                  @change="onHeightInputChange"
                  min="16"
                  :max="atlasSize"
                />
              </div>
            </div>

            <div class="prop-toggles">
              <label class="toggle-check">
                <input type="checkbox" v-model="selectedItem.aspectRatioLocked" />
                <span>{{ $t('atlas.lockAspect') }}</span>
              </label>
            </div>

            <div class="prop-quick-btns">
              <button type="button" class="btn-sub" @click="resetCurrentItemSize">
                {{ $t('atlas.restoreOriginalSize') }}
              </button>
              <button type="button" class="btn-sub" @click="scaleCurrentItem(0.5)">
                50%
              </button>
              <button type="button" class="btn-sub" @click="scaleCurrentItem(2)">
                200%
              </button>
            </div>

            <div class="drag-hint">
              <span>💡 {{ $t('atlas.dragHint') }}</span>
            </div>
          </div>
          <div class="inspector-section no-selection" v-else>
            <p>{{ $t('atlas.clickToSelect') }}</p>
          </div>

          <!-- テクスチャ一覧リスト -->
          <div class="inspector-section items-list-section">
            <h4>{{ $t('atlas.placedList') }} ({{ items.length }})</h4>
            <div class="items-scroll-list">
              <div
                v-for="it in items"
                :key="it.id"
                class="item-list-row"
                :class="{ active: selectedItemId === it.id }"
                @click="selectedItemId = it.id"
              >
                <img :src="it.src" class="row-thumb" />
                <div class="row-info">
                  <span class="row-name" :title="it.name">{{ it.name }}</span>
                  <span class="row-coord">{{ it.width }}x{{ it.height }} @ ({{ it.x }}, {{ it.y }})</span>
                </div>
                <span v-if="it.hasUVOverflow" class="badge-warn" title="UV座標が[0,1]範囲外">UV!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- フッター -->
      <div class="modal-footer">
        <div class="footer-left">
          <span class="reduction-hint">
            💡 {{ $t('atlas.reductionHint') }}
          </span>
        </div>
        <div class="footer-right">
          <button type="button" class="btn-cancel" @click="onClose">
            {{ $t('atlas.cancel') }}
          </button>
          <button
            type="button"
            class="btn-apply"
            :disabled="isProcessing || items.length === 0"
            @click="onApply"
          >
            {{ isProcessing ? $t('atlas.processing') : $t('atlas.applyToVRM') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import AtlasPacker, { AtlasItem } from '@/module/AtlasPacker'
import VRMParser from '@/module/VRMParser'

@Component({})
export default class AtlasEditorModal extends Vue {
  @Prop({ default: false }) isOpen!: boolean
  @Prop({ default: () => [] }) selectedImages!: any[]
  @Prop() vrmVersion!: any

  atlasSize = 2048
  padding = 2
  zoom = 0.35
  enableSnap = true

  items: Array<AtlasItem & { hasUVOverflow?: boolean }> = []
  selectedItemId: string | number | null = null

  isProcessing = false

  // ドラッグ & リサイズ用状態
  isDragging = false
  isResizing = false
  private resizeHandle = ''
  private dragStartX = 0
  private dragStartY = 0
  private itemInitialX = 0
  private itemInitialY = 0
  private itemInitialW = 0
  private itemInitialH = 0

  // スマートガイド線
  activeGuideLinesX: number[] = []
  activeGuideLinesY: number[] = []

  private boundMouseMove!: (e: MouseEvent) => void
  private boundMouseUp!: () => void
  private boundKeyDown!: (e: KeyboardEvent) => void

  created() {
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundKeyDown = this.onKeyDown.bind(this)
  }

  get selectedItem(): (AtlasItem & { hasUVOverflow?: boolean }) | null {
    if (this.selectedItemId === null) return null
    return this.items.find(i => i.id === this.selectedItemId) || null
  }

  get hasCollision(): boolean {
    for (let i = 0; i < this.items.length; i++) {
      for (let j = i + 1; j < this.items.length; j++) {
        if (AtlasPacker.checkCollision(this.items[i], this.items[j], 0)) {
          return true
        }
      }
    }
    return false
  }

  get hasOutOfBounds(): boolean {
    return this.items.some(it => !AtlasPacker.isWithinBounds(it, this.atlasSize, this.atlasSize))
  }

  get hasUVOverflowItems(): boolean {
    return this.items.some(it => it.hasUVOverflow)
  }

  @Watch('isOpen')
  onOpenChanged(val: boolean) {
    if (val) {
      this.initItems()
      window.addEventListener('keydown', this.boundKeyDown)
      this.$nextTick(() => {
        this.zoomFit()
      })
    } else {
      window.removeEventListener('keydown', this.boundKeyDown)
      this.clearDragListeners()
    }
  }

  beforeDestroy() {
    window.removeEventListener('keydown', this.boundKeyDown)
    this.clearDragListeners()
  }

  initItems() {
    this.items = []
    this.selectedItemId = null
    this.activeGuideLinesX = []
    this.activeGuideLinesY = []

    if (!this.selectedImages || this.selectedImages.length === 0) return

    const loadPromises = this.selectedImages.map((img, idx) => {
      return new Promise<AtlasItem & { hasUVOverflow?: boolean }>((resolve) => {
        const imageElement = new Image()
        imageElement.onload = () => {
          const uvCheck = VRMParser.checkUVBoundsForImage(img)
          resolve({
            id: img.index ?? idx,
            name: img.name || `Image_${idx}`,
            imageIndex: typeof img.imageIndex === 'number' ? img.imageIndex : idx,
            width: imageElement.naturalWidth || 512,
            height: imageElement.naturalHeight || 512,
            originalWidth: imageElement.naturalWidth || 512,
            originalHeight: imageElement.naturalHeight || 512,
            x: 0,
            y: 0,
            aspectRatioLocked: true,
            src: img.src,
            imgElement: imageElement,
            hasUVOverflow: uvCheck.hasOverflow
          })
        }
        imageElement.onerror = () => {
          resolve({
            id: img.index ?? idx,
            name: img.name || `Image_${idx}`,
            imageIndex: typeof img.imageIndex === 'number' ? img.imageIndex : idx,
            width: 512,
            height: 512,
            originalWidth: 512,
            originalHeight: 512,
            x: 0,
            y: 0,
            aspectRatioLocked: true,
            src: img.src,
            hasUVOverflow: false
          })
        }
        imageElement.src = img.src
      })
    })

    Promise.all(loadPromises).then(loadedItems => {
      this.items = loadedItems
      this.runAutoPack()
      if (this.items.length > 0) {
        this.selectedItemId = this.items[0].id
      }
    })
  }

  runAutoPack() {
    if (this.items.length === 0) return
    const res = AtlasPacker.autoPack(this.items, this.atlasSize, this.atlasSize, this.padding)
    this.items = res.items.map((it, idx) => ({
      ...it,
      hasUVOverflow: this.items[idx]?.hasUVOverflow
    }))
  }

  resetToOriginalSizes() {
    this.items.forEach(it => {
      it.width = it.originalWidth
      it.height = it.originalHeight
    })
    this.runAutoPack()
  }

  resetCurrentItemSize() {
    if (!this.selectedItem) return
    this.$set(this.selectedItem, 'width', this.selectedItem.originalWidth)
    this.$set(this.selectedItem, 'height', this.selectedItem.originalHeight)
  }

  scaleCurrentItem(ratio: number) {
    if (!this.selectedItem) return
    this.$set(this.selectedItem, 'width', Math.max(16, Math.min(this.atlasSize, Math.round(this.selectedItem.width * ratio))))
    this.$set(this.selectedItem, 'height', Math.max(16, Math.min(this.atlasSize, Math.round(this.selectedItem.height * ratio))))
  }

  onWidthInputChange(e: any) {
    if (!this.selectedItem) return
    const newW = Math.max(16, Math.min(this.atlasSize, parseInt(e.target.value) || 16))
    if (this.selectedItem.aspectRatioLocked && this.selectedItem.width > 0) {
      const ratio = newW / this.selectedItem.width
      this.$set(this.selectedItem, 'height', Math.max(16, Math.min(this.atlasSize, Math.round(this.selectedItem.height * ratio))))
    }
    this.$set(this.selectedItem, 'width', newW)
  }

  onHeightInputChange(e: any) {
    if (!this.selectedItem) return
    const newH = Math.max(16, Math.min(this.atlasSize, parseInt(e.target.value) || 16))
    if (this.selectedItem.aspectRatioLocked && this.selectedItem.height > 0) {
      const ratio = newH / this.selectedItem.height
      this.$set(this.selectedItem, 'width', Math.max(16, Math.min(this.atlasSize, Math.round(this.selectedItem.width * ratio))))
    }
    this.$set(this.selectedItem, 'height', newH)
  }

  onSizeChanged() {
    this.runAutoPack()
    this.zoomFit()
  }

  zoomIn() {
    this.zoom = Math.min(2.0, this.zoom + 0.05)
  }

  zoomOut() {
    this.zoom = Math.max(0.1, this.zoom - 0.05)
  }

  zoomFit() {
    const vp = this.$refs.viewportRef as HTMLElement
    if (!vp) return
    const availW = vp.clientWidth - 40
    const availH = vp.clientHeight - 40
    const fitZoom = Math.min(availW / this.atlasSize, availH / this.atlasSize)
    this.zoom = Math.max(0.1, Math.min(1.0, fitZoom))
  }

  isItemColliding(item: AtlasItem): boolean {
    return this.items.some(other => other.id !== item.id && AtlasPacker.checkCollision(item, other, 0))
  }

  // キャンバス背景クリック
  onCanvasBackgroundMouseDown() {
    this.selectedItemId = null
    this.activeGuideLinesX = []
    this.activeGuideLinesY = []
  }

  // アイテムドラッグ開始
  onItemMouseDown(e: MouseEvent, item: AtlasItem) {
    if (e.button !== 0) return
    e.preventDefault()
    this.selectedItemId = item.id
    this.isDragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.itemInitialX = item.x
    this.itemInitialY = item.y
    this.activeGuideLinesX = []
    this.activeGuideLinesY = []

    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('mouseup', this.boundMouseUp)
  }

  // リサイズハンドル操作開始
  onHandleMouseDown(e: MouseEvent, item: AtlasItem, handle: string) {
    if (e.button !== 0) return
    e.preventDefault()
    this.selectedItemId = item.id
    this.isResizing = true
    this.resizeHandle = handle
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.itemInitialX = item.x
    this.itemInitialY = item.y
    this.itemInitialW = item.width
    this.itemInitialH = item.height
    this.activeGuideLinesX = []
    this.activeGuideLinesY = []

    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('mouseup', this.boundMouseUp)
  }

  onMouseMove(e: MouseEvent) {
    if (!this.selectedItem) return

    const deltaX = (e.clientX - this.dragStartX) / this.zoom
    const deltaY = (e.clientY - this.dragStartY) / this.zoom

    if (this.isDragging) {
      let candidateX = Math.round(this.itemInitialX + deltaX)
      let candidateY = Math.round(this.itemInitialY + deltaY)

      // スマートスナップ計算（Shiftキー保持時はスナップ一時無効化）
      if (this.enableSnap && !e.shiftKey) {
        const snap = AtlasPacker.calculateSnap(
          this.selectedItem,
          candidateX,
          candidateY,
          this.items,
          this.atlasSize,
          this.atlasSize,
          8
        )
        candidateX = snap.x
        candidateY = snap.y
        this.activeGuideLinesX = snap.guideLinesX
        this.activeGuideLinesY = snap.guideLinesY
      } else {
        this.activeGuideLinesX = []
        this.activeGuideLinesY = []
      }

      // キャンバス内クランプ
      candidateX = Math.max(0, Math.min(this.atlasSize - this.selectedItem.width, candidateX))
      candidateY = Math.max(0, Math.min(this.atlasSize - this.selectedItem.height, candidateY))

      this.$set(this.selectedItem, 'x', candidateX)
      this.$set(this.selectedItem, 'y', candidateY)
    } else if (this.isResizing) {
      let newW = this.itemInitialW
      let newH = this.itemInitialH
      let newX = this.itemInitialX
      let newY = this.itemInitialY

      const h = this.resizeHandle
      const lock = !!this.selectedItem.aspectRatioLocked
      const origAspect = this.itemInitialW / this.itemInitialH

      if (h.includes('e')) {
        newW = Math.max(16, Math.min(this.atlasSize - newX, Math.round(this.itemInitialW + deltaX)))
        if (lock) newH = Math.round(newW / origAspect)
      }
      if (h.includes('s')) {
        newH = Math.max(16, Math.min(this.atlasSize - newY, Math.round(this.itemInitialH + deltaY)))
        if (lock) newW = Math.round(newH * origAspect)
      }
      if (h.includes('w')) {
        const targetW = Math.max(16, Math.round(this.itemInitialW - deltaX))
        const actualDelta = this.itemInitialW - targetW
        newX = this.itemInitialX + actualDelta
        newW = targetW
        if (lock) newH = Math.round(newW / origAspect)
      }
      if (h.includes('n')) {
        const targetH = Math.max(16, Math.round(this.itemInitialH - deltaY))
        const actualDelta = this.itemInitialH - targetH
        newY = this.itemInitialY + actualDelta
        newH = targetH
        if (lock) newW = Math.round(newH * origAspect)
      }

      const clampedX = Math.max(0, newX)
      const clampedY = Math.max(0, newY)
      const clampedW = Math.max(16, Math.min(this.atlasSize - clampedX, newW))
      const clampedH = Math.max(16, Math.min(this.atlasSize - clampedY, newH))

      this.$set(this.selectedItem, 'x', clampedX)
      this.$set(this.selectedItem, 'y', clampedY)
      this.$set(this.selectedItem, 'width', clampedW)
      this.$set(this.selectedItem, 'height', clampedH)
    }
  }

  onMouseUp() {
    this.isDragging = false
    this.isResizing = false
    this.activeGuideLinesX = []
    this.activeGuideLinesY = []
    this.clearDragListeners()
  }

  private clearDragListeners() {
    if (this.boundMouseMove) {
      window.removeEventListener('mousemove', this.boundMouseMove)
    }
    if (this.boundMouseUp) {
      window.removeEventListener('mouseup', this.boundMouseUp)
    }
  }

  // キーボードイベント（Escapeでキャンセル、矢印キーで微調整）
  onKeyDown(e: KeyboardEvent) {
    if (!this.isOpen) return

    if (e.key === 'Escape') {
      if (this.isDragging) {
        if (this.selectedItem) {
          this.$set(this.selectedItem, 'x', this.itemInitialX)
          this.$set(this.selectedItem, 'y', this.itemInitialY)
        }
        this.isDragging = false
        this.activeGuideLinesX = []
        this.activeGuideLinesY = []
        this.clearDragListeners()
      } else {
        this.onClose()
      }
      return
    }

    // 矢印キーでの微調整
    if (this.selectedItem && !this.isDragging && !this.isResizing) {
      const activeEl = document.activeElement
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT')) {
        return
      }

      const step = e.shiftKey ? 10 : 1
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.$set(this.selectedItem, 'x', Math.max(0, this.selectedItem.x - step))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        this.$set(this.selectedItem, 'x', Math.min(this.atlasSize - this.selectedItem.width, this.selectedItem.x + step))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.$set(this.selectedItem, 'y', Math.max(0, this.selectedItem.y - step))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.$set(this.selectedItem, 'y', Math.min(this.atlasSize - this.selectedItem.height, this.selectedItem.y + step))
      }
    }
  }

  onClose() {
    this.$emit('close')
  }

  async onApply() {
    if (this.items.length === 0) return
    this.isProcessing = true

    try {
      const canvas = document.createElement('canvas')
      canvas.width = this.atlasSize
      canvas.height = this.atlasSize
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Canvas 2D context not available')
      }

      ctx.clearRect(0, 0, this.atlasSize, this.atlasSize)

      for (const item of this.items) {
        let img = item.imgElement
        if (!img) {
          img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image()
            el.onload = () => resolve(el)
            el.onerror = reject
            el.src = item.src || ''
          })
        }
        ctx.drawImage(img, item.x, item.y, item.width, item.height)
      }

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => {
          if (b) resolve(b)
          else reject(new Error('Canvas toBlob failed'))
        }, 'image/png')
      })

      this.$emit('apply-atlas', {
        blob,
        items: this.items.map(it => ({
          ...it,
          atlasWidth: this.atlasSize,
          atlasHeight: this.atlasSize
        }))
      })
    } catch (e) {
      console.error('Atlas creation failed', e)
      alert('アトラス画像の生成に失敗しました: ' + e)
    } finally {
      this.isProcessing = false
    }
  }
}
</script>

<style scoped lang="scss">
$primary: #0284c7;
$primary-dark: #0369a1;
$border-color: #cbd5e1;
$bg-dark: #0f172a;
$text-main: #1e293b;
$text-sub: #64748b;
$warn: #ef4444;
$guide-color: #ec4899;

.atlas-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.atlas-modal-container {
  width: 94vw;
  max-width: 1200px;
  height: 90vh;
  max-height: 850px;
  background: #ffffff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: $text-main;
}

/* ヘッダー */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid $border-color;

  .header-title {
    display: flex;
    align-items: center;
    gap: 10px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: bold;
    }

    .header-badge {
      background: #e0f2fe;
      color: $primary;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: $text-sub;

    &:hover {
      color: $text-main;
    }
  }
}

/* ツールバー */
.modal-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: #f1f5f9;
  border-bottom: 1px solid $border-color;
  flex-wrap: wrap;

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;

    .toolbar-label {
      font-size: 12px;
      font-weight: 600;
      color: $text-sub;
    }

    .size-select {
      padding: 4px 8px;
      font-size: 12px;
      border: 1px solid $border-color;
      border-radius: 4px;
      background: #fff;
    }

    .num-input-small {
      width: 48px;
      padding: 4px 6px;
      font-size: 12px;
      border: 1px solid $border-color;
      border-radius: 4px;
    }

    .unit {
      font-size: 11px;
      color: $text-sub;
    }

    .btn-tool {
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid $border-color;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background: #e2e8f0;
      }
    }

    .toggle-label-mini {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: $text-main;
      cursor: pointer;
      user-select: none;
      background: #ffffff;
      padding: 4px 8px;
      border: 1px solid $border-color;
      border-radius: 4px;

      input[type="checkbox"] {
        cursor: pointer;
      }
    }
  }

  .zoom-group {
    margin-left: auto;

    .btn-mini {
      padding: 2px 8px;
      font-size: 12px;
      background: #fff;
      border: 1px solid $border-color;
      border-radius: 3px;
      cursor: pointer;
    }

    .zoom-text {
      font-size: 12px;
      min-width: 40px;
      text-align: center;
      font-weight: bold;
    }
  }
}

/* メインボディ */
.modal-main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* キャンバスビューポート */
.canvas-viewport {
  flex: 1;
  background: #1e293b;
  overflow: auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
}

.canvas-board {
  position: relative;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.6);
  border: 1px solid #475569;
  flex-shrink: 0;

  .board-grid {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #2e3440;
    background-image: 
      linear-gradient(45deg, #242933 25%, transparent 25%), 
      linear-gradient(-45deg, #242933 25%, transparent 25%), 
      linear-gradient(45deg, transparent 75%, #242933 75%), 
      linear-gradient(-45deg, transparent 75%, #242933 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }

  /* ガイド線 */
  .guide-line {
    position: absolute;
    z-index: 15;
    pointer-events: none;

    &.guide-line-x {
      top: 0;
      bottom: 0;
      width: 1px;
      border-left: 1px dashed $guide-color;
      box-shadow: 0 0 2px $guide-color;
    }

    &.guide-line-y {
      left: 0;
      right: 0;
      height: 1px;
      border-top: 1px dashed $guide-color;
      box-shadow: 0 0 2px $guide-color;
    }
  }
}

/* 配置アイテム */
.atlas-item-box {
  position: absolute;
  cursor: grab;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: box-shadow 0.1s;
  user-select: none;

  &:hover {
    border-color: #38bdf8;
  }

  &.selected {
    border: 2px solid #0284c7;
    box-shadow: 0 0 8px rgba(2, 132, 199, 0.8);
    z-index: 10;
  }

  &.dragging {
    cursor: grabbing;
    opacity: 0.85;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 25;
  }

  &.colliding {
    border: 2px dashed $warn;
    background: rgba(239, 68, 68, 0.2);
  }

  .item-img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
    pointer-events: none;
  }

  .item-label-tag {
    position: absolute;
    top: 2px;
    left: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: #ffffff;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90%;
    pointer-events: none;
  }

  .drag-coord-badge {
    position: absolute;
    bottom: -22px;
    left: 50%;
    transform: translateX(-50%);
    background: #0284c7;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 30;
  }
}

/* リサイズハンドル */
.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ffffff;
  border: 1.5px solid #0284c7;
  border-radius: 50%;
  z-index: 20;

  &.handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
  &.handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
  &.handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
  &.handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
  &.handle-n  { top: -4px; left: calc(50% - 4px); cursor: n-resize; }
  &.handle-s  { bottom: -4px; left: calc(50% - 4px); cursor: s-resize; }
  &.handle-w  { top: calc(50% - 4px); left: -4px; cursor: w-resize; }
  &.handle-e  { top: calc(50% - 4px); right: -4px; cursor: e-resize; }
}

/* インスペクター */
.modal-inspector {
  width: 280px;
  background: #f8fafc;
  border-left: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 12px;
  gap: 12px;

  .warning-banner {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #b91c1c;
    font-size: 11px;
    padding: 6px 8px;
    border-radius: 4px;

    &.info {
      background: #f0fdf4;
      border-color: #86efac;
      color: #15803d;
    }
  }

  .inspector-section {
    background: #ffffff;
    border: 1px solid $border-color;
    border-radius: 6px;
    padding: 10px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: bold;
      color: $text-main;
    }

    &.no-selection {
      text-align: center;
      color: $text-sub;
      font-size: 12px;
      padding: 20px 10px;
    }

    .prop-item-header {
      display: flex;
      flex-direction: column;
      margin-bottom: 8px;

      .prop-name {
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .prop-orig-size {
        font-size: 11px;
        color: $text-sub;
      }
    }

    .prop-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 8px;

      .prop-field {
        display: flex;
        flex-direction: column;
        gap: 2px;

        label {
          font-size: 10px;
          color: $text-sub;
        }

        input {
          padding: 3px 6px;
          font-size: 12px;
          border: 1px solid $border-color;
          border-radius: 3px;
        }
      }
    }

    .prop-toggles {
      margin-bottom: 8px;

      .toggle-check {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        cursor: pointer;
      }
    }

    .prop-quick-btns {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;

      .btn-sub {
        flex: 1;
        padding: 4px 6px;
        font-size: 11px;
        background: #f1f5f9;
        border: 1px solid $border-color;
        border-radius: 3px;
        cursor: pointer;

        &:hover {
          background: #e2e8f0;
        }
      }
    }

    .drag-hint {
      font-size: 10px;
      color: $text-sub;
      background: #f1f5f9;
      padding: 4px 6px;
      border-radius: 4px;
      line-height: 1.4;
    }
  }

  .items-list-section {
    flex: 1;
    display: flex;
    flex-direction: column;

    .items-scroll-list {
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .item-list-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;

        &:hover {
          background: #f1f5f9;
        }

        &.active {
          background: #e0f2fe;
          font-weight: 600;
        }

        .row-thumb {
          width: 24px;
          height: 24px;
          object-fit: cover;
          border-radius: 2px;
          border: 1px solid $border-color;
        }

        .row-info {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;

          .row-name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .row-coord {
            font-size: 10px;
            color: $text-sub;
          }
        }

        .badge-warn {
          background: #fef08a;
          color: #854d0e;
          font-size: 9px;
          padding: 1px 3px;
          border-radius: 2px;
          font-weight: bold;
        }
      }
    }
  }
}

/* フッター */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid $border-color;

  .reduction-hint {
    font-size: 12px;
    color: $text-sub;
  }

  .footer-right {
    display: flex;
    gap: 8px;

    .btn-cancel {
      padding: 8px 16px;
      font-size: 13px;
      background: #ffffff;
      border: 1px solid $border-color;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background: #f1f5f9;
      }
    }

    .btn-apply {
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
      background: $primary;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: $primary-dark;
      }

      &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
      }
    }
  }
}
</style>
