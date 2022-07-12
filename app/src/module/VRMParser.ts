class VRMParser {

    // glTF2.0 glb フォーマット
    // https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification

    static LittleEndian = true
    static HEADER_MAGIC = '0x46546C67'
    static CHUNK_TYPE_JSON = '0x4E4F534A'
    static CHUNK_TYPE_BIN = '0x004E4942'

    //VRM パース
    public static parse = (file?: File) => {
        console.log('parse', file)
        if (typeof file == 'undefined') {
            return;
        }

        const reader = new FileReader()
        reader.onload = VRMParser.onLoadVRMFile
        reader.readAsArrayBuffer(file)
    }

    private static onLoadVRMFile = (event: any) => {
        // console.log('onLoadVRMFile', event)
        // console.log('total', event.total)        
        const raw: ArrayBuffer = event.currentTarget.result
        // DataView バイナリデータ読み書きオブジェクト
        const src = new DataView(raw)
        // TODO Header, Chunks を取り出す
        // Header 12-byte
        const header = VRMParser.parseHeader(src)
        // console.log('magic', header.magicToStr)
        if (header.magicToStr != VRMParser.HEADER_MAGIC) {
            // glb じゃなかった
            console.warn('file is not GLB file');
            return;
        }
        console.log('version', header.version)
        console.log('length', header.length)

        // Chunks 0 を jsonとしてパース
        const json = VRMParser.parseJson(src, 12)
        console.log('json', json)

        // Chunks 1 は 各バイナリデータ 
    }

    private static toHexStr = (value: number) => {
        return '0x' + value.toString(16).toUpperCase()
    }

    /* Header 12-byte
    uint32 magic
    uint32 version
    uint32 length
    */
    private static parseHeader = (src: DataView) => {
        console.log('src', src)
        const magic = src.getUint32(0, VRMParser.LittleEndian)
        const version = src.getUint32(4, VRMParser.LittleEndian)
        const length = src.getUint32(8, VRMParser.LittleEndian)

        // magic を文字列に変換
        const magicToStr = VRMParser.toHexStr(magic)
        return {magic, version, length, magicToStr}
    }

    /* Chunks
    uint32 chunkLength
    uint32 chunkType
    ubyte[] chunkData
    */
    private static parseJson = (src: DataView, offset: number) => {
        console.log('parseJson', src)
        const chunkLength = src.getUint32(offset, VRMParser.LittleEndian)
        const chunkType = src.getUint32(offset + 4, VRMParser.LittleEndian)

        const chunkTypeToStr = VRMParser.toHexStr(chunkType)
        if (VRMParser.CHUNK_TYPE_JSON != chunkTypeToStr) {
            console.warn('not JSON.');
            return;
        }

        // JOSN データを取り出す
        const chunkData = new Uint8Array(src.buffer, offset + 8, chunkLength)
        // console.log('chunkData', chunkData)
        const decoder = new TextDecoder("utf8")
        const jsonText = decoder.decode(chunkData)
        const json = JSON.parse(jsonText)
        
        return json
    }
}

export default VRMParser;