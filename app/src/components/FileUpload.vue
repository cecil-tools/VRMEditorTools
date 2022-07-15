<template>
  <div class="fileupload">
      <label for="btnFile">VRMファイルを選択</label>
      <input id="btnFile" type="file" @change="changeFile" placeholder="VRMファイル" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'

@Component({
  components: {
  } 
})
export default class FileUpload extends Vue {
    @Prop()
    changeFile!: (event: any) => void
}
</script>

<style scoped lang="scss">
  .fileupload {
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
    input[type="file"]  {
      /* font-size: large; */
      display:none; 
    }
  }
</style>
