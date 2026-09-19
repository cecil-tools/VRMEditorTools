<template>
  <div class="tabContents tabAccessory" v-if="selectTabType == 'tab_accessory'">
    <div class="accessory-header">
      <h3>🧩 {{ $t('accessory.title') }}</h3>
    </div>

    <!-- ファイルアップロードエリア -->
    <div
      class="upload-dropzone"
      :class="{ 'is-dragover': isDraggingFile }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDropFile"
      @click="triggerFileInput"
    >
      <input
        type="file"
        ref="fileInput"
        accept=".glb,.gltf"
        style="display: none"
        @change="onFileSelected"
      />
      <div class="dropzone-content">
        <span class="dropzone-icon">📥</span>
        <span class="dropzone-title">{{ $t('accessory.uploadTitle') }}</span>
        <span class="dropzone-desc">{{ $t('accessory.uploadDesc') }}</span>
      </div>
    </div>

    <!-- 追加済みアクセサリ一覧 -->
    <div class="section-container" v-if="accessories.length > 0">
      <div class="section-title">
        <span>📋 {{ $t('accessory.attachedList') }} ({{ accessories.length }})</span>
      </div>
      <div class="accessory-list">
        <div
          v-for="item in accessories"
          :key="item.id"
          class="accessory-item-card"
          :class="{ active: item.id === activeAccessoryId }"
          @click="selectAccessory(item.id)"
        >
          <div class="item-main-info">
            <span class="item-icon">🎀</span>
            <div class="item-text-info">
              <span class="item-name" :title="item.name">{{ item.name }}</span>
              <span class="item-target-bone">🦴 {{ getBoneDisplayName(item.targetBoneName, item.targetNodeIndex) }}</span>
            </div>
          </div>
          <div class="item-actions">
            <button
              type="button"
              class="btn-icon"
              :title="$t('accessory.visible')"
              :class="{ 'is-muted': !item.visible }"
              @click.stop="toggleVisibility(item.id)"
            >
              {{ item.visible ? '👁️' : '🕶️' }}
            </button>
            <button
              type="button"
              class="btn-icon"
              :title="$t('accessory.focus')"
              @click.stop="focusAccessory(item.id)"
            >
              🎯
            </button>
            <button
              type="button"
              class="btn-icon btn-danger"
              :title="$t('accessory.remove')"
              @click.stop="removeAccessory(item.id)"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 選択中アクセサリの編集パネル -->
    <div class="section-container editor-panel" v-if="activeAccessory">
      <!-- 配置先ボーン選択 -->
      <div class="panel-block">
        <label class="block-label">🦴 {{ $t('accessory.targetBone') }}</label>
        
        <!-- クイック選択ボーン -->
        <div class="quick-bones-bar">
          <button
            v-for="qb in quickBones"
            :key="qb.key"
            type="button"
            class="quick-bone-btn"
            :class="{ active: isQuickBoneSelected(qb) }"
            @click="selectQuickBone(qb)"
          >
            {{ qb.label }}
          </button>
        </div>

        <!-- ボーン検索・詳細セレクト -->
        <div class="bone-selector-row">
          <input
            type="text"
            v-model="searchBoneQuery"
            class="bone-search-input"
            :placeholder="$t('accessory.searchBone')"
          />
          <select
            class="bone-select"
            :value="activeAccessory.targetNodeIndex"
            @change="onSelectBoneOption($event)"
          >
            <option
              v-for="node in filteredBoneNodes"
              :key="node.index"
              :value="node.index"
            >
              #{{ node.index }} {{ node.name }} {{ node.humanoidBone ? `(${node.humanoidBone})` : '' }}
            </option>
          </select>
        </div>
      </div>

      <!-- 操作モード切替 (Translate / Rotate / Scale) -->
      <div class="panel-block">
        <label class="block-label">🎮 {{ $t('accessory.transformMode') }}</label>
        <div class="mode-buttons-group">
          <button
            type="button"
            class="mode-btn"
            :class="{ active: transformMode === 'translate' }"
            @click="setTransformMode('translate')"
          >
            📍 {{ $t('accessory.modeTranslate') }}
          </button>
          <button
            type="button"
            class="mode-btn"
            :class="{ active: transformMode === 'rotate' }"
            @click="setTransformMode('rotate')"
          >
            🔄 {{ $t('accessory.modeRotate') }}
          </button>
          <button
            type="button"
            class="mode-btn"
            :class="{ active: transformMode === 'scale' }"
            @click="setTransformMode('scale')"
          >
            📐 {{ $t('accessory.modeScale') }}
          </button>
        </div>
      </div>

      <!-- Transform 数値入力 -->
      <div class="panel-block transform-controls-block">
        <!-- 位置 (Position) -->
        <div class="transform-row">
          <div class="row-header">
            <span class="tf-title">{{ $t('accessory.position') }}</span>
          </div>
          <div class="axis-inputs">
            <div class="axis-group">
              <span class="axis-tag tag-x">X</span>
              <input
                type="number"
                step="0.01"
                v-model.number="activeAccessory.position.x"
                @input="onTransformChange"
              />
            </div>
            <div class="axis-group">
              <span class="axis-tag tag-y">Y</span>
              <input
                type="number"
                step="0.01"
                v-model.number="activeAccessory.position.y"
                @input="onTransformChange"
              />
            </div>
            <div class="axis-group">
              <span class="axis-tag tag-z">Z</span>
              <input
                type="number"
                step="0.01"
                v-model.number="activeAccessory.position.z"
                @input="onTransformChange"
              />
            </div>
          </div>
        </div>

        <!-- 回転 (Rotation: 角度) -->
        <div class="transform-row">
          <div class="row-header">
            <span class="tf-title">{{ $t('accessory.rotation') }}</span>
          </div>
          <div class="axis-inputs">
            <div class="axis-group">
              <span class="axis-tag tag-x">X</span>
              <input
                type="number"
                step="1"
                v-model.number="activeAccessory.rotation.x"
                @input="onTransformChange"
              />
            </div>
            <div class="axis-group">
              <span class="axis-tag tag-y">Y</span>
              <input
                type="number"
                step="1"
                v-model.number="activeAccessory.rotation.y"
                @input="onTransformChange"
              />
            </div>
            <div class="axis-group">
              <span class="axis-tag tag-z">Z</span>
              <input
                type="number"
                step="1"
                v-model.number="activeAccessory.rotation.z"
                @input="onTransformChange"
              />
            </div>
          </div>
        </div>

        <!-- サイズ (Scale) -->
        <div class="transform-row">
          <div class="row-header">
            <span class="tf-title">{{ $t('accessory.scale') }}</span>
            <label class="lock-uniform-label">
              <input type="checkbox" v-model="lockUniformScale" />
              <span>🔗 {{ $t('accessory.lockScale') }}</span>
            </label>
          </div>
          <div class="axis-inputs">
            <div class="axis-group">
              <span class="axis-tag tag-x">X</span>
              <input
                type="number"
                step="0.05"
                min="0.001"
                v-model.number="activeAccessory.scale.x"
                @input="onScaleChange('x')"
              />
            </div>
            <div class="axis-group">
              <span class="axis-tag tag-y">Y</span>
              <input
                type="number"
                step="0.05"
                min="0.001"
                v-model.number="activeAccessory.scale.y"
                @input="onScaleChange('y')"
              />
            </div>
            <div class="axis-group">
              <span class="axis-tag tag-z">Z</span>
              <input
                type="number"
                step="0.05"
                min="0.001"
                v-model.number="activeAccessory.scale.z"
                @input="onScaleChange('z')"
              />
            </div>
          </div>
        </div>

        <!-- Transform リセット -->
        <div class="transform-actions">
          <button type="button" class="btn-reset" @click="resetTransform">
            ↺ {{ $t('accessory.resetTransform') }}
          </button>
        </div>
      </div>

      <!-- VRMへの結合・エクスポート反映ボタン -->
      <div class="panel-block merge-block">
        <button
          type="button"
          class="btn-merge"
          :class="{ 'is-merged': isAllMerged }"
          @click="clickMergeToVRM"
        >
          💾 {{ $t('accessory.mergeToVRM') }}
        </button>
        <span class="merge-hint">
          {{ isAllMerged ? $t('accessory.mergedSuccess') : $t('accessory.mergedWarning') }}
        </span>
      </div>
    </div>

    <div v-if="statusMessage" class="status-alert">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
