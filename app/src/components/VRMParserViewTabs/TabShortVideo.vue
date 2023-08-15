<template>
    <div class="tabContents tabShortVideo" v-if="selectTabType == 'tab_short_video'">
        <div class="label labelScene">{{$t('tabShortVideoLabelScene')}}</div>
        <div class="scene">
            <select @onchange="changeScene">
                <option>シーンを選択</option>
                <option>ふぁぼリツ</option>
                <option>ダンスA</option>
                <option>ダンスB</option>
            </select>
        </div>
        <div>
            <div class="btn fileupload">
                <label for="btnBackgroundImageFileSelect">{{$t('tabShortVideoLabelBackgroundImage')}} {{$t('tabShortVideoBtnBackgroundImage')}}</label>
                <input id="btnBackgroundImageFileSelect" type="file" @change="changeFile" placeholder="画像ファイル" />
            </div>
        </div>
        <div>
            <div class="label">&nbsp;</div>
            <div class="btn fileupload">
                <label for="btnCreateVideo">{{$t('tabShortVideoBtnCreateVideo')}}</label>
                <input id="btnCreateVideo" type="button" @click="clickCreateVideo" placeholder="動画作成" />
                <div class="step-progress" :style="progressStyle"></div>
            </div>
        </div>        
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
// import VRMParser from '@/module/VRMParser'

declare var MediaRecorder: any;

@Component
export default class TabShortVideo extends Vue {
    @Prop()
    selectTabType: string

    // 進捗バーのパーセンテージ
    progress: 0
    progressStyle = `width: 0%`

    // 進捗を更新
    updateProgress() {

        this.progressStyle = `width: ${this.progress}%`
    }

    changeScene(e :Event) {
        console.log('changeScene', e.target)
        // TODO アニメーションを反映させる
    }

    changeFile(e :Event) {
        console.log('changeFile', e.target)
        // TODO canvas 背景として設定する
    }

    // 動画ファイルを作成する
    createVideo() {
        // 進捗 初期化
        this.progress = 0;

        const canvas = document.getElementById('canvas') as HTMLCanvasElement
        console.log('canvas', canvas)
        if(canvas == null) {
            return
        }        
        const stream = canvas.captureStream()
        // const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" })
        const recorder = new MediaRecorder(stream)
        //録画終了時に動画ファイルのダウンロードリンクを生成する処理
        recorder.ondataavailable = function(e: any) {
            var videoBlob = new Blob([e.data], { type: e.data.type })
            const blobUrl = window.URL.createObjectURL(videoBlob)

            const anchor = document.createElement('a')
            anchor.download = 'movie.webm'
            anchor.href = blobUrl
            anchor.style.display = 'block'
            anchor.click()
        }
        recorder.start()

        // TODO シーンに合わせて 録画終了 時間を変更する
        const stopVideoSec = 15
        const timerId = setInterval((t: number) => {
            this.progress += (100/stopVideoSec)
            this.updateProgress()
            console.log('progress', this.progress)

            // 進捗 100%になったら録画終了
            if (this.progress >= 100) {
                // タイマー停止
                clearInterval(timerId)             
                recorder.stop()
            }
        }, 1000);
    }
    
    clickCreateVideo(e :Event) {
        console.log('clickCreateVideo', e.target);
        this.createVideo();
    }
}
</script>

<style scoped lang="scss">
  .tabShortVideo {
    .label {

    }

    .btn {
        label {
            font-size: large;
            border: solid 3px #AAAAAA;
            background-color: #F0F0F0;
            display: block;
            width: 90%;
            margin: 5px auto;
            transition: .3s;
        }
        label:hover {
            background-color: #AAAAAA;
        }
        input {
            display: none; 
        }
    }
    
    .step-progress {
        display: flex;
        height: 5px;
        margin: 5px 10px;
        background-color: #2dfc3e;
        transition: 0.5s;
        width: 0%;

        .progress {

        }
    }
  }
</style>