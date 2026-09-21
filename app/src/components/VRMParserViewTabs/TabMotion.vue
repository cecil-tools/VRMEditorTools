<template>
  <div class="tabContents tabMotion" v-if="selectTabType === 'tab_motion'">
    <div class="motion-header">
      <div class="motion-title">{{ $t('motion.title') }}</div>
      <div class="motion-desc">{{ $t('motion.description') }}</div>
    </div>

    <!-- VRMA アップロードエリア -->
    <div
      class="upload-dropzone"
      :class="{ 'is-dragover': isDragOver }"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <label for="vrmaFileInput" class="btn-select-vrma">
        <span class="icon">📁</span> {{ $t('motion.selectFile') }}
      </label>
      <input
        id="vrmaFileInput"
        type="file"
        accept=".vrma"
        @change="onFileChange"
      />
      <div class="drop-hint">{{ $t('motion.dragDropHint') }}</div>
    </div>

    <!-- モーション情報表示 -->
    <div v-if="motionInfo" class="motion-info-card">
      <div class="info-row">
        <span class="info-label">{{ $t('motion.fileName') }}:</span>
        <span class="info-value file-name">{{ motionInfo.fileName }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('motion.duration') }}:</span>
        <span class="info-value">{{ formatTime(motionInfo.duration) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ $t('motion.trackCount') }}:</span>
        <span class="info-value">{{ motionInfo.trackCount }}</span>
      </div>
    </div>
    <div v-else class="no-motion-card">
      <span>{{ $t('motion.noMotion') }}</span>
    </div>

    <!-- 再生コントロール -->
    <div v-if="motionInfo" class="motion-controls-card">
      <!-- タイムライン / シークバー -->
      <div class="timeline-section">
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span>/</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
        <input
          type="range"
          class="timeline-slider"
          min="0"
          :max="duration"
          step="0.01"
          :value="currentTime"
          @input="onSeekInput"
        />
      </div>

      <!-- メインボタングループ -->
      <div class="playback-buttons">
        <button
          class="btn-playback btn-play-pause"
          :class="{ 'is-playing': isPlaying }"
          @click="togglePlayPause"
          :title="isPlaying ? $t('motion.pause') : $t('motion.play')"
        >
          <span v-if="isPlaying">⏸ {{ $t('motion.pause') }}</span>
          <span v-else>▶ {{ $t('motion.play') }}</span>
        </button>
        <button
          class="btn-playback btn-stop"
          @click="onStop"
          :title="$t('motion.stop')"
        >
          ⏹ {{ $t('motion.stop') }}
        </button>
        <button
          class="btn-playback btn-reset-pose"
          @click="onResetPose"
          :title="$t('motion.resetPose')"
        >
          🔄 {{ $t('motion.resetPose') }}
        </button>
      </div>

      <!-- 再生オプション（ループ & 速度） -->
      <div class="playback-options">
        <label class="option-loop">
          <input
            type="checkbox"
            :checked="isLoop"
            @change="onLoopChange"
          />
          <span>🔁 {{ $t('motion.loop') }}</span>
        </label>

        <div class="option-speed">
          <span class="speed-label">{{ $t('motion.playbackSpeed') }}:</span>
          <div class="speed-buttons">
            <button
              v-for="spd in speedOptions"
              :key="spd"
              class="btn-speed"
              :class="{ active: speed === spd }"
              @click="onSpeedChange(spd)"
            >
              {{ spd }}x
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

@Component({})
export default class TabMotion extends Vue {
  @Prop({ required: true })
  selectTabType!: string;

  @Prop({ default: null })
  motionInfo!: { fileName: string; duration: number; trackCount: number } | null;

  @Prop({ default: false })
  isPlaying!: boolean;

  @Prop({ default: 0 })
  currentTime!: number;

  @Prop({ default: 0 })
  duration!: number;

  isDragOver = false;
  isLoop = true;
  speed = 1.0;
  speedOptions = [0.25, 0.5, 1.0, 1.5, 2.0];

  onDragOver(e: DragEvent) {
    this.isDragOver = true;
  }

  onDragLeave(e: DragEvent) {
    this.isDragOver = false;
  }