import VRMParser from '@/module/VRMParser';

export interface AccessoryItem {
  id: string;
  name: string;
  file?: File;
  glbData: ArrayBuffer;
  targetBoneName: string;
  targetNodeIndex: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // Euler in degrees
  scale: { x: number; y: number; z: number };
  visible: boolean;
  isMerged: boolean;
}

@Component({})
export default class TabAccessory extends Vue {
  @Prop() selectTabType!: string;
  @Prop() json!: any;
  @Prop() vrmVersion!: any;

  accessories: AccessoryItem[] = [];
  activeAccessoryId: string | null = null;
  transformMode: 'translate' | 'rotate' | 'scale' = 'translate';
  lockUniformScale = true;
  searchBoneQuery = '';
  statusMessage = '';
  isDraggingFile = false;

  allNodes: any[] = [];
  humanoidBones: any[] = [];

  get activeAccessory(): AccessoryItem | null {
    if (!this.activeAccessoryId) return null;
    return this.accessories.find(a => a.id === this.activeAccessoryId) || null;
  }

  get isAllMerged(): boolean {
    if (this.accessories.length === 0) return false;
    return this.accessories.every(a => a.isMerged);
  }

  get quickBones(): Array<{ key: string; label: string; nameCandidates: string[] }> {
    return [
      { key: 'head', label: this.$t('accessory.head') as string, nameCandidates: ['head', 'head_01', 'j_bip_c_head'] },
      { key: 'neck', label: this.$t('accessory.neck') as string, nameCandidates: ['neck', 'j_bip_c_neck'] },
      { key: 'chest', label: this.$t('accessory.chest') as string, nameCandidates: ['chest', 'upperchest', 'spine', 'j_bip_c_chest'] },
      { key: 'rightHand', label: this.$t('accessory.rightHand') as string, nameCandidates: ['righthand', 'j_bip_r_hand'] },
      { key: 'leftHand', label: this.$t('accessory.leftHand') as string, nameCandidates: ['lefthand', 'j_bip_l_hand'] },
      { key: 'hips', label: this.$t('accessory.hips') as string, nameCandidates: ['hips', 'j_bip_c_hips'] },
    ];
  }

