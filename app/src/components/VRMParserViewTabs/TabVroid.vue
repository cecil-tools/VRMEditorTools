<template>
  <div class="tabContents tabVroid" v-if="selectTabType == 'tab_vroid'">
    <div class="vroid-header">
      <div class="vroid-title">{{ $t('vroid.title') }}</div>
      <div class="vroid-desc">{{ $t('vroid.description') }}</div>
    </div>

    <!-- スプリングボーン未検出時 -->
    <div v-if="!springBoneGroups || springBoneGroups.length === 0" class="no-groups-card">
      <span>{{ $t('vroid.noSpringBones') }}</span>
    </div>

    <!-- スプリングボーン設定カード -->
    <div v-else class="vroid-content-card">
      <!-- グループ選択 -->
      <div class="form-group">
        <label class="group-label">{{ $t('vroid.targetGroup') }}</label>
        <div class="select-wrapper">
          <select v-model="selectedGroupId" @change="onSelectGroup" class="group-select">
            <option
              v-for="group in springBoneGroups"
              :key="group.id"
              :value="group.id"
            >
              {{ group.name }} {{ group.isSkirt ? `[${$t('vroid.skirtBadge')}]` : '' }}
            </option>
          </select>
        </div>
      </div>

      <!-- Gravity Power 調整 -->
      <div class="param-section">
        <div class="param-header">
          <span class="param-name">{{ $t('vroid.gravityPower') }}</span>
          <div class="param-input-wrapper">
            <input
              type="number"
              class="param-number-input"
              step="0.01"
              min="0"
              v-model.number="currentGravityPower"
              @input="onGravityPowerChange"
            />
          </div>
        </div>

        <!-- スライダー -->
        <div class="slider-wrapper">
          <input
            type="range"
            class="param-slider"
            min="0"
            max="1.0"
            step="0.01"
            :value="currentGravityPower"
            @input="onSliderGravityInput"
          />
        </div>
        <div class="param-guide">
          <span>{{ $t('vroid.gravityGuide') }}</span>
        </div>

        <!-- クイックプリセットボタン -->
        <div class="presets-row">
          <button
            type="button"
            class="btn-preset"
            :class="{ active: currentGravityPower === 0.0 }"
            @click="setGravityPreset(0.0)"
          >
            {{ $t('vroid.presetNone') }}
          </button>
          <button
            type="button"
            class="btn-preset"
            :class="{ active: currentGravityPower === 0.05 }"
            @click="setGravityPreset(0.05)"
          >
            {{ $t('vroid.presetWeak') }}
          </button>
          <button
            type="button"
            class="btn-preset"
            :class="{ active: currentGravityPower === 0.1 }"
            @click="setGravityPreset(0.1)"
          >
            {{ $t('vroid.presetDefault') }}
          </button>
          <button
            type="button"
            class="btn-preset"
            :class="{ active: currentGravityPower === 0.2 }"
            @click="setGravityPreset(0.2)"
          >
            {{ $t('vroid.presetStrong') }}
          </button>
        </div>
      </div>

      <!-- Hit Radius 調整 -->
      <div class="param-section">
        <div class="param-header">
          <span class="param-name">{{ $t('vroid.hitRadius') }}</span>
          <div class="param-input-wrapper">
            <input
              type="number"
              class="param-number-input"
              step="0.005"
              min="0"
              v-model.number="currentHitRadius"
              @input="onHitRadiusChange"
            />
          </div>
        </div>

        <!-- スライダー -->
        <div class="slider-wrapper">
          <input
            type="range"
            class="param-slider"
            min="0"
            max="0.1"
            step="0.005"
            :value="currentHitRadius"
            @input="onSliderHitRadiusInput"
          />
        </div>
        <div class="param-guide">
          <span>{{ $t('vroid.hitRadiusGuide') }}</span>
        </div>
      </div>

      <!-- 更新ボタン -->
      <div class="action-section">
        <button
          type="button"
          class="btn-save"
          :disabled="isUpdating"
          @click="clickUpdateVroid"
        >
          <span v-if="isUpdating">{{ $t('vroid.saving') }}</span>
          <span v-else>{{ $t('vroid.btnUpdate') }}</span>
        </button>
        <span v-if="showSuccessMessage" class="success-message">
          ✓ {{ $t('vroid.updateSuccess') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

@Component({})
export default class TabVroid extends Vue {
  @Prop({ required: true })
  selectTabType!: string;

  @Prop({ default: () => [] })
  springBoneGroups!: Array<{
    id: string;
    name: string;
    isSkirt: boolean;
    gravityPower: number;
    hitRadius: number;
    version: 0 | 1;
    boneNames: string[];
  }>;

  selectedGroupId = '';
  currentGravityPower = 0.1;
  currentHitRadius = 0.02;
  isUpdating = false;
  showSuccessMessage = false;

  mounted() {
    this.initSelectedGroup();
  }

  @Watch('springBoneGroups')
  onSpringBoneGroupsChange() {
    this.initSelectedGroup();
  }

  initSelectedGroup() {
    if (!this.springBoneGroups || this.springBoneGroups.length === 0) {
      this.selectedGroupId = '';
      return;
    }

    // すでに有効な選択があれば維持
    const current = this.springBoneGroups.find(g => g.id === this.selectedGroupId);
    if (current) {
      this.currentGravityPower = current.gravityPower;
      this.currentHitRadius = current.hitRadius;
      return;
    }

    // スカートグループを優先選択
    const skirtGroup = this.springBoneGroups.find(g => g.isSkirt);
    const target = skirtGroup || this.springBoneGroups[0];
    if (target) {
      this.selectedGroupId = target.id;
      this.currentGravityPower = target.gravityPower;
      this.currentHitRadius = target.hitRadius;
    }
  }

  get currentGroup() {
    return this.springBoneGroups.find(g => g.id === this.selectedGroupId);
  }

  onSelectGroup() {
    if (this.currentGroup) {
      this.currentGravityPower = this.currentGroup.gravityPower;
      this.currentHitRadius = this.currentGroup.hitRadius;
      this.emitPreview();
    }
  }

  onSliderGravityInput(e: any) {
    this.currentGravityPower = parseFloat(e.target.value);
    this.onGravityPowerChange();
  }

  onGravityPowerChange() {
    if (isNaN(this.currentGravityPower) || this.currentGravityPower < 0) {
      this.currentGravityPower = 0;
    }
    this.emitPreview();
  }

  onSliderHitRadiusInput(e: any) {
    this.currentHitRadius = parseFloat(e.target.value);
    this.onHitRadiusChange();
  }

  onHitRadiusChange() {
    if (isNaN(this.currentHitRadius) || this.currentHitRadius < 0) {
      this.currentHitRadius = 0;
    }
    this.emitPreview();
  }

  setGravityPreset(val: number) {
    this.currentGravityPower = val;
    this.emitPreview();
  }

  emitPreview() {
    const targetBoneNames = this.currentGroup ? this.currentGroup.boneNames : [];
    this.$emit('preview-spring-bone', {
      targetBoneNames,
      settings: {
        gravityPower: this.currentGravityPower,
        hitRadius: this.currentHitRadius,
      },
    });
  }

  async clickUpdateVroid() {
    if (!this.selectedGroupId) return;

    this.isUpdating = true;
    this.showSuccessMessage = false;

    try {
      await VRMParser.updateSpringBoneGroup(this.selectedGroupId, {
        gravityPower: this.currentGravityPower,
        hitRadius: this.currentHitRadius,
      });

      // ローカルグループのキャッシュも更新
      if (this.currentGroup) {
        this.currentGroup.gravityPower = this.currentGravityPower;
        this.currentGroup.hitRadius = this.currentHitRadius;
      }

      this.showSuccessMessage = true;
      setTimeout(() => {
        this.showSuccessMessage = false;
      }, 3000);
    } catch (e) {
      console.error('Failed to update spring bone group', e);
      alert('更新に失敗しました: ' + e);
    } finally {
      this.isUpdating = false;
    }
  }
}
</script>

<style scoped lang="scss">
.tabVroid {
  padding: 12px 16px;
  box-sizing: border-box;

  .vroid-header {
    margin-bottom: 14px;
    text-align: left;

    .vroid-title {
      font-size: 1.1rem;
      font-weight: bold;
      color: #333;
    }

    .vroid-desc {
      font-size: 0.85rem;
      color: #666;
      margin-top: 4px;
    }
  }

  .no-groups-card {
    background: #fafafa;
    border: 1px dashed #ccc;
    border-radius: 8px;
    padding: 24px 16px;
    color: #888;
    font-size: 0.9rem;
    text-align: center;
  }

  .vroid-content-card {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    text-align: left;

    .form-group {
      margin-bottom: 16px;

      .group-label {
        display: block;
        font-size: 0.85rem;
        font-weight: bold;
        color: #444;
        margin-bottom: 6px;
      }

      .select-wrapper {
        position: relative;

        .group-select {
          width: 100%;
          padding: 8px 12px;
          font-size: 0.9rem;
          border: 1px solid #ccc;
          border-radius: 6px;
          background-color: #fff;
          color: #333;
          outline: none;
          transition: border-color 0.2s;

          &:focus {
            border-color: #1976d2;
          }
        }
      }
    }

    .param-section {
      border-top: 1px solid #f0f0f0;
      padding-top: 14px;
      margin-bottom: 14px;

      .param-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .param-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #222;
        }

        .param-number-input {
          width: 75px;
          padding: 4px 6px;
          font-size: 0.85rem;
          text-align: right;
          border: 1px solid #ccc;
          border-radius: 4px;
          outline: none;

          &:focus {
            border-color: #1976d2;
          }
        }
      }

      .slider-wrapper {
        margin-bottom: 6px;

        .param-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #e0e0e0;
          outline: none;
          cursor: pointer;
          accent-color: #1976d2;

          &::-webkit-slider-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #1976d2;
            cursor: pointer;
            transition: transform 0.1s;
          }

          &::-webkit-slider-thumb:hover {
            transform: scale(1.2);
          }
        }
      }

      .param-guide {
        font-size: 0.75rem;
        color: #78909c;
        margin-bottom: 8px;
      }

      .presets-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;

        .btn-preset {
          padding: 4px 8px;
          font-size: 0.75rem;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          background: #f9f9f9;
          color: #555;
          cursor: pointer;
          transition: all 0.15s;

          &:hover {
            background: #eee;
          }

          &.active {
            background: #1976d2;
            border-color: #1976d2;
            color: #fff;
            font-weight: bold;
          }
        }
      }
    }

    .action-section {
      border-top: 1px solid #f0f0f0;
      padding-top: 16px;
      display: flex;
      align-items: center;
      gap: 12px;

      .btn-save {
        padding: 10px 24px;
        font-size: 0.95rem;
        font-weight: bold;
        color: #fff;
        background: linear-gradient(135deg, #007db9, #0096db);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
        box-shadow: 0 2px 5px rgba(0, 125, 185, 0.3);

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #006a9d, #0082be);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .success-message {
        font-size: 0.85rem;
        font-weight: bold;
        color: #2e7d32;
      }
    }
  }
}
</style>