  onDrop(e: DragEvent) {
    this.isDragOver = false;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.vrma')) {
        this.$emit('load-vrma', file);
      } else {
        alert('VRMA (.vrma) ファイルを選択してください。');
      }
    }
  }

  onFileChange(e: any) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.$emit('load-vrma', file);
      e.target.value = '';
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.$emit('pause-motion');
    } else {
      this.$emit('play-motion');
    }
  }

  onStop() {
    this.$emit('stop-motion');
  }

  onResetPose() {
    this.$emit('reset-motion-pose');
  }

  onSeekInput(e: any) {
    const time = parseFloat(e.target.value);
    this.$emit('seek-motion', time);
  }

  onLoopChange(e: any) {
    this.isLoop = e.target.checked;
    this.$emit('set-motion-loop', this.isLoop);
  }

  onSpeedChange(speed: number) {
    this.speed = speed;
    this.$emit('set-motion-speed', speed);
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }
}
</script>

<style scoped lang="scss">
.tabMotion {
  padding: 12px 16px;
  box-sizing: border-box;

  .motion-header {
    margin-bottom: 12px;
    text-align: left;

    .motion-title {
      font-size: 1.1rem;
      font-weight: bold;
      color: #333;
    }

    .motion-desc {
      font-size: 0.85rem;
      color: #666;
      margin-top: 4px;
    }
  }

  /* ドロップゾーン */
  .upload-dropzone {
    border: 2px dashed #90caf9;
    background-color: #f3f8ff;
    border-radius: 8px;
    padding: 16px 12px;
    text-align: center;
    transition: all 0.25s ease;
    margin-bottom: 14px;

    &.is-dragover {
      border-color: #1976d2;
      background-color: #e3f2fd;
      transform: scale(1.01);
    }

    .btn-select-vrma {
      display: inline-block;
      padding: 8px 20px;
      font-size: 0.95rem;
      font-weight: bold;
      color: #fff;
      background: linear-gradient(135deg, #1976d2, #2196f3);
      border-radius: 20px;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(25, 118, 210, 0.3);
      transition: background 0.2s, transform 0.1s;

      &:hover {
        background: linear-gradient(135deg, #1565c0, #1e88e5);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }

      .icon {
        margin-right: 4px;
      }
    }

    input[type="file"] {
      display: none;
    }

    .drop-hint {
      margin-top: 8px;
      font-size: 0.8rem;
      color: #78909c;
    }
  }

  /* モーション情報カード */
  .motion-info-card {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;
    text-align: left;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 0.85rem;

      &:last-child {
        margin-bottom: 0;
      }

      .info-label {
        color: #666;
        font-weight: 500;
      }

      .info-value {
        color: #222;
        font-weight: 600;

        &.file-name {
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #1976d2;
        }
      }
    }
  }

  .no-motion-card {
    background: #fafafa;
    border: 1px dashed #ccc;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 14px;
    color: #999;
    font-size: 0.85rem;
  }

  /* 再生コントロールカード */
  .motion-controls-card {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    /* タイムライン */
    .timeline-section {
      margin-bottom: 14px;

      .time-display {
        display: flex;
        justify-content: flex-end;
        gap: 4px;
        font-family: monospace;
        font-size: 0.85rem;
        color: #555;
        margin-bottom: 4px;
      }

      .timeline-slider {
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

    /* 再生ボタン群 */
    .playback-buttons {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;

      .btn-playback {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;

        &.btn-play-pause {
          background: #1976d2;
          color: white;

          &:hover {
            background: #1565c0;
          }

          &.is-playing {
            background: #f57c00;

            &:hover {
              background: #ef6c00;
            }
          }
        }

        &.btn-stop {
          background: #e0e0e0;
          color: #333;

          &:hover {
            background: #d5d5d5;
          }
        }

        &.btn-reset-pose {
          background: #eceff1;
          color: #37474f;

          &:hover {
            background: #cfd8dc;
          }
        }
      }
    }

    /* オプション（ループ＆速度） */
    .playback-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid #f0f0f0;
      padding-top: 12px;

      .option-loop {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.85rem;
        color: #444;
        cursor: pointer;

        input[type="checkbox"] {
          cursor: pointer;
        }
      }

      .option-speed {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.85rem;

        .speed-label {
          color: #666;
        }

        .speed-buttons {
          display: flex;
          gap: 4px;

          .btn-speed {
            padding: 3px 8px;
            font-size: 0.75rem;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: #fafafa;
            color: #555;
            cursor: pointer;
            transition: all 0.15s;

            &:hover {
              background: #eee;
            }

            &.active {
              background: #1976d2;
              border-color: #1976d2;
              color: white;
              font-weight: bold;
            }
          }
        }
      }
    }
  }
}

@media screen and (max-width: 480px) {
  .tabMotion {
    padding: 8px 10px;

    .playback-buttons {
      flex-wrap: wrap;

      .btn-playback {
        flex: 1 1 auto;
        font-size: 0.8rem;
        padding: 8px 10px;
      }
    }
  }
}
</style>