  get filteredBoneNodes(): any[] {
    const query = this.searchBoneQuery.trim().toLowerCase();
    if (!query) return this.allNodes;
    return this.allNodes.filter(n => {
      const name = (n.name || '').toLowerCase();
      const hum = (n.humanoidBone || '').toLowerCase();
      const idx = String(n.index);
      return name.includes(query) || hum.includes(query) || idx.includes(query);
    });
  }

  @Watch('json', { immediate: true })
  onJsonChanged() {
    this.refreshBoneData();
  }

  @Watch('selectTabType')
  onTabChanged(newVal: string) {
    if (newVal === 'tab_accessory') {
      this.$emit('activate-accessory-mode', {
        activeId: this.activeAccessoryId,
        mode: this.transformMode
      });
    }
  }

  refreshBoneData() {
    if (!VRMParser.json) return;
    const hierarchy = VRMParser.getBoneHierarchy();
    this.allNodes = hierarchy.allNodes || [];

    const humData = VRMParser.getHumanoidBonesData();
    this.humanoidBones = humData.humanoidBones || [];
  }

  getBoneDisplayName(name: string, index: number): string {
    const node = this.allNodes[index];
    if (node) {
      if (node.humanoidBone) {
        return `${node.name} (${node.humanoidBone}) #${node.index}`;
      }
      return `${node.name} #${node.index}`;
    }
    return `${name} #${index}`;
  }

