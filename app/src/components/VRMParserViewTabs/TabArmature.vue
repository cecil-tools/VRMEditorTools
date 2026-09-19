<template>
  <div class="tabContents tabArmature" v-if="selectTabType == 'tab_armature'">
    <!-- 上部コントロールバー -->
    <div class="armature-toolbar">
      <div class="toolbar-toggles">
        <label class="toggle-label">
          <input type="checkbox" v-model="showSkeleton" @change="onToggleSkeleton" />
          <span class="toggle-text">🦴 {{ $t('armature.showSkeleton') }}</span>
        </label>
        <label class="toggle-label" :class="{ disabled: !showSkeleton }">
          <input type="checkbox" v-model="xrayMode" :disabled="!showSkeleton" @change="onToggleXRay" />
          <span class="toggle-text">👁️ {{ $t('armature.xrayMode') }}</span>
        </label>
      </div>
      <div class="toolbar-actions">
        <button
          type="button"
          class="btn-action btn-focus"
          :disabled="selectedNodeIndex === null"
          @click="onClickFocusSelectedBone"
        >
          🎯 {{ $t('armature.focusBone') }}
        </button>
      </div>
    </div>

    <!-- 概要サマリーカード -->
    <div class="summary-cards">
      <div class="stat-card">
        <div class="stat-val">{{ allNodes.length }}</div>
        <div class="stat-label">{{ $t('armature.totalNodes') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">{{ skinJointsCount }}</div>
        <div class="stat-label">{{ $t('armature.jointCount') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">{{ mappedHumanoidCount }} / {{ totalHumanoidBonesCount }}</div>
        <div class="stat-label">{{ $t('armature.humanoidMapped') }}</div>
      </div>
      <div class="stat-card" :class="requiredSatisfied ? 'card-ok' : 'card-warn'">
        <div class="stat-val">{{ requiredSatisfied ? 'OK' : 'Check' }}</div>
        <div class="stat-label">{{ requiredSatisfied ? $t('armature.requiredBonesOk') : $t('armature.requiredBonesMissing') }}</div>
      </div>
    </div>

    <!-- サブビュー切り替えタブ -->
    <div class="view-switch-tabs">
      <button
        type="button"
        class="switch-btn"
        :class="{ active: currentSubView === 'tree' }"
        @click="currentSubView = 'tree'"
      >
        🌳 {{ $t('armature.viewTree') }}
      </button>
      <button
        type="button"
        class="switch-btn"
        :class="{ active: currentSubView === 'humanoid' }"
        @click="currentSubView = 'humanoid'"
      >
        👤 {{ $t('armature.viewHumanoid') }}
      </button>
    </div>

    <!-- ビュー1: ボーン階層ツリー -->
    <div v-show="currentSubView === 'tree'" class="tree-view-wrapper">
      <div class="tree-search-bar">
        <input
          type="text"
          v-model="searchQuery"
          class="search-input"
          :placeholder="$t('armature.searchPlaceholder')"
        />
        <label class="filter-checkbox">
          <input type="checkbox" v-model="filterHumanoidOnly" />
          <span>{{ $t('armature.filterHumanoidOnly') }}</span>
        </label>
        <div class="tree-expand-btns">
          <button type="button" class="btn-mini" @click="expandAll">{{ $t('armature.expandAll') }}</button>
          <button type="button" class="btn-mini" @click="collapseAll">{{ $t('armature.collapseAll') }}</button>
        </div>
      </div>

      <div class="tree-container">
        <div v-if="filteredRoots.length === 0" class="no-nodes-message">
          一致するノードがありません
        </div>
        <template v-else>
          <div
            v-for="root in filteredRoots"
            :key="root.index"
            class="tree-root-item"
          >
            <div
              class="tree-node-row"
              :class="{
                selected: selectedNodeIndex === root.index,
                'is-humanoid': root.isHumanoid,
                'is-joint': root.isJoint,
                'is-mesh': root.isMesh
              }"
              :style="{ paddingLeft: (root.depth * 18 + 6) + 'px' }"
              @click="onSelectNode(root.index)"
            >
              <span
                class="toggle-arrow"
                v-if="root.hasChildren"
                @click.stop="toggleExpand(root.index)"
              >
                {{ isExpanded(root.index) ? '▼' : '▶' }}
              </span>
              <span class="toggle-arrow-placeholder" v-else>•</span>

              <span class="node-icon">
                {{ root.isHumanoid ? '🦴' : (root.isJoint ? '🦴' : (root.isMesh ? '🔷' : '📦')) }}
              </span>

              <span class="node-name" :title="root.name">{{ root.name }}</span>

              <span class="node-index-badge">#{{ root.index }}</span>

              <span v-if="root.humanoidBone" class="humanoid-badge" :title="'VRM Humanoid: ' + root.humanoidBone">
                {{ root.humanoidBone }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ビュー2: ヒューマノイド対応表 -->
    <div v-show="currentSubView === 'humanoid'" class="humanoid-view-wrapper">
      <div class="humanoid-categories">
        <div
          v-for="cat in humanoidCategories"
          :key="cat.id"
          class="category-group"
        >
          <div class="category-header">
            <span class="cat-title">{{ cat.title }}</span>
            <span class="cat-count">
              {{ getCategoryMappedCount(cat.id) }} / {{ getCategoryBones(cat.id).length }}
            </span>
          </div>
          <div class="category-table">
            <div
              v-for="bone in getCategoryBones(cat.id)"
              :key="bone.name"
              class="humanoid-bone-row"
              :class="{
                selected: selectedNodeIndex === bone.nodeIndex,
                unmapped: !bone.isMapped,
                'required-missing': bone.isRequired && !bone.isMapped
              }"
              @click="bone.isMapped ? onSelectNode(bone.nodeIndex) : null"
            >
              <div class="bone-status-icon">
                <span v-if="bone.isMapped" class="icon-ok">✓</span>
                <span v-else-if="bone.isRequired" class="icon-missing" title="必須ボーン未設定">✕</span>
                <span v-else class="icon-empty">―</span>
              </div>
              <div class="bone-name-col">
                <span class="bone-def-name">{{ bone.name }}</span>
                <span v-if="bone.isRequired" class="required-badge">{{ $t('armature.statusRequired') }}</span>
              </div>
              <div class="bone-target-col">
                <span v-if="bone.isMapped" class="target-node-name">
                  {{ bone.nodeName }} <span class="target-node-idx">#{{ bone.nodeIndex }}</span>
                </span>
                <span v-else class="unmapped-text">{{ $t('armature.unmapped') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 選択中ボーンの詳細インスペクターパネル -->
    <div class="bone-detail-panel">
      <div class="panel-header">
        <h4>{{ $t('armature.selectedBoneInfo') }}</h4>
        <span v-if="selectedNode" class="selected-badge">#{{ selectedNode.index }}</span>
      </div>

      <div v-if="!selectedNode" class="no-selection-msg">
        {{ $t('armature.noBoneSelected') }}
      </div>

      <div v-else class="detail-body">
        <table class="detail-table">
          <tbody>
            <tr>
              <th class="label-th">{{ $t('armature.nodeName') }}</th>
              <td class="val-td highlight-name">{{ selectedNode.name }}</td>
            </tr>
            <tr>
              <th class="label-th">{{ $t('armature.nodeIndex') }}</th>
              <td class="val-td">#{{ selectedNode.index }}</td>
            </tr>
            <tr>
              <th class="label-th">{{ $t('armature.humanoidBone') }}</th>
              <td class="val-td">
                <span v-if="selectedNode.humanoidBone" class="humanoid-badge-large">
                  {{ selectedNode.humanoidBone }}
                </span>
                <span v-else class="text-sub">{{ $t('armature.notMapped') }}</span>
              </td>
            </tr>
            <tr>
              <th class="label-th">{{ $t('armature.parentNode') }}</th>
              <td class="val-td">
                <span
                  v-if="selectedNode.parentIndex !== null"
                  class="link-node"
                  @click="onSelectNode(selectedNode.parentIndex)"
                >
                  {{ selectedNode.parentName }} (#{{ selectedNode.parentIndex }})
                </span>
                <span v-else class="text-sub">{{ $t('armature.none') }} (Root)</span>
              </td>
            </tr>
            <tr>
              <th class="label-th">{{ $t('armature.childNodes') }}</th>
              <td class="val-td">
                <div v-if="selectedNode.childIndices && selectedNode.childIndices.length > 0" class="child-links-list">
                  <span
                    v-for="cIdx in selectedNode.childIndices"
                    :key="cIdx"
                    class="link-node-tag"
                    @click="onSelectNode(cIdx)"
                  >
                    {{ getNodeNameByIndex(cIdx) }} (#{{ cIdx }})
                  </span>
                </div>
                <span v-else class="text-sub">{{ $t('armature.none') }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- ローカルTransform情報 -->
        <div class="transform-section">
          <div class="section-subtitle">{{ $t('armature.transform') }}</div>
          
          <div class="transform-row">
            <span class="tf-label">{{ $t('armature.position') }}:</span>
            <div class="tf-values">
              <span class="axis axis-x">X: {{ formatNum(selectedNode.translation[0]) }}</span>
              <span class="axis axis-y">Y: {{ formatNum(selectedNode.translation[1]) }}</span>
              <span class="axis axis-z">Z: {{ formatNum(selectedNode.translation[2]) }}</span>
            </div>
          </div>

          <div class="transform-row">
            <span class="tf-label">{{ $t('armature.rotation') }} (Euler):</span>
            <div class="tf-values">
              <span class="axis axis-x">X: {{ selectedNode.euler[0] }}°</span>
              <span class="axis axis-y">Y: {{ selectedNode.euler[1] }}°</span>
              <span class="axis axis-z">Z: {{ selectedNode.euler[2] }}°</span>
            </div>
          </div>

          <div class="transform-row">
            <span class="tf-label">{{ $t('armature.scale') }}:</span>
            <div class="tf-values">
              <span class="axis axis-x">X: {{ formatNum(selectedNode.scale[0]) }}</span>
              <span class="axis axis-y">Y: {{ formatNum(selectedNode.scale[1]) }}</span>
              <span class="axis axis-z">Z: {{ formatNum(selectedNode.scale[2]) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-actions">
          <button
            type="button"
            class="btn-focus-large"
            @click="onClickFocusSelectedBone"
          >
            🎯 {{ $t('armature.focusBone') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component({})
export default class TabArmature extends Vue {
  @Prop() selectTabType!: string
  @Prop() json!: any
  @Prop() vrmVersion!: any

  showSkeleton = true
  xrayMode = true
  currentSubView: 'tree' | 'humanoid' = 'tree'

  searchQuery = ''
  filterHumanoidOnly = false
  selectedNodeIndex: number | null = null
  expandedNodeMap: { [key: number]: boolean } = {}

  roots: any[] = []
  allNodes: any[] = []
  skinJoints: Set<number> = new Set()
  humanoidBones: any[] = []
  mappedHumanoidCount = 0
  requiredSatisfied = true

  get skinJointsCount(): number {
    return this.skinJoints.size
  }

  get totalHumanoidBonesCount(): number {
    return this.humanoidBones.length
  }

  get selectedNode(): any {
    if (this.selectedNodeIndex === null) return null
    return this.allNodes[this.selectedNodeIndex] || null
  }

  get humanoidCategories(): Array<{ id: string, title: string }> {
    return [
      { id: 'torso', title: this.$t('armature.categoryTorso') as string },
      { id: 'head', title: this.$t('armature.categoryHead') as string },
      { id: 'leftArm', title: this.$t('armature.categoryLeftArm') as string },
      { id: 'rightArm', title: this.$t('armature.categoryRightArm') as string },
      { id: 'leftFingers', title: this.$t('armature.categoryLeftFingers') as string },
      { id: 'rightFingers', title: this.$t('armature.categoryRightFingers') as string },
      { id: 'leftLeg', title: this.$t('armature.categoryLeftLeg') as string },
      { id: 'rightLeg', title: this.$t('armature.categoryRightLeg') as string }
    ]
  }

  @Watch('json', { immediate: true })
  onJsonChanged() {
    this.refreshData()
  }

  @Watch('selectTabType')
  onTabChanged(newVal: string) {
    if (newVal === 'tab_armature') {
      this.$emit('toggle-skeleton', this.showSkeleton)
      this.$emit('toggle-xray', this.xrayMode)
      if (this.selectedNodeIndex !== null) {
        this.$emit('select-bone', this.selectedNodeIndex)
      }
    }
  }

  refreshData() {
    if (!VRMParser.json) return

    const boneData = VRMParser.getBoneHierarchy()
    this.roots = boneData.roots || []
    this.allNodes = boneData.allNodes || []
    this.skinJoints = boneData.skinJoints || new Set()

    const humData = VRMParser.getHumanoidBonesData()
    this.humanoidBones = humData.humanoidBones || []
    this.mappedHumanoidCount = humData.mappedCount
    this.requiredSatisfied = humData.requiredMappedCount >= humData.requiredTotalCount

    // 初回はルートおよび第1階層を展開
    this.roots.forEach(r => {
      this.$set(this.expandedNodeMap, r.index, true)
      if (r.children) {
        r.children.forEach((c: any) => {
          this.$set(this.expandedNodeMap, c.index, true)
        })
      }
    })

    // デフォルトでヒューマノイドのHipsノードを選択
    if (this.selectedNodeIndex === null) {
      const hipsBone = this.humanoidBones.find(b => b.name.toLowerCase() === 'hips')
      if (hipsBone && hipsBone.isMapped) {
        this.selectedNodeIndex = hipsBone.nodeIndex
      } else if (this.roots.length > 0) {
        this.selectedNodeIndex = this.roots[0].index
      }
    }
  }

  getCategoryBones(catId: string): any[] {
    return this.humanoidBones.filter(b => b.category === catId)
  }

  getCategoryMappedCount(catId: string): number {
    return this.getCategoryBones(catId).filter(b => b.isMapped).length
  }

  getNodeNameByIndex(idx: number): string {
    const n = this.allNodes[idx]
    return n ? n.name : `Node_${idx}`
  }

  isExpanded(idx: number): boolean {
    return !!this.expandedNodeMap[idx]
  }

  toggleExpand(idx: number) {
    this.$set(this.expandedNodeMap, idx, !this.expandedNodeMap[idx])
  }

  expandAll() {
    this.allNodes.forEach(n => {
      if (n.childIndices && n.childIndices.length > 0) {
        this.$set(this.expandedNodeMap, n.index, true)
      }
    })
  }

  collapseAll() {
    this.expandedNodeMap = {}
  }

  onSelectNode(idx: number) {
    this.selectedNodeIndex = idx
    this.ensureParentsExpanded(idx)
    this.$emit('select-bone', idx)
  }

  ensureParentsExpanded(idx: number) {
    let currentIdx = idx
    while (currentIdx !== null) {
      const node = this.allNodes[currentIdx]
      if (node && node.parentIndex !== null && node.parentIndex !== undefined) {
        this.$set(this.expandedNodeMap, node.parentIndex, true)
        currentIdx = node.parentIndex
      } else {
        break
      }
    }
  }

  onClickFocusSelectedBone() {
    if (this.selectedNodeIndex !== null) {
      this.$emit('focus-bone', this.selectedNodeIndex)
    }
  }

  onToggleSkeleton() {
    this.$emit('toggle-skeleton', this.showSkeleton)
  }

  onToggleXRay() {
    this.$emit('toggle-xray', this.xrayMode)
  }

  formatNum(val: any): string {
    const num = parseFloat(val)
    if (isNaN(num)) return '0.000'
    return num.toFixed(3)
  }

  get filteredRoots(): any[] {
    const result: any[] = []
    const query = this.searchQuery.trim().toLowerCase()

    const traverse = (node: any, depth: number) => {
      const nameMatches = !query || node.name.toLowerCase().includes(query)
      const humMatches = !query || (node.humanoidBone && node.humanoidBone.toLowerCase().includes(query))
      const passesQuery = query === '' || nameMatches || humMatches

      const passesHumFilter = !this.filterHumanoidOnly || node.isHumanoid

      const isCurrentVisible = passesQuery && passesHumFilter
      const hasMatchingDescendant = this.nodeHasMatchingDescendant(node, query, this.filterHumanoidOnly)

      if (isCurrentVisible || hasMatchingDescendant) {
        result.push({
          ...node,
          depth,
          hasChildren: node.children && node.children.length > 0
        })

        const shouldExpand = (query !== '' && hasMatchingDescendant) || this.isExpanded(node.index)

        if (shouldExpand && node.children && node.children.length > 0) {
          node.children.forEach((child: any) => traverse(child, depth + 1))
        }
      }
    }

    this.roots.forEach(r => traverse(r, 0))
    return result
  }

  nodeHasMatchingDescendant(node: any, query: string, humanoidOnly: boolean): boolean {
    if (!node.children || node.children.length === 0) return false
    for (const child of node.children) {
      const nameMatches = !query || child.name.toLowerCase().includes(query)
      const humMatches = !query || (child.humanoidBone && child.humanoidBone.toLowerCase().includes(query))
      const passesHum = !humanoidOnly || child.isHumanoid
      if ((nameMatches || humMatches) && passesHum) return true
      if (this.nodeHasMatchingDescendant(child, query, humanoidOnly)) return true
    }
    return false
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
$success: #10b981;
$warning: #f59e0b;

.tabArmature {
  padding: 12px;
  background-color: #ffffff;
  color: $text-main;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* ツールバー */
.armature-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  margin-bottom: 12px;

  .toolbar-toggles {
    display: flex;
    align-items: center;
    gap: 16px;

    .toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;

      &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      input[type="checkbox"] {
        cursor: pointer;
      }
    }
  }

  .btn-action {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: $primary;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover:not(:disabled) {
      background: $primary-dark;
    }

    &:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
    }
  }
}

/* 概要サマリーカード */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;

  .stat-card {
    background: $bg-card;
    border: 1px solid $border-color;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: center;

    .stat-val {
      font-size: 16px;
      font-weight: bold;
      color: $primary;
    }

    .stat-label {
      font-size: 11px;
      color: $text-sub;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &.card-ok .stat-val {
      color: $success;
    }

    &.card-warn .stat-val {
      color: $warning;
    }
  }
}

/* サブビュー切り替え */
.view-switch-tabs {
  display: flex;
  border-bottom: 2px solid $border-color;
  margin-bottom: 12px;

  .switch-btn {
    flex: 1;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    font-size: 13px;
    font-weight: 600;
    color: $text-sub;
    cursor: pointer;
    transition: all 0.15s ease;

    &.active {
      color: $primary;
      border-bottom-color: $primary;
    }

    &:hover:not(.active) {
      color: $text-main;
      background: #f8fafc;
    }
  }
}

/* ツリー検索・フィルタ */
.tree-search-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;

  .search-input {
    flex: 1;
    min-width: 140px;
    padding: 5px 8px;
    font-size: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;

    &:focus {
      outline: none;
      border-color: $primary;
    }
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: $text-sub;
    cursor: pointer;
    user-select: none;
  }

  .tree-expand-btns {
    display: flex;
    gap: 4px;

    .btn-mini {
      padding: 3px 8px;
      font-size: 11px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      color: $text-sub;
      cursor: pointer;

      &:hover {
        background: #e2e8f0;
        color: $text-main;
      }
    }
  }
}

/* ツリー本体 */
.tree-container {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid $border-color;
  border-radius: 6px;
  background: #ffffff;
  padding: 4px 0;

  .no-nodes-message {
    padding: 20px;
    text-align: center;
    color: $text-sub;
    font-size: 12px;
  }

  .tree-node-row {
    display: flex;
    align-items: center;
    padding-top: 4px;
    padding-bottom: 4px;
    padding-right: 8px;
    cursor: pointer;
    user-select: none;
    font-size: 12px;
    line-height: 1.4;
    transition: background 0.1s;

    &:hover {
      background-color: #f1f5f9;
    }

    &.selected {
      background-color: #e0f2fe;
      color: #0369a1;
      font-weight: 600;
    }

    .toggle-arrow {
      display: inline-block;
      width: 16px;
      font-size: 10px;
      color: $text-sub;
      cursor: pointer;
      text-align: center;
    }

    .toggle-arrow-placeholder {
      display: inline-block;
      width: 16px;
      text-align: center;
      color: #cbd5e1;
      font-size: 10px;
    }

    .node-icon {
      font-size: 11px;
      margin-right: 4px;
    }

    .node-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 6px;
    }

    .node-index-badge {
      font-size: 10px;
      color: #94a3b8;
      margin-right: 6px;
    }

    .humanoid-badge {
      font-size: 10px;
      padding: 1px 6px;
      background: #e0f2fe;
      color: #0284c7;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      font-weight: 500;
      white-space: nowrap;
    }
  }
}

/* ヒューマノイド対応表 */
.humanoid-view-wrapper {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 6px;
  background: #ffffff;

  .category-group {
    margin-bottom: 10px;

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      background: #f8fafc;
      border-left: 3px solid $primary;
      font-size: 12px;
      font-weight: bold;
      color: $text-main;
      margin-bottom: 4px;

      .cat-count {
        font-size: 11px;
        color: $text-sub;
      }
    }

    .category-table {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .humanoid-bone-row {
        display: flex;
        align-items: center;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;

        &:hover {
          background: #f1f5f9;
        }

        &.selected {
          background: #e0f2fe;
          font-weight: 600;
        }

        &.required-missing {
          background: #fef2f2;
        }

        .bone-status-icon {
          width: 18px;
          text-align: center;
          font-size: 12px;

          .icon-ok {
            color: $success;
            font-weight: bold;
          }

          .icon-missing {
            color: #ef4444;
            font-weight: bold;
          }

          .icon-empty {
            color: #cbd5e1;
          }
        }

        .bone-name-col {
          width: 140px;
          display: flex;
          align-items: center;
          gap: 4px;

          .bone-def-name {
            font-family: monospace;
          }

          .required-badge {
            font-size: 9px;
            padding: 1px 4px;
            background: #fee2e2;
            color: #dc2626;
            border-radius: 3px;
          }
        }

        .bone-target-col {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          .target-node-name {
            color: $text-main;
          }

          .target-node-idx {
            font-size: 10px;
            color: $text-sub;
          }

          .unmapped-text {
            color: #94a3b8;
            font-style: italic;
          }
        }
      }
    }
  }
}

/* 選択ボーン詳細パネル */
.bone-detail-panel {
  margin-top: 14px;
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 10px;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid $border-color;
    padding-bottom: 6px;
    margin-bottom: 8px;

    h4 {
      margin: 0;
      font-size: 13px;
      color: $text-main;
    }

    .selected-badge {
      font-size: 11px;
      padding: 1px 6px;
      background: $primary;
      color: #fff;
      border-radius: 10px;
    }
  }

  .no-selection-msg {
    text-align: center;
    color: $text-sub;
    font-size: 12px;
    padding: 12px;
  }

  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 8px;

    .label-th {
      width: 120px;
      text-align: left;
      color: $text-sub;
      font-weight: 500;
      padding: 4px 6px;
    }

    .val-td {
      padding: 4px 6px;
      color: $text-main;

      &.highlight-name {
        font-weight: bold;
      }
    }

    .humanoid-badge-large {
      padding: 2px 8px;
      background: #e0f2fe;
      color: #0284c7;
      border: 1px solid #bae6fd;
      border-radius: 12px;
      font-weight: 600;
    }

    .link-node {
      color: $primary;
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: $primary-dark;
      }
    }

    .child-links-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .link-node-tag {
        font-size: 11px;
        padding: 2px 6px;
        background: #e2e8f0;
        color: $text-main;
        border-radius: 3px;
        cursor: pointer;

        &:hover {
          background: #cbd5e1;
        }
      }
    }

    .text-sub {
      color: $text-sub;
    }
  }

  /* Transform 情報 */
  .transform-section {
    background: #ffffff;
    border: 1px solid $border-color;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 8px;

    .section-subtitle {
      font-size: 11px;
      font-weight: bold;
      color: $text-sub;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .transform-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
      margin-bottom: 6px;

      &:last-child {
        margin-bottom: 0;
      }

      .tf-label {
        color: $text-sub;
      }

      .tf-values {
        display: flex;
        gap: 8px;
        font-family: monospace;

        .axis {
          padding: 2px 6px;
          border-radius: 3px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;

          &.axis-x { border-left: 2px solid #ef4444; }
          &.axis-y { border-left: 2px solid #10b981; }
          &.axis-z { border-left: 2px solid #3b82f6; }
        }
      }
    }
  }

  .detail-actions {
    display: flex;
    justify-content: flex-end;

    .btn-focus-large {
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      background: $primary;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background: $primary-dark;
      }
    }
  }
}
</style>
