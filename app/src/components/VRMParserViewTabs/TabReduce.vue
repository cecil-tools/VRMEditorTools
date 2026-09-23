<template>
  <div class="tabContents tabReduce" v-if="selectTabType === 'tab_reduce'">
    <!-- モデル統計・ステータスカード -->
    <div class="section-card stats-card">
      <div class="card-header">
        <span class="card-title">📊 {{ $t('reduce.modelStatsTitle') }}</span>
        <div class="status-badges">
          <span
            class="badge"
            :class="isClusterPassed ? 'badge-success' : 'badge-warning'"
            :title="$t('reduce.clusterLimitHint')"
          >
            cluster (32,000△): {{ isClusterPassed ? '✓ ' + $t('reduce.pass') : '⚠️ ' + $t('reduce.over') }}
          </span>
          <span
            class="badge"
            :class="isQuestPassed ? 'badge-success' : 'badge-warning'"
            :title="$t('reduce.questLimitHint')"
          >
            Quest (15,000△): {{ isQuestPassed ? '✓ ' + $t('reduce.pass') : '⚠️ ' + $t('reduce.over') }}
          </span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">{{ $t('reduce.originalTriangles') }}</span>
          <span class="stat-value">{{ originalTotalTriangles.toLocaleString() }} △</span>
        </div>
        <div class="stat-item highlight">
          <span class="stat-label">{{ $t('reduce.reducedTriangles') }}</span>
          <span class="stat-value">{{ previewTotalTriangles.toLocaleString() }} △</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('reduce.reductionRate') }}</span>
          <span class="stat-value text-accent">{{ currentReductionPercent }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('reduce.totalVertices') }}</span>
          <span class="stat-value">{{ originalTotalVertices.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- プリセットボタン -->
    <div class="section-card presets-card">
      <label class="section-label">⚡ {{ $t('reduce.presetsTitle') }}</label>
      <div class="preset-btn-group">
        <button type="button" class="btn-preset" @click="applyPreset('cluster')">
          🌐 cluster (32,000△)
        </button>
        <button type="button" class="btn-preset" @click="applyPreset('quest')">
          🥽 Quest (15,000△)
        </button>
        <button type="button" class="btn-preset" @click="applyPreset('half')">
          📉 50% {{ $t('reduce.reduce') }}
        </button>
        <button type="button" class="btn-preset" @click="applyPreset('light')">
          🤏 20% {{ $t('reduce.reduce') }}
        </button>
        <button type="button" class="btn-preset btn-reset" @click="resetReduction">
          ↺ {{ $t('reduce.reset') }}
        </button>
      </div>
    </div>

    <!-- 削減コントロールスライダー -->
    <div class="section-card controls-card">
      <div class="control-row">
        <div class="control-header">
          <span class="control-label">{{ $t('reduce.reductionRatio') }}</span>
          <div class="control-input-box">
            <input
              type="number"
              min="0"
              max="90"
              step="1"
              v-model.number="reductionPercent"
              @input="onPercentInput"
              class="num-input"
            />
            <span class="unit">%</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="90"
          step="1"
          v-model.number="reductionPercent"
          @input="onSliderChange"
          class="range-slider"
        />
      </div>

      <div class="control-row">
        <div class="control-header">
          <span class="control-label">{{ $t('reduce.targetTriangles') }}</span>
          <div class="control-input-box">
            <input
              type="number"
              min="1000"
              :max="originalTotalTriangles"
              step="500"
              v-model.number="targetTrianglesInput"
              @input="onTargetTrianglesInput"
              class="num-input num-wide"
            />
            <span class="unit">△</span>
          </div>
        </div>
      </div>

      <!-- オプショントグル -->
      <div class="options-group">
        <label class="toggle-option">
          <input
            type="checkbox"
            v-model="protectMorphTargets"
            @change="triggerSimplification"
          />
          <span class="toggle-text">
            🛡️ {{ $t('reduce.protectMorphTargets') }}
            <span class="sub-hint">({{ $t('reduce.protectMorphTargetsHint') }})</span>
          </span>
        </label>

        <label class="toggle-option">
          <input
            type="checkbox"
            v-model="wireframeMode"
            @change="onWireframeToggle"
          />
          <span class="toggle-text">
            🕸️ {{ $t('reduce.wireframeMode') }}
            <span class="sub-hint">({{ $t('reduce.wireframeModeHint') }})</span>
          </span>
        </label>
      </div>
    </div>

    <!-- メッシュ一覧 & 個別選択 -->
    <div class="section-card meshes-card">
      <div class="mesh-card-header" @click="isMeshListOpen = !isMeshListOpen">
        <span class="section-label">
          {{ isMeshListOpen ? '▼' : '▶' }} 🧩 {{ $t('reduce.meshListTitle') }} ({{ primitivesList.length }} {{ $t('reduce.parts') }})
        </span>
        <span class="toggle-hint">{{ isMeshListOpen ? $t('reduce.close') : $t('reduce.open') }}</span>
      </div>

      <div v-show="isMeshListOpen" class="mesh-table-container">
        <table class="mesh-table">
          <thead>
            <tr>
              <th class="col-check">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th>{{ $t('reduce.meshName') }}</th>
              <th>{{ $t('reduce.material') }}</th>
              <th class="col-num">{{ $t('reduce.originalTri') }}</th>
              <th class="col-num">{{ $t('reduce.reducedTri') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in primitivesList"
              :key="idx"
              :class="{
                'row-disabled': protectMorphTargets && item.hasMorphTargets,
                'row-selected': isPrimitiveSelected(item)
              }"
            >
              <td class="col-check">
                <input
                  type="checkbox"
                  :checked="isPrimitiveSelected(item)"
                  :disabled="protectMorphTargets && item.hasMorphTargets"
                  @change="togglePrimitiveSelect(item)"
                />
              </td>
              <td>
                <span class="mesh-name">{{ item.meshName }}</span>
                <span v-if="item.hasMorphTargets" class="tag tag-morph" :title="$t('reduce.hasMorphTargets')">
                  {{ $t('reduce.tagMorph') }}
                </span>
                <span v-if="item.hasSkin" class="tag tag-skin">
                  {{ $t('reduce.tagSkin') }}
                </span>
              </td>
              <td class="mat-name" :title="item.materialName">{{ item.materialName }}</td>
              <td class="col-num">{{ item.triangleCount.toLocaleString() }}</td>
              <td class="col-num font-bold">
                {{ getPreviewCountForPrim(item).toLocaleString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- アクションバー -->
    <div class="common-actions-bar">
      <div class="action-status">
        <span v-if="isProcessing" class="status-loading">⏳ {{ $t('reduce.processing') }}</span>
        <span v-else-if="hasChanges" class="status-unsaved">
          ● {{ $t('reduce.previewActive', { diff: currentReductionPercent }) }}
        </span>
        <span v-else class="status-saved">✓ {{ $t('reduce.originalState') }}</span>
      </div>

      <div class="action-buttons">
        <button
          type="button"
          class="btn-action-sec"
          @click="downloadOptimizedVRM"
          :disabled="isProcessing || !hasChanges"
        >
          💾 {{ $t('reduce.downloadVRM') }}
        </button>
        <button
          type="button"
          class="btn-action-pri"
          @click="applyToVRM"
          :disabled="isProcessing || !hasChanges"
        >
          ✨ {{ $t('reduce.applyToVRM') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'
import { MeshOptimizer, PrimitiveMeshStats, ReducedPrimitiveResult } from '@/module/MeshOptimizer'

@Component
export default class TabReduce extends Vue {
  @Prop() selectTabType!: string
  @Prop() json!: any
  @Prop() drawVrm!: (file: File) => void

  // 削減パラメータ
  reductionPercent = 0 // 0% ~ 90%
  targetTrianglesInput = 0
  protectMorphTargets = true
  wireframeMode = false
  isMeshListOpen = false

  // 状態管理
  isProcessing = false
  hasChanges = false
  primitivesList: PrimitiveMeshStats[] = []
  selectedKeys: Set<string> = new Set()
  reducedResults: ReducedPrimitiveResult[] = []

  // デバウンスタイマー
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  mounted(): void {
    this.initStats()
  }

  @Watch('json', { immediate: true })
  onJsonChange(): void {
    this.initStats()
  }

  @Watch('selectTabType')
  onTabChange(newTab: string): void {
    if (newTab !== 'tab_reduce') {
      // 別のタブに移動した際はワイヤーフレームを解除
      if (this.wireframeMode) {
        this.wireframeMode = false
        this.$emit('set-wireframe', false)
      }
    }
  }

  // モデル統計の初期化
  initStats(): void {
    if (!VRMParser.json) return
    const stats = MeshOptimizer.getModelPolygonStats(VRMParser.json)
    this.primitivesList = stats.primitives

    // 初期状態は全メッシュを選択
    this.selectedKeys = new Set(
      this.primitivesList.map(p => `${p.meshIndex}_${p.primitiveIndex}`)
    )

    this.targetTrianglesInput = stats.totalTriangles
    this.reductionPercent = 0
    this.hasChanges = false
    this.reducedResults = []
  }

  get originalTotalTriangles(): number {
    return this.primitivesList.reduce((sum, p) => sum + p.triangleCount, 0)
  }

  get originalTotalVertices(): number {
    return this.primitivesList.reduce((sum, p) => sum + p.vertexCount, 0)
  }

  get previewTotalTriangles(): number {
    if (!this.hasChanges || this.reducedResults.length === 0) {
      return this.originalTotalTriangles
    }
    const resultMap = new Map<string, number>()
    this.reducedResults.forEach(r => {
      resultMap.set(`${r.meshIndex}_${r.primitiveIndex}`, r.newTriangleCount)
    })

    return this.primitivesList.reduce((sum, p) => {
      const key = `${p.meshIndex}_${p.primitiveIndex}`
      return sum + (resultMap.get(key) ?? p.triangleCount)
    }, 0)
  }

  get isClusterPassed(): boolean {
    return this.previewTotalTriangles <= 32000
  }

  get isQuestPassed(): boolean {
    return this.previewTotalTriangles <= 15000
  }

  get currentReductionPercent(): number {
    if (this.originalTotalTriangles === 0) return 0
    const diff = this.originalTotalTriangles - this.previewTotalTriangles
    return Math.round((diff / this.originalTotalTriangles) * 100)
  }

  get isAllSelected(): boolean {
    return this.primitivesList.every(p => this.selectedKeys.has(`${p.meshIndex}_${p.primitiveIndex}`))
  }

  isPrimitiveSelected(prim: PrimitiveMeshStats): boolean {
    return this.selectedKeys.has(`${prim.meshIndex}_${prim.primitiveIndex}`)
  }

  togglePrimitiveSelect(prim: PrimitiveMeshStats): void {
    const key = `${prim.meshIndex}_${prim.primitiveIndex}`
    if (this.selectedKeys.has(key)) {
      this.selectedKeys.delete(key)
    } else {
      this.selectedKeys.add(key)
    }
    this.triggerSimplification()
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedKeys.clear()
    } else {
      this.selectedKeys = new Set(
        this.primitivesList.map(p => `${p.meshIndex}_${p.primitiveIndex}`)
      )
    }
    this.triggerSimplification()
  }

  getPreviewCountForPrim(prim: PrimitiveMeshStats): number {
    const found = this.reducedResults.find(
      r => r.meshIndex === prim.meshIndex && r.primitiveIndex === prim.primitiveIndex
    )
    return found ? found.newTriangleCount : prim.triangleCount
  }

  // プリセット適用
  applyPreset(type: 'cluster' | 'quest' | 'half' | 'light'): void {
    const orig = this.originalTotalTriangles
    if (orig === 0) return

    switch (type) {
      case 'cluster': {
        const target = 32000
        if (orig > target) {
          this.reductionPercent = Math.min(90, Math.max(1, Math.round(((orig - target) / orig) * 100)))
          this.targetTrianglesInput = target
        } else {
          this.reductionPercent = 0
          this.targetTrianglesInput = orig
        }
        break
      }
      case 'quest': {
        const target = 15000
        if (orig > target) {
          this.reductionPercent = Math.min(90, Math.max(1, Math.round(((orig - target) / orig) * 100)))
          this.targetTrianglesInput = target
        } else {
          this.reductionPercent = 0
          this.targetTrianglesInput = orig
        }
        break
      }
      case 'half':
        this.reductionPercent = 50
        this.targetTrianglesInput = Math.round(orig * 0.5)
        break
      case 'light':
        this.reductionPercent = 20
        this.targetTrianglesInput = Math.round(orig * 0.8)
        break
    }

    this.triggerSimplification()
  }

  onSliderChange(): void {
    const orig = this.originalTotalTriangles
    this.targetTrianglesInput = Math.round(orig * (1 - this.reductionPercent / 100))
    this.scheduleSimplification()
  }

  onPercentInput(): void {
    if (this.reductionPercent < 0) this.reductionPercent = 0
    if (this.reductionPercent > 90) this.reductionPercent = 90
    this.onSliderChange()
  }

  onTargetTrianglesInput(): void {
    const orig = this.originalTotalTriangles
    if (orig === 0) return
    const target = Math.max(1, Math.min(orig, this.targetTrianglesInput))
    this.reductionPercent = Math.min(90, Math.max(0, Math.round(((orig - target) / orig) * 100)))
    this.scheduleSimplification()
  }

  onWireframeToggle(): void {
    this.$emit('set-wireframe', this.wireframeMode)
  }

  resetReduction(): void {
    this.reductionPercent = 0
    this.targetTrianglesInput = this.originalTotalTriangles
    this.hasChanges = false
    this.reducedResults = []
    this.$emit('reset-polygon-reduction')
  }

  scheduleSimplification(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerSimplification()
    }, 150)
  }

  async triggerSimplification(): Promise<void> {
    if (this.reductionPercent === 0) {
      this.resetReduction()
      return
    }

    if (!VRMParser.json || !VRMParser.chunk1?.chunkData) return

    this.isProcessing = true
    try {
      const results = await MeshOptimizer.simplifyVRM(
        VRMParser.json,
        VRMParser.chunk1.chunkData,
        {
          ratio: this.reductionPercent / 100,
          protectMorphTargets: this.protectMorphTargets,
          selectedPrimitives: this.selectedKeys
        }
      )

      this.reducedResults = results
      this.hasChanges = results.length > 0

      // 3Dビューへプレビュー反映
      this.$emit('preview-polygon-reduction', results)
    } catch (e) {
      console.error('Simplification error:', e)
    } finally {
      this.isProcessing = false
    }
  }

  // VRMに適用
  async applyToVRM(): Promise<void> {
    if (!this.hasChanges || this.reducedResults.length === 0) return

    this.isProcessing = true
    try {
      // 1. VRMParserのバイナリとJSONを更新
      await VRMParser.applyPolygonReduction(this.reducedResults)

      // 2. 新VRMファイルを再生成
      const newFile = await VRMParser.createVRMFile()

      // 3. 3Dモデルを再描画
      if (this.drawVrm) {
        await this.drawVrm(newFile)
      }

      // 4. 状態リセット
      this.hasChanges = false
      this.reductionPercent = 0
      this.initStats()
      this.$emit('reset-polygon-reduction')

      alert(this.$t('reduce.appliedSuccess'))
    } catch (e) {
      console.error('Apply to VRM error:', e)
      alert(this.$t('reduce.applyError') + ': ' + e)
    } finally {
      this.isProcessing = false
    }
  }

  // 最適化VRMをダウンロード
  async downloadOptimizedVRM(): Promise<void> {
    if (!this.hasChanges || this.reducedResults.length === 0) return

    this.isProcessing = true
    try {
      // 1. VRMParserのバイナリとJSONを更新
      await VRMParser.applyPolygonReduction(this.reducedResults)

      // 2. 新VRMファイル生成
      const newFile = await VRMParser.createVRMFile()

      // 3. ダウンロード実行
      const link = document.createElement('a')
      link.href = URL.createObjectURL(newFile)
      const baseName = (VRMParser.filename || 'model').replace(/\.vrm$/i, '')
      link.download = `${baseName}_reduced_${this.currentReductionPercent}pct.vrm`
      link.click()
      URL.revokeObjectURL(link.href)

      // 4. 状態更新
      this.hasChanges = false
      this.reductionPercent = 0
      this.initStats()
      this.$emit('reset-polygon-reduction')
    } catch (e) {
      console.error('Download VRM error:', e)
      alert(this.$t('reduce.downloadError') + ': ' + e)
    } finally {
      this.isProcessing = false
    }
  }
}
</script>

<style scoped lang="scss">
$primary: #0284c7;
$primary-dark: #0369a1;
$bg-subtle: #f8fafc;
$border-color: #cbd5e1;
$text-main: #1e293b;
$text-sub: #64748b;
$success: #16a34a;
$warning: #d97706;

.tabReduce {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;
  background: #f1f5f9;
  border-radius: 0 0 6px 6px;
  overflow-x: hidden;
  gap: 8px;
  padding: 8px;
}

.section-card {
  background: #ffffff;
  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 10px 12px;
  box-sizing: border-box;
  width: 100%;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 6px;

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: $text-main;
    }

    .status-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;

      .badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;

        &.badge-success {
          background: #dcfce7;
          color: $success;
        }

        &.badge-warning {
          background: #fef3c7;
          color: $warning;
        }
      }
    }
  }

  .section-label {
    font-size: 12px;
    font-weight: 700;
    color: $text-main;
    display: block;
    margin-bottom: 6px;
  }
}

