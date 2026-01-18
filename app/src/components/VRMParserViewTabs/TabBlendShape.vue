<template>
    <div class="tabContents tabBlendShape" v-if="selectTabType == 'tab_blendshape'">
        <div class="buttons download">
            <button class="button download" @click="clickDownloadAll">Download All</button>
            <div class="description">表情を撮影してダウンロードする</div>
        </div>
        <hr />
        <div class="buttons" v-if="vrmVersion.version == 0">
            <div v-for="blendShapeGroup,i in blendShapeGroups" :key="i">
                <button class="button" @click="selectBlendShape(blendShapeGroup.presetName)">{{blendShapeName(blendShapeGroup.presetName)}}</button>
            </div>
        </div>
        <div class="buttons" v-if="vrmVersion.version != 0">
            <div v-for="name,i in Object.keys(blendShapeGroups)" :key="i">
                <button class="button" @click="selectBlendShape(name)">{{blendShapeName(name)}}</button>
            </div>
        </div>
    </div>
</template>


<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import VRMParser from '@/module/VRMParser'

// VRM-1.0の変更点
// https://vrm.dev/vrm1/changed.html

@Component
export default class TabBlendShape extends Vue {
    @Prop() 
    drawVrm: (file: File) => void

    @Prop()
    changeBlendShape: (name: string) => void

    @Prop()
    selectTabType: string;

    @Prop()
    blendShapeGroups: any;

    @Prop()
    vrmVersion: any;

    @Prop()
    json: any;

    blendShapeName(name: string) {
        const key = name.toLocaleLowerCase()
        console.log(`blendShapeName ${name}`, `blendShape.${key}`);
        return (this.$t(`blendShape.${key}`) != `blendShape.${key}`) ? this.$t(`blendShape.${key}`): name
    }

    // 表情選択
    selectBlendShape(name: string) {
        console.log('selectBlendShape', name)
        // this.$emit('selectBlendShape', name)
        
        // 表情変更
        this.changeBlendShape(name)

        // TODO メッシュ一覧を表示
    }

    clickDownloadAll() {
        let names: string[] = [];
        if (this.vrmVersion.version == 0) {
            names = this.blendShapeGroups.map((g: any) => g.presetName);
        } else {
            names = Object.keys(this.blendShapeGroups);
        }
        console.log('clickDownloadAll', names);
        this.$emit('download-all-blendshapes', names);
    }
}
</script>

<style scoped lang="scss">
$white: #fff;

.tabBlendShape {

    .title {
        text-align: left;
    }

    .buttons {
        width: 320px;
        margin-top: 3px;
        overflow: hidden;
        .button {
            float: left;
            width: 100px;
            height: 60px;
            font-size: normal;
            margin: 2px;
        }

        &.download {
           width: 100%;
           .button {
               width: 150px;
               height: 40px;
           }
           .description {
               float: left;
               width: 100%;
               font-size: 12px;
               color: #333;
               margin-top: 5px;
               text-align: left;
           }
        }
    }
}
</style>