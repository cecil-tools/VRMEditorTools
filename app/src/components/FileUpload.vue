<template>
  <div class="fileupload">
    <form>
        <input type="file" @change="changeFile" placeholder="VRMファイル" />
    </form>
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

<style scoped>
  #canvas {    
    width: 300px;
    height: 400px;

    background-color: gray;
    border: 1px solid red;
  }
</style>