/* 統計グリッド */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;

  .stat-item {
    background: $bg-subtle;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 6px 4px;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;

    &.highlight {
      background: #f0f9ff;
      border-color: #bae6fd;
      .stat-value {
        color: $primary-dark;
      }
    }

    .stat-label {
      font-size: 10px;
      color: $text-sub;
      margin-bottom: 2px;
    }

    .stat-value {
      font-size: 12px;
      font-weight: 700;
      color: $text-main;

      &.text-accent {
        color: #ef4444;
      }
    }
  }
}

/* プリセットボタン */
.presets-card {
  .preset-btn-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .btn-preset {
      flex: 1 1 calc(33.3% - 6px);
      padding: 6px 4px;
      font-size: 11px;
      font-weight: 600;
      background: #ffffff;
      border: 1px solid $border-color;
      border-radius: 4px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;

      &:hover {
        background: #e0f2fe;
        border-color: $primary;
        color: $primary-dark;
      }

      &.btn-reset {
        background: #fef2f2;
        border-color: #fca5a5;
        color: #ef4444;
        &:hover {
          background: #fee2e2;
        }
      }
    }
  }
}

/* 削減コントロール */
.controls-card {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .control-row {
    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .control-label {
        font-size: 12px;
        font-weight: 600;
        color: $text-main;
      }

      .control-input-box {
        display: flex;
        align-items: center;
        gap: 2px;

        .num-input {
          width: 44px;
          padding: 2px 4px;
          font-size: 11px;
          border: 1px solid $border-color;
          border-radius: 3px;
          text-align: right;

          &.num-wide {
            width: 64px;
          }
        }

        .unit {
          font-size: 10px;
          color: $text-sub;
        }
      }
    }

    .range-slider {
      width: 100%;
      height: 6px;
      margin: 0;
      cursor: pointer;
    }
  }

  .options-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px dashed #e2e8f0;

    .toggle-option {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 11px;
      color: $text-main;

      input {
        cursor: pointer;
      }

      .toggle-text {
        font-weight: 600;
      }

      .sub-hint {
        font-size: 10px;
        color: $text-sub;
        font-weight: normal;
      }
    }
  }
}