  triggerFileInput() {
    const input = this.$refs.fileInput as HTMLInputElement;
    if (input) input.click();
  }

  onDragOver() {
    this.isDraggingFile = true;
  }

  onDragLeave() {
    this.isDraggingFile = false;
  }

  onDropFile(e: DragEvent) {
    this.isDraggingFile = false;
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.handleFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: any) {
    if (e.target && e.target.files && e.target.files.length > 0) {
      this.handleFile(e.target.files[0]);
      e.target.value = '';
    }
  }

  async handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      alert('GLB または GLTF ファイルを選択してください。');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      // デフォルトの配置先ボーンを決定（Head または Hips または最初のノード）
      let targetBoneName = 'head';
      let targetNodeIndex = 0;

      const headBone = this.humanoidBones.find(b => b.name.toLowerCase() === 'head' && b.isMapped);
      if (headBone) {
        targetBoneName = headBone.nodeName;
        targetNodeIndex = headBone.nodeIndex;
      } else if (this.allNodes.length > 0) {
        targetBoneName = this.allNodes[0].name;
        targetNodeIndex = this.allNodes[0].index;
      }

      const newAccessory: AccessoryItem = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        file: file,
        glbData: buffer,
        targetBoneName: targetBoneName,
        targetNodeIndex: targetNodeIndex,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        visible: true,
        isMerged: false
      };

      this.accessories.push(newAccessory);
      this.activeAccessoryId = newAccessory.id;

      this.$emit('load-accessory', {
        item: newAccessory,
        buffer: buffer
      });
    } catch (err) {
      console.error('Failed to load GLB accessory', err);
      alert('GLBファイルの読み込みに失敗しました。');
    }
  }

  selectAccessory(id: string) {
    this.activeAccessoryId = id;
    this.$emit('select-accessory', id);
  }

  toggleVisibility(id: string) {
    const acc = this.accessories.find(a => a.id === id);
    if (acc) {
      acc.visible = !acc.visible;
      this.$emit('toggle-accessory-visibility', { id: acc.id, visible: acc.visible });
    }
  }

  focusAccessory(id: string) {
    this.$emit('focus-accessory', id);
  }

  removeAccessory(id: string) {
    const confirmed = confirm(this.$t('accessory.confirmRemove') as string);
    if (!confirmed) return;

    this.accessories = this.accessories.filter(a => a.id !== id);
    if (this.activeAccessoryId === id) {
      this.activeAccessoryId = this.accessories.length > 0 ? this.accessories[0].id : null;
    }
    this.$emit('remove-accessory', id);
  }

  isQuickBoneSelected(qb: { nameCandidates: string[] }): boolean {
    if (!this.activeAccessory) return false;
    const currentName = (this.activeAccessory.targetBoneName || '').toLowerCase();
    const currentNode = this.allNodes[this.activeAccessory.targetNodeIndex];
    const humName = (currentNode?.humanoidBone || '').toLowerCase();

    return qb.nameCandidates.some(c => currentName.includes(c) || humName === c);
  }

  selectQuickBone(qb: { key: string; nameCandidates: string[] }) {
    if (!this.activeAccessory) return;

    // まずヒューマノイドボーンから探索
    const humBone = this.humanoidBones.find(b =>
      b.isMapped && qb.nameCandidates.some(c => b.name.toLowerCase() === c)
    );
    if (humBone) {
      this.updateTargetBone(humBone.nodeName, humBone.nodeIndex);
      return;
    }

    // ノード名から探索
    const node = this.allNodes.find(n =>
      qb.nameCandidates.some(c => (n.name || '').toLowerCase().includes(c))
    );
    if (node) {
      this.updateTargetBone(node.name, node.index);
    }
  }

  onSelectBoneOption(event: any) {
    const nodeIdx = parseInt(event.target.value, 10);
    const node = this.allNodes[nodeIdx];
    if (node) {
      this.updateTargetBone(node.name, node.index);
    }
  }

  updateTargetBone(boneName: string, nodeIndex: number) {
    if (!this.activeAccessory) return;
    this.activeAccessory.targetBoneName = boneName;
    this.activeAccessory.targetNodeIndex = nodeIndex;
    this.activeAccessory.isMerged = false;

    this.$emit('change-accessory-bone', {
      id: this.activeAccessory.id,
      boneName: boneName,
      nodeIndex: nodeIndex
    });
  }

  setTransformMode(mode: 'translate' | 'rotate' | 'scale') {
    this.transformMode = mode;
    this.$emit('change-accessory-mode', mode);
  }

  onTransformChange() {
    if (!this.activeAccessory) return;
    this.activeAccessory.isMerged = false;
    this.$emit('change-accessory-transform', {
      id: this.activeAccessory.id,
      position: { ...this.activeAccessory.position },
      rotation: { ...this.activeAccessory.rotation },
      scale: { ...this.activeAccessory.scale }
    });
  }

  onScaleChange(changedAxis: 'x' | 'y' | 'z') {
    if (!this.activeAccessory) return;
    if (this.lockUniformScale) {
      const val = this.activeAccessory.scale[changedAxis];
      this.activeAccessory.scale.x = val;
      this.activeAccessory.scale.y = val;
      this.activeAccessory.scale.z = val;
    }
    this.onTransformChange();
  }

  resetTransform() {
    if (!this.activeAccessory) return;
    this.activeAccessory.position = { x: 0, y: 0, z: 0 };
    this.activeAccessory.rotation = { x: 0, y: 0, z: 0 };
    this.activeAccessory.scale = { x: 1, y: 1, z: 1 };
    this.onTransformChange();
  }

  // 3Dギズモ側から位置・回転・スケール変更を受け取った場合の同期
  public updateTransformFromGizmo(payload: {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  }) {
    const acc = this.accessories.find(a => a.id === payload.id);
    if (acc) {
      acc.position = { ...payload.position };
      acc.rotation = { ...payload.rotation };
      acc.scale = { ...payload.scale };
      acc.isMerged = false;
    }
  }

  async clickMergeToVRM() {
    if (this.accessories.length === 0) return;

    try {
      this.$emit('merge-accessories-to-vrm', this.accessories);
      this.accessories.forEach(a => (a.isMerged = true));
      this.statusMessage = this.$t('accessory.mergedSuccess') as string;
      setTimeout(() => {
        this.statusMessage = '';
      }, 4000);
    } catch (err) {
      console.error('Failed to merge accessory to VRM', err);
      alert('VRMへの結合処理に失敗しました。');
    }
  }
}
</script>

<style scoped lang="scss">
$primary: #0284c7;
$primary-dark: #0369a1;
$bg-card: #f8fafc;
$border-color: #e2e8f0;
$text-main: #1e293b;
$text-sub: #64748b;
$danger: #ef4444;
$success: #10b981;

.tabAccessory {
  padding: 12px;
  background-color: #ffffff;
  color: $text-main;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.accessory-header {
  margin-bottom: 12px;
  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: $text-main;
  }
}

/* アップロード ドロップゾーン */
.upload-dropzone {
  border: 2px dashed $primary;
  background: #f0f9ff;
  border-radius: 8px;
  padding: 20px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 14px;

  &:hover,
  &.is-dragover {
    background: #e0f2fe;
    border-color: $primary-dark;
  }

  .dropzone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    .dropzone-icon {
      font-size: 28px;
    }
    .dropzone-title {
      font-size: 13px;
      font-weight: 700;
      color: $primary-dark;
    }
    .dropzone-desc {
      font-size: 11px;
      color: $text-sub;
    }
  }
}

/* セクションコンテナ */
.section-container {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 12px;

  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: $text-main;
    margin-bottom: 8px;
  }
}

/* アクセサリ一覧 */
.accessory-list {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .accessory-item-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    background: #ffffff;
    border: 1px solid $border-color;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: $primary;
    }

    &.active {
      border-color: $primary;
      background: #f0f9ff;
      box-shadow: 0 0 0 1px $primary;
    }

    .item-main-info {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;

      .item-icon {
        font-size: 16px;
      }

      .item-text-info {
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .item-name {
          font-size: 12px;
          font-weight: 600;
          color: $text-main;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-target-bone {
          font-size: 11px;
          color: $text-sub;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .item-actions {
      display: flex;
      gap: 4px;

      .btn-icon {
        background: transparent;
        border: 1px solid $border-color;
        border-radius: 4px;
        padding: 4px 6px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
          background: #f1f5f9;
        }

        &.is-muted {
          opacity: 0.4;
        }

        &.btn-danger:hover {
          background: #fee2e2;
          border-color: $danger;
        }
      }
    }
  }
}

/* 編集パネル */
.editor-panel {
  .panel-block {
    margin-bottom: 12px;
    &:last-child {
      margin-bottom: 0;
    }

    .block-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: $text-main;
      margin-bottom: 6px;
    }
  }
}

/* クイックボーンボタン */
.quick-bones-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;

  .quick-bone-btn {
    padding: 3px 8px;
    font-size: 11px;
    background: #ffffff;
    border: 1px solid $border-color;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      border-color: $primary;
      color: $primary;
    }

    &.active {
      background: $primary;
      color: #ffffff;
      border-color: $primary;
    }
  }
}

/* ボーンセレクター */
.bone-selector-row {
  display: flex;
  gap: 6px;

  .bone-search-input {
    width: 35%;
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid $border-color;
    border-radius: 4px;
    outline: none;

    &:focus {
      border-color: $primary;
    }
  }

  .bone-select {
    flex: 1;
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid $border-color;
    border-radius: 4px;
    outline: none;
    background: #ffffff;

    &:focus {
      border-color: $primary;
    }
  }
}

/* モード切り替えボタン群 */
.mode-buttons-group {
  display: flex;
  gap: 6px;

  .mode-btn {
    flex: 1;
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 600;
    background: #ffffff;
    border: 1px solid $border-color;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      border-color: $primary;
    }

    &.active {
      background: $primary;
      color: #ffffff;
      border-color: $primary;
    }
  }
}

/* Transform 入力行 */
.transform-controls-block {
  background: #ffffff;
  border: 1px solid $border-color;
  border-radius: 4px;
  padding: 8px;

  .transform-row {
    margin-bottom: 8px;

    .row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .tf-title {
        font-size: 11px;
        font-weight: 700;
        color: $text-sub;
      }

      .lock-uniform-label {
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
      }
    }

    .axis-inputs {
      display: flex;
      gap: 6px;

      .axis-group {
        flex: 1;
        display: flex;
        align-items: center;
        border: 1px solid $border-color;
        border-radius: 4px;
        overflow: hidden;

        .axis-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 6px;
          color: #ffffff;

          &.tag-x { background: #ef4444; }
          &.tag-y { background: #10b981; }
          &.tag-z { background: #3b82f6; }
        }

        input {
          width: 100%;
          border: none;
          padding: 4px 6px;
          font-size: 11px;
          outline: none;
          text-align: right;
        }
      }
    }
  }

  .transform-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;

    .btn-reset {
      font-size: 11px;
      padding: 4px 10px;
      background: #f1f5f9;
      border: 1px solid $border-color;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background: #e2e8f0;
      }
    }
  }
}

/* マージブロック */
.merge-block {
  text-align: center;
  margin-top: 14px;

  .btn-merge {
    width: 100%;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    background: $primary;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: $primary-dark;
    }

    &.is-merged {
      background: $success;
    }
  }

  .merge-hint {
    display: block;
    font-size: 11px;
    color: $text-sub;
    margin-top: 4px;
  }
}

.status-alert {
  padding: 8px 12px;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: 4px;
  color: #166534;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  margin-top: 10px;
}
</style>
