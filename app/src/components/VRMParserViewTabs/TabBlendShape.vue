<template>
  <div class="tabContents tabBlendShape" v-if="selectTabType == 'tab_blendshape'">
    <!-- 上部アクションバー -->
    <div class="top-actions">
      <button class="action-btn btn-download" @click="clickDownloadAll" :title="$t('blendShape.select')">
        📷 Download All
      </button>
      <button class="action-btn btn-reset" @click="clickResetAll">
        ↺ {{ $t('blendShape.btnResetAll') }}
      </button>
      <button class="action-btn btn-add" @click="openAddModal">
        {{ $t('blendShape.btnAddBlendShape') }}
      </button>
    </div>

    <div v-if="statusMessage" class="status-message">
      {{ statusMessage }}
    </div>

    <hr class="separator" />

    <!-- 新規追加モーダル / 展開エリア -->
    <div v-if="showAddModal" class="add-clip-panel">
      <div class="panel-header">
        <h3>{{ $t('blendShape.newClipTitle') }}</h3>
        <button class="btn-close" @click="closeAddModal">✕</button>
      </div>
      <div class="form-group">
        <label>{{ $t('blendShape.clipName') }}:</label>
        <input type="text" v-model="newClip.name" placeholder="例: Smile_Extra, Tongue" class="input-text" />
      </div>
      <div class="form-group">
        <label>{{ $t('blendShape.presetName') }}:</label>
        <select v-model="newClip.presetName" class="select-box">
          <option :value="vrmVersion && vrmVersion.version === 0 ? 'unknown' : 'custom'">
            {{ $t('blendShape.custom') }}
          </option>
          <option v-for="p in availablePresets" :key="p" :value="p">
            {{ blendShapeName(p) }}
          </option>
        </select>
      </div>
      <div class="form-group-checkbox">
        <label>
          <input type="checkbox" v-model="newClip.isBinary" />
          {{ $t('blendShape.isBinary') }}
        </label>
      </div>

      <!-- 初期バインド設定 -->
      <div class="binds-section">
        <h4>{{ $t('blendShape.bindList') }}</h4>
        <div v-if="newClip.binds.length === 0" class="no-binds">
          {{ $t('blendShape.noBinds') }}
        </div>
        <div v-for="(bind, bIndex) in newClip.binds" :key="bIndex" class="bind-row">
          <div class="bind-info">
            <span class="bind-mesh">{{ getMeshName(bind.mesh) }}</span>
            <span class="bind-target">{{ getMorphTargetName(bind.mesh, bind.index) }}</span>
            <span class="bind-weight">Weight: {{ bind.weight }}%</span>
          </div>
          <button class="btn-delete-small" @click="removeNewClipBind(bIndex)">✕</button>
        </div>

        <!-- バインド追加フォーム -->
        <div class="add-bind-box" v-if="morphMeshes && morphMeshes.length > 0">
          <div class="bind-inputs">
            <select v-model.number="tempBind.mesh" class="select-box" @change="onTempBindMeshChange">
              <option v-for="m in morphMeshes" :key="m.meshIndex" :value="m.meshIndex">
                {{ m.name }}
              </option>
            </select>
            <select v-model.number="tempBind.index" class="select-box">
              <option v-for="idx in getMorphIndices(tempBind.mesh)" :key="idx" :value="idx">
                {{ getMorphTargetName(tempBind.mesh, idx) }}
              </option>
            </select>
            <div class="weight-input-wrap">
              <span>{{ tempBind.weight }}%</span>
              <input type="range" min="0" max="100" v-model.number="tempBind.weight" class="range-slider" />
            </div>
          </div>
          <!-- モーフ動作確認スライダー -->
          <div class="test-morph-wrap">
            <span class="test-label">🔍 {{ $t('blendShape.testMorph') }}:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              v-model.number="tempBindTestWeight"
              @input="onTestMorphInput(tempBind.mesh, tempBind.index, tempBindTestWeight)"
              class="range-slider test-slider"
            />
          </div>
          <button class="btn-add-bind" @click="addNewClipBind">
            ＋ {{ $t('blendShape.btnAddBind') }}
          </button>
        </div>
      </div>

      <div class="modal-buttons">
        <button class="btn-save-main" @click="createBlendShape">
          {{ $t('blendShape.btnCreateClip') }}
        </button>
        <button class="btn-cancel" @click="closeAddModal">
          {{ $t('blendShape.btnClose') }}
        </button>
      </div>
    </div>

    <!-- 既存ブレンドシェイプの詳細・バインド編集パネル -->
    <div v-if="editingClip" class="edit-clip-panel">
      <div class="panel-header">
        <h3>{{ $t('blendShape.btnEdit') }}: {{ blendShapeName(editingClip.name || editingClip.presetName) }}</h3>
        <button class="btn-close" @click="closeEditPanel">✕</button>
      </div>

      <div class="edit-meta-row">
        <div class="meta-item">
          <label>{{ $t('blendShape.clipName') }}:</label>
          <input type="text" v-model="editingClip.name" class="input-text" :disabled="!editingClip.isCustom" />
        </div>
        <div class="meta-item">
          <label>{{ $t('blendShape.presetName') }}:</label>
          <span class="preset-badge">{{ editingClip.presetName || 'custom' }}</span>
        </div>
        <div class="meta-item-checkbox">
          <label>
            <input type="checkbox" v-model="editingClip.isBinary" />
            {{ $t('blendShape.isBinary') }}
          </label>
        </div>
      </div>

      <!-- バインド一覧テーブル -->
      <div class="binds-section">
        <h4>{{ $t('blendShape.bindList') }}</h4>
        <div v-if="editingClipBinds.length === 0" class="no-binds">
          {{ $t('blendShape.noBinds') }}
        </div>
        <div class="binds-list" v-if="editingClipBinds.length > 0">
          <div v-for="(bind, bIndex) in editingClipBinds" :key="bIndex" class="bind-item-card">
            <!-- ヘッダー: メッシュとモーフターゲット名、削除ボタン -->
            <div class="bind-card-header">
              <div class="bind-names">
                <span class="mesh-badge">{{ getMeshName(bind.mesh) }}</span>
                <span class="morph-name">{{ getMorphTargetName(bind.mesh, bind.index) }}</span>
              </div>
              <button class="btn-delete-small" @click="removeEditingBind(bIndex)" title="バインド削除">✕</button>
            </div>

            <!-- コントロール群: 連動ウェイト & モーフテスト動作 -->
            <div class="bind-card-controls">
              <div class="control-row weight-row">
                <span class="control-label">{{ $t('blendShape.bindWeight') }}:</span>
                <div class="slider-with-val">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    v-model.number="bind.weight"
                    @input="onEditingBindWeightChange"
                    class="range-slider main-range"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    v-model.number="bind.weight"
                    @input="onEditingBindWeightChange"
                    class="number-input-mini"
                  />
                  <span class="unit">%</span>
                </div>
              </div>

              <div class="control-row test-row">
                <span class="control-label test-label">🔍 {{ $t('blendShape.testMorph') }}:</span>
                <div class="slider-with-val">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    v-model.number="bindTestWeights[bIndex]"
                    @input="onTestMorphInput(bind.mesh, bind.index, bindTestWeights[bIndex])"
                    class="range-slider test-slider"
                  />
                  <span class="test-val">{{ Math.round((bindTestWeights[bIndex] || 0) * 100) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 既存クリップへのバインド追加 -->
        <div class="add-bind-box" v-if="morphMeshes && morphMeshes.length > 0">
          <div class="bind-inputs">
            <select v-model.number="tempBind.mesh" class="select-box" @change="onTempBindMeshChange">
              <option v-for="m in morphMeshes" :key="m.meshIndex" :value="m.meshIndex">
                {{ m.name }}
              </option>
            </select>
            <select v-model.number="tempBind.index" class="select-box">
              <option v-for="idx in getMorphIndices(tempBind.mesh)" :key="idx" :value="idx">
                {{ getMorphTargetName(tempBind.mesh, idx) }}
              </option>
            </select>
            <div class="weight-input-wrap">
              <span>{{ tempBind.weight }}%</span>
              <input type="range" min="0" max="100" v-model.number="tempBind.weight" class="range-slider" />
            </div>
          </div>
          <!-- モーフテスト動作 -->
          <div class="test-morph-wrap">
            <span class="test-label">🔍 {{ $t('blendShape.testMorph') }}:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              v-model.number="tempBindTestWeight"
              @input="onTestMorphInput(tempBind.mesh, tempBind.index, tempBindTestWeight)"
              class="range-slider test-slider"
            />
          </div>
          <button class="btn-add-bind" @click="addEditingBind">
            ＋ {{ $t('blendShape.btnAddBind') }}
          </button>
        </div>
      </div>

      <div class="edit-footer">
        <button class="btn-save-main" @click="saveEditingClip">
          💾 {{ $t('blendShape.btnSave') }}
        </button>
        <button v-if="editingClip.isCustom" class="btn-delete-main" @click="deleteEditingClip">
          🗑 {{ $t('blendShape.btnDelete') }}
        </button>
        <button class="btn-cancel" @click="closeEditPanel">
          {{ $t('blendShape.btnClose') }}
        </button>
      </div>
    </div>

    <!-- 表情一覧 & スライダー操作リスト -->
    <div class="clips-container">
      <div v-for="clip in normalizedClips" :key="clip.id" class="clip-card" :class="{ active: (clipWeights[clip.key] || 0) > 0 }">
        <div class="clip-header">
          <div class="clip-title-wrap" @click="selectBlendShape(clip.key)" :title="blendShapeName(clip.key) + ' (クリックで100%に設定)'">
            <span class="clip-name">{{ blendShapeName(clip.key) }}</span>
            <span v-if="clip.isCustom" class="badge-custom">custom</span>
          </div>
          <div class="clip-quick-buttons">
            <button class="btn-quick" @click="selectBlendShape(clip.key)">100%</button>
            <button class="btn-quick" @click="setClipWeight(clip.key, 0.0)">0%</button>
            <button class="btn-edit-toggle" @click="openEditPanel(clip)">
              ✏️ {{ $t('blendShape.btnEdit') }}
            </button>
          </div>
        </div>

        <!-- リアルタイムスライダー -->
        <div class="clip-slider-wrap">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="clipWeights[clip.key] || 0"
            @input="onSliderInput(clip.key, $event)"
            class="range-slider main-slider"
          />
          <div class="slider-val-box">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              :value="Math.round((clipWeights[clip.key] || 0) * 100)"
              @input="onNumberInput(clip.key, $event)"
              class="number-input"
            />
            <span class="unit">%</span>
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
export default class TabBlendShape extends Vue {
  @Prop()
  drawVrm!: (file: File) => void

  @Prop()
  changeBlendShape!: (name: string) => void

  @Prop()
  selectTabType!: string

  @Prop()
  blendShapeGroups!: any

  @Prop()
  morphMeshes!: any[]

  @Prop()
  vrmVersion!: any

  @Prop()
  json!: any

  // リアルタイム表情ウェイト (0.0 〜 1.0)
  clipWeights: Record<string, number> = {}

  // モーダル・パネルの表示状態
  showAddModal = false
  editingClip: any = null
  editingClipBinds: any[] = []
  bindTestWeights: number[] = []

  // 新規ブレンドシェイプ用モデル
  newClip = {
    name: '',
    presetName: 'unknown',
    isBinary: false,
    binds: [] as any[]
  }

  // バインド追加用の一時データ
  tempBind = {
    mesh: 0,
    index: 0,
    weight: 100
  }
  tempBindTestWeight = 0

  statusMessage = ''

  mounted() {
    this.initWeights()
    this.initTempBind()
  }

  @Watch('blendShapeGroups')
  onBlendShapeGroupsChange() {
    this.initWeights()
  }

  @Watch('morphMeshes')
  onMorphMeshesChange() {
    this.initTempBind()
  }

  initWeights() {
    const weights: Record<string, number> = {}
    for (const clip of this.normalizedClips) {
      if (this.clipWeights[clip.key] !== undefined) {
        weights[clip.key] = this.clipWeights[clip.key]
      } else {
        weights[clip.key] = 0
      }
    }
    this.clipWeights = weights
  }

  initTempBind() {
    if (this.morphMeshes && this.morphMeshes.length > 0) {
      this.tempBind.mesh = this.morphMeshes[0].meshIndex
      this.tempBind.index = 0
      this.tempBind.weight = 100
      this.tempBindTestWeight = 0
    }
  }

  onTempBindMeshChange() {
    this.tempBind.index = 0
    this.tempBindTestWeight = 0
  }

  // クリップ一覧を正規化
  get normalizedClips(): Array<{ id: string; key: string; name: string; presetName: string; isCustom: boolean; raw: any }> {
    if (!this.blendShapeGroups) return []
    const isV0 = this.vrmVersion && this.vrmVersion.version === 0

    if (isV0 && Array.isArray(this.blendShapeGroups)) {
      return this.blendShapeGroups.map((g: any, i: number) => {
        const key = g.presetName && g.presetName !== 'unknown' ? g.presetName : (g.name || `clip_${i}`)
        const isCustom = !g.presetName || g.presetName === 'unknown'
        return {
          id: `v0_${i}_${key}`,
          key,
          name: g.name || key,
          presetName: g.presetName || 'unknown',
          isCustom,
          raw: g
        }
      })
    } else if (!isV0 && typeof this.blendShapeGroups === 'object') {
      const standardPresets = new Set([
        'neutral', 'happy', 'angry', 'sad', 'relaxed', 'surprised',
        'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight',
        'lookUp', 'lookDown', 'lookLeft', 'lookRight'
      ])
      return Object.keys(this.blendShapeGroups).map((key) => {
        const isCustom = !standardPresets.has(key)
        return {
          id: `v1_${key}`,
          key,
          name: key,
          presetName: isCustom ? 'custom' : key,
          isCustom,
          raw: this.blendShapeGroups[key]
        }
      })
    }
    return []
  }

  get availablePresets(): string[] {
    const isV0 = this.vrmVersion && this.vrmVersion.version === 0
    if (isV0) {
      return ['neutral', 'a', 'i', 'u', 'e', 'o', 'blink', 'joy', 'angry', 'sorrow', 'fun', 'lookup', 'lookdown', 'lookleft', 'lookright', 'blink_l', 'blink_r']
    } else {
      return ['neutral', 'happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight']
    }
  }

  blendShapeName(name: string): string {
    if (!name) return ''
    const key = name.toLowerCase()
    const trans = this.$t(`blendShape.${key}`)
    return trans && trans !== `blendShape.${key}` ? String(trans) : name
  }

  getMeshName(meshIndex: number): string {
    if (!this.morphMeshes) return `Mesh_${meshIndex}`
    const found = this.morphMeshes.find((m: any) => m.meshIndex === meshIndex || m.nodeIndex === meshIndex)
    return found ? found.name : `Mesh_${meshIndex}`
  }

  getMorphIndices(meshIndex: number): number[] {
    if (!this.morphMeshes) return []
    const found = this.morphMeshes.find((m: any) => m.meshIndex === meshIndex || m.nodeIndex === meshIndex)
    if (!found) return []
    const indices: number[] = []
    for (let i = 0; i < found.targetCount; i++) {
      indices.push(i)
    }
    return indices
  }

  getMorphTargetName(meshIndex: number, targetIndex: number): string {
    if (!this.morphMeshes) return `Target #${targetIndex}`
    const found = this.morphMeshes.find((m: any) => m.meshIndex === meshIndex || m.nodeIndex === meshIndex)
    if (found && found.targetNames && found.targetNames[targetIndex]) {
      return `${found.targetNames[targetIndex]} (#${targetIndex})`
    }
    return `Target #${targetIndex}`
  }

  // スライダー変更
  onSliderInput(key: string, event: any) {
    const val = parseFloat(event.target.value) || 0
    this.$set(this.clipWeights, key, val)
    this.$emit('change-blendshape-weight', { name: key, weight: val })
  }

  // 数値入力変更 (0〜100%)
  onNumberInput(key: string, event: any) {
    let num = parseInt(event.target.value, 10)
    if (isNaN(num)) num = 0
    num = Math.max(0, Math.min(100, num))
    const val = num / 100
    this.$set(this.clipWeights, key, val)
    this.$emit('change-blendshape-weight', { name: key, weight: val })
  }

  // 表情名を選択して100%にする（他は解除）
  selectBlendShape(key: string) {
    for (const k of Object.keys(this.clipWeights)) {
      this.$set(this.clipWeights, k, 0)
    }
    this.$set(this.clipWeights, key, 1.0)

    if (this.changeBlendShape) {
      this.changeBlendShape(key)
    } else {
      this.$emit('change-blendshape-weight', { name: key, weight: 1.0 })
    }
  }

  // ワンタップウェイト設定 (1.0 または 0.0)
  setClipWeight(key: string, val: number) {
    if (val === 1.0) {
      this.selectBlendShape(key)
    } else {
      this.$set(this.clipWeights, key, val)
      this.$emit('change-blendshape-weight', { name: key, weight: val })
    }
  }

  // 全表情リセット
  clickResetAll() {
    for (const k of Object.keys(this.clipWeights)) {
      this.$set(this.clipWeights, k, 0)
    }
    this.$emit('reset-all-blendshapes')
  }

  // モーフターゲット直接プレビュー動作テスト
  onTestMorphInput(meshIndex: number, targetIndex: number, weight: number) {
    this.$emit('preview-morph-target', {
      meshIndex,
      targetIndex,
      weight: parseFloat(String(weight)) || 0
    })
  }

  // 新規ブレンドシェイプ作成モーダル
  openAddModal() {
    const isV0 = this.vrmVersion && this.vrmVersion.version === 0
    this.newClip = {
      name: '',
      presetName: isV0 ? 'unknown' : 'custom',
      isBinary: false,
      binds: []
    }
    this.initTempBind()
    this.showAddModal = true
    this.editingClip = null
  }

  closeAddModal() {
    this.showAddModal = false
    this.tempBindTestWeight = 0
  }

  addNewClipBind() {
    this.newClip.binds.push({
      mesh: this.tempBind.mesh,
      index: this.tempBind.index,
      weight: this.tempBind.weight
    })
    // テストモーフをリセット
    this.onTestMorphInput(this.tempBind.mesh, this.tempBind.index, 0)
    this.tempBindTestWeight = 0
  }

  removeNewClipBind(index: number) {
    this.newClip.binds.splice(index, 1)
  }

  createBlendShape() {
    if (!this.newClip.name.trim()) {
      alert('クリップ名を入力してください')
      return
    }

    const isV0 = this.vrmVersion && this.vrmVersion.version === 0
    const clipName = this.newClip.name.trim()

    let payload: any = {}
    if (isV0) {
      payload = {
        name: clipName,
        presetName: this.newClip.presetName,
        isBinary: this.newClip.isBinary,
        binds: this.newClip.binds.map((b) => ({
          mesh: b.mesh,
          index: b.index,
          weight: b.weight
        }))
      }
    } else {
      payload = {
        name: clipName,
        presetName: this.newClip.presetName,
        isPreset: this.newClip.presetName !== 'custom',
        isBinary: this.newClip.isBinary,
        morphTargetBinds: this.newClip.binds.map((b) => {
          const m = this.morphMeshes?.find((mesh) => mesh.meshIndex === b.mesh)
          return {
            node: m ? m.nodeIndex : b.mesh,
            index: b.index,
            weight: b.weight * 0.01
          }
        })
      }
    }

    VRMParser.addBlendShapeGroup(payload)
      .then(() => {
        // 3Dシーンの ExpressionManager にも動的登録
        this.$emit('register-custom-expression', {
          name: clipName,
          binds: this.newClip.binds
        })
        this.$emit('reload-blendshapes')
        this.showStatus(this.$t('blendShape.addedMessage') as string)
        this.closeAddModal()
      })
      .catch((e) => {
        console.error('Error adding blend shape', e)
        alert('ブレンドシェイプの作成に失敗しました')
      })
  }

  // 編集パネル開閉
  openEditPanel(clip: any) {
    this.showAddModal = false
    const raw = clip.raw
    const isV0 = this.vrmVersion && this.vrmVersion.version === 0

    const binds: any[] = []
    if (isV0) {
      const rawBinds = raw.binds || []
      for (const b of rawBinds) {
        binds.push({
          mesh: b.mesh !== undefined ? b.mesh : 0,
          index: b.index !== undefined ? b.index : 0,
          weight: b.weight !== undefined ? b.weight : 100
        })
      }
    } else {
      const rawBinds = raw.morphTargetBinds || []
      for (const b of rawBinds) {
        const m = this.morphMeshes?.find((mesh) => mesh.nodeIndex === b.node)
        binds.push({
          mesh: m ? m.meshIndex : (b.node !== undefined ? b.node : 0),
          index: b.index !== undefined ? b.index : 0,
          weight: Math.round((b.weight !== undefined ? b.weight : 1.0) * 100)
        })
      }
    }

    this.editingClip = {
      name: clip.name,
      presetName: clip.presetName,
      isCustom: clip.isCustom,
      isBinary: !!raw.isBinary
    }
    this.editingClipBinds = binds
    this.bindTestWeights = new Array(binds.length).fill(0)
    this.initTempBind()
  }

  closeEditPanel() {
    this.editingClip = null
    this.editingClipBinds = []
  }

  onEditingBindWeightChange() {
    // ウェイト変更時のイベント通知
  }

  addEditingBind() {
    this.editingClipBinds.push({
      mesh: this.tempBind.mesh,
      index: this.tempBind.index,
      weight: this.tempBind.weight
    })
    this.bindTestWeights.push(0)
    this.onTestMorphInput(this.tempBind.mesh, this.tempBind.index, 0)
    this.tempBindTestWeight = 0
  }

  removeEditingBind(index: number) {
    this.editingClipBinds.splice(index, 1)
    this.bindTestWeights.splice(index, 1)
  }

  saveEditingClip() {
    if (!this.editingClip) return
    const isV0 = this.vrmVersion && this.vrmVersion.version === 0
    const clipName = this.editingClip.name

    let payload: any = {}
    if (isV0) {
      payload = {
        name: clipName,
        presetName: this.editingClip.presetName,
        isBinary: this.editingClip.isBinary,
        binds: this.editingClipBinds.map((b) => ({
          mesh: b.mesh,
          index: b.index,
          weight: b.weight
        }))
      }
    } else {
      payload = {
        name: clipName,
        presetName: this.editingClip.presetName,
        isBinary: this.editingClip.isBinary,
        morphTargetBinds: this.editingClipBinds.map((b) => {
          const m = this.morphMeshes?.find((mesh) => mesh.meshIndex === b.mesh)
          return {
            node: m ? m.nodeIndex : b.mesh,
            index: b.index,
            weight: b.weight * 0.01
          }
        })
      }
    }

    VRMParser.updateBlendShapeGroup(payload)
      .then(() => {
        this.$emit('register-custom-expression', {
          name: clipName,
          binds: this.editingClipBinds
        })
        this.$emit('reload-blendshapes')
        this.showStatus(this.$t('blendShape.savedMessage') as string)
      })
      .catch((e) => {
        console.error('Error saving blend shape', e)
        alert('ブレンドシェイプの保存に失敗しました')
      })
  }

  deleteEditingClip() {
    if (!this.editingClip) return
    if (!confirm(this.$t('blendShape.confirmDelete') as string)) return

    const name = this.editingClip.name || this.editingClip.presetName
    VRMParser.deleteBlendShapeGroup(name)
      .then(() => {
        this.$emit('unregister-custom-expression', name)
        this.$emit('reload-blendshapes')
        this.showStatus(this.$t('blendShape.deletedMessage') as string)
        this.closeEditPanel()
      })
      .catch((e) => {
        console.error('Error deleting blend shape', e)
        alert('ブレンドシェイプの削除に失敗しました')
      })
  }

  showStatus(msg: string) {
    this.statusMessage = msg
    setTimeout(() => {
      if (this.statusMessage === msg) {
        this.statusMessage = ''
      }
    }, 3500)
  }

  clickDownloadAll() {
    let names: string[] = []
    if (this.vrmVersion && this.vrmVersion.version === 0) {
      names = (this.blendShapeGroups || []).map((g: any) => g.presetName || g.name)
    } else {
      names = Object.keys(this.blendShapeGroups || {})
    }
    this.$emit('download-all-blendshapes', names)
  }
}
</script>

<style scoped lang="scss">
$primary: #007db9;
$primary-hover: #006090;
$accent-green: #2e7d32;
$danger: #d32f2f;
$danger-hover: #b71c1c;
$bg-card: #f8fafc;
$border: #e2e8f0;
$text-main: #1e293b;
$text-sub: #64748b;

.tabBlendShape {
  padding: 8px 4px;
  max-width: 520px;
  box-sizing: border-box;

  .top-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;

    .action-btn {
      flex: 1;
      min-width: 100px;
      height: 36px;
      font-size: 13px;
      font-weight: bold;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;

      &.btn-download {
        background-color: $primary;
        color: #fff;
        &:hover {
          background-color: $primary-hover;
        }
      }

      &.btn-reset {
        background-color: #64748b;
        color: #fff;
        &:hover {
          background-color: #475569;
        }
      }

      &.btn-add {
        background-color: #10b981;
        color: #fff;
        &:hover {
          background-color: #059669;
        }
      }
    }
  }

  .status-message {
    padding: 8px 12px;
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    font-size: 13px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 8px;
    animation: fadeIn 0.3s ease;
  }

  .separator {
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 10px 0;
  }

  /* パネル共通（新規作成・編集） */
  .add-clip-panel,
  .edit-clip-panel {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    text-align: left;

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;

      h3 {
        margin: 0;
        font-size: 15px;
        color: $text-main;
      }

      .btn-close {
        background: transparent;
        border: none;
        font-size: 16px;
        color: $text-sub;
        cursor: pointer;
        &:hover {
          color: $text-main;
        }
      }
    }

    .form-group {
      margin-bottom: 8px;
      label {
        display: block;
        font-size: 12px;
        font-weight: bold;
        color: $text-sub;
        margin-bottom: 2px;
      }
    }

    .edit-meta-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-wrap: wrap;
      margin-bottom: 8px;

      .meta-item {
        flex: 1;
        min-width: 120px;
        label {
          display: block;
          font-size: 11px;
          color: $text-sub;
        }
        .preset-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #e2e8f0;
          color: #475569;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
      }
    }

    .form-group-checkbox,
    .meta-item-checkbox {
      margin-bottom: 8px;
      font-size: 12px;
      color: $text-main;
      display: flex;
      align-items: center;
      input {
        margin-right: 4px;
      }
    }
  }

  /* バインド一覧セクション */
  .binds-section {
    margin-top: 10px;
    background: #f8fafc;
    border-radius: 6px;
    padding: 8px;

    h4 {
      margin: 0 0 6px 0;
      font-size: 13px;
      color: $text-main;
    }

    .no-binds {
      font-size: 12px;
      color: $text-sub;
      padding: 6px 0;
    }

    .bind-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 4px;
      font-size: 12px;

      .bind-info {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        .bind-mesh {
          font-weight: bold;
          color: $primary;
        }
        .bind-target {
          color: $text-main;
        }
        .bind-weight {
          color: #059669;
          font-weight: bold;
        }
      }
    }

    .binds-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;

      .bind-item-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

        .bind-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;

          .bind-names {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;

            .mesh-badge {
              font-size: 11px;
              padding: 2px 6px;
              background: #e0f2fe;
              color: #0369a1;
              border-radius: 4px;
              font-weight: bold;
            }

            .morph-name {
              font-size: 12px;
              font-weight: bold;
              color: $text-main;
              word-break: break-all;
            }
          }
        }

        .bind-card-controls {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 4px;
          border-top: 1px solid #f1f5f9;

          .control-row {
            display: flex;
            align-items: center;
            gap: 8px;

            .control-label {
              font-size: 11px;
              color: $text-sub;
              font-weight: bold;
              min-width: 105px;
              flex-shrink: 0;

              &.test-label {
                color: #d97706;
              }
            }

            .slider-with-val {
              display: flex;
              align-items: center;
              gap: 6px;
              flex: 1;

              .range-slider {
                flex: 1;
                min-width: 80px;
              }

              .unit {
                font-size: 11px;
                color: $text-sub;
              }

              .test-val {
                font-size: 11px;
                color: #d97706;
                font-weight: bold;
                min-width: 32px;
                text-align: right;
              }
            }
          }
        }
      }
    }

    /* バインド追加ボックス */
    .add-bind-box {
      margin-top: 8px;
      padding: 8px;
      background: #ffffff;
      border: 1px dashed #94a3b8;
      border-radius: 6px;

      .bind-inputs {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 6px;

        .select-box {
          flex: 1;
          min-width: 130px;
        }
      }

      .weight-input-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: bold;
        color: $text-main;
        flex: 1;
        min-width: 130px;

        .range-slider {
          flex: 1;
        }
      }

      .test-morph-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #d97706;
        font-weight: bold;
        margin-bottom: 8px;

        .test-label {
          min-width: 105px;
          flex-shrink: 0;
          font-size: 11px;
        }

        .test-slider {
          flex: 1;
        }
      }

      .btn-add-bind {
        width: 100%;
        padding: 6px;
        background: #f1f5f9;
        color: $primary;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-weight: bold;
        font-size: 12px;
        cursor: pointer;
        &:hover {
          background: #e2e8f0;
        }
      }
    }
  }

  .modal-buttons,
  .edit-footer {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: flex-end;
  }

  .btn-save-main {
    padding: 6px 14px;
    background: $accent-green;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    font-size: 13px;
    cursor: pointer;
    &:hover {
      background: #1b5e20;
    }
  }

  .btn-delete-main {
    padding: 6px 12px;
    background: $danger;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    font-size: 13px;
    cursor: pointer;
    &:hover {
      background: $danger-hover;
    }
  }

  .btn-cancel {
    padding: 6px 12px;
    background: #e2e8f0;
    color: #334155;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    &:hover {
      background: #cbd5e1;
    }
  }

  .btn-delete-small {
    background: transparent;
    color: #ef4444;
    border: none;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    padding: 2px 6px;
    &:hover {
      background: #fee2e2;
      border-radius: 4px;
    }
  }

  /* 入力UI共通 */
  .input-text {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 13px;
    &:focus {
      outline: none;
      border-color: $primary;
    }
  }

  .select-box {
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 12px;
    background: #fff;
    max-width: 160px;
    &:focus {
      outline: none;
      border-color: $primary;
    }
  }

  .range-slider {
    cursor: pointer;
    accent-color: $primary;
    &.test-slider {
      accent-color: #d97706;
    }
  }

  .slider-with-val {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .number-input-mini {
    width: 44px;
    padding: 2px 4px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 12px;
    text-align: right;
  }

  /* 表情リストコンテナ */
  .clips-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
    max-height: 520px;
    overflow-y: auto;
    padding-right: 2px;

    .clip-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s;

      &.active {
        border-color: #0284c7;
        background: #f0f9ff;
        box-shadow: 0 0 0 1px #0284c7;

        .clip-title-wrap {
          .clip-name {
            color: #0284c7;
          }
        }
      }

      .clip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;

        .clip-title-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          user-select: none;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s;

          &:hover {
            background-color: #e0f2fe;
            .clip-name {
              color: $primary;
            }
          }

          .clip-name {
            font-size: 13px;
            font-weight: bold;
            color: $text-main;
            transition: color 0.2s;
          }

          .badge-custom {
            font-size: 10px;
            padding: 1px 5px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 3px;
            font-weight: bold;
          }
        }

        .clip-quick-buttons {
          display: flex;
          gap: 4px;
          align-items: center;

          .btn-quick {
            padding: 2px 6px;
            font-size: 11px;
            font-weight: bold;
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            cursor: pointer;
            &:hover {
              background: #e2e8f0;
            }
          }

          .btn-edit-toggle {
            padding: 2px 6px;
            font-size: 11px;
            background: #fff;
            color: $primary;
            border: 1px solid #93c5fd;
            border-radius: 3px;
            cursor: pointer;
            &:hover {
              background: #eff6ff;
            }
          }
        }
      }

      .clip-slider-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .main-slider {
          flex: 1;
        }

        .slider-val-box {
          display: flex;
          align-items: center;
          gap: 2px;

          .number-input {
            width: 48px;
            padding: 2px 4px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            font-size: 12px;
            text-align: right;
          }

          .unit {
            font-size: 11px;
            color: $text-sub;
          }
        }
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>