/* メッシュ一覧テーブル */
.meshes-card {
  .mesh-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;

    .toggle-hint {
      font-size: 11px;
      color: $primary;
    }
  }

  .mesh-table-container {
    margin-top: 8px;
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid $border-color;
    border-radius: 4px;

    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
  }

  .mesh-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;

    thead {
      background: #f1f5f9;
      position: sticky;
      top: 0;
      z-index: 1;

      th {
        padding: 4px 6px;
        text-align: left;
        font-weight: 600;
        color: $text-sub;
        border-bottom: 1px solid $border-color;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.1s;

        &:hover {
          background: #f8fafc;
        }

        &.row-disabled {
          opacity: 0.6;
          background: #f8fafc;
        }

        &.row-selected {
          background: #f0f9ff;
        }
      }

      td {
        padding: 5px 6px;
        vertical-align: middle;
      }
    }

    .col-check {
      width: 28px;
      text-align: center;
    }

    .col-num {
      text-align: right;
      font-family: monospace;
    }

    .mesh-name {
      font-weight: 600;
      color: $text-main;
      margin-right: 4px;
    }

    .mat-name {
      color: $text-sub;
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tag {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      margin-left: 2px;

      &.tag-morph {
        background: #fef3c7;
        color: #92400e;
      }
      &.tag-skin {
        background: #e0f2fe;
        color: #0369a1;
      }
    }
  }
}

/* アクションバー */
.common-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #0f172a;
  border-top: 1px solid #334155;
  border-radius: 0 0 6px 6px;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  z-index: 10;
  min-width: 0;

  .action-status {
    font-size: 11px;

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
    gap: 8px;

    .btn-action-sec {
      padding: 6px 12px;
      font-size: 11px;
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
      padding: 6px 14px;
      font-size: 11px;
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
}

@media screen and (max-width: 480px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .presets-card .preset-btn-group .btn-preset {
    flex: 1 1 calc(50% - 6px);
  }
}
</style>
