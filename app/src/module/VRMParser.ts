class VRMParser {

    // glTF2.0 glb フォーマット
    // https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification

    //VRM パース
    public static parse = (file: File) => {
        console.log('parse', file);
        // TODO Header, Chunks を取り出す
        // Chunks 0 を Jsonとしてパース
        // Chunks 1 は 各バイナリデータ        
    } 
}

export default VRMParser;