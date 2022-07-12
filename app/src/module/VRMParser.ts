class VRMParser {

    // glTF2.0 glb フォーマット
    // https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification

    static LittleEndian = true
    static HEADER_MAGIC = 0x46546C67
    static CHUNK_TYPE_JSON = 0x4E4F534A
    static CHUNK_TYPE_BIN = 0x004E4942

    static CHUNK_HEADER_LENGTH = 12
    static CHUNK_LENGTH_SIZE = 4
    static CHUNK_TYPE_SIZE = 4

    static json?: any
    static images: any[] = []

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
        if (header.magic != VRMParser.HEADER_MAGIC) {
            // glb じゃなかった
            console.warn('file is not GLB file');
            return;
        }
        console.log('magic', VRMParser.toHexStr(header.magic))
        console.log('version', header.version)
        console.log('length', header.length)

        // Chunks 0 を jsonとしてパース
        const chunk0 = VRMParser.parseChunk0(src, VRMParser.CHUNK_HEADER_LENGTH)
        if (typeof chunk0 == 'undefined') {
            return
        }
        console.log('chunk0', chunk0)
        VRMParser.json = chunk0.json

        // Chunks 1 を 取得
        const chunk1Offset = VRMParser.CHUNK_HEADER_LENGTH 
            + VRMParser.CHUNK_LENGTH_SIZE 
            + VRMParser.CHUNK_TYPE_SIZE 
            + chunk0.chunkLength
        const chunk1 = VRMParser.parseChunk1(src, chunk1Offset)
        if (typeof chunk1?.chunkData == 'undefined') {
            return
        }
        console.log('chunk1', chunk1)

        // テスクチャを取り出す images, bufferViews
        VRMParser.images = VRMParser.loadImages(chunk1?.chunkData.buffer, VRMParser.json);
        console.log('images', VRMParser.images)
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
        return {magic, version, length}
    }

    // JSON 部分を取り出す
    /* Chunks
    uint32 chunkLength
    uint32 chunkType
    ubyte[] chunkData
    */
    private static parseChunk0 = (src: DataView, offset: number) => {
        console.log('parseChunk0', src, offset)
        const chunkLength = src.getUint32(offset, VRMParser.LittleEndian)
        const chunkType = src.getUint32(offset + 4, VRMParser.LittleEndian)
        if (VRMParser.CHUNK_TYPE_JSON != chunkType) {
            console.warn('not JSON.');
            return;
        }

        // JOSN データを取り出す
        const chunkData = new Uint8Array(src.buffer, offset + 8, chunkLength)
        const decoder = new TextDecoder("utf8")
        const jsonText = decoder.decode(chunkData)
        const json = JSON.parse(jsonText)
        
        return {chunkLength, json}
    }


    // バイナリ部分を取り出す
    /* Chunks
    uint32 chunkLength
    uint32 chunkType
    ubyte[] chunkData
    */    
    private static parseChunk1 = (src: DataView, offset: number) => {
        console.log('parseChunk1', src, offset)
        const chunkLength = src.getUint32(offset, VRMParser.LittleEndian)
        const chunkType = src.getUint32(offset + 4, VRMParser.LittleEndian)
        if (VRMParser.CHUNK_TYPE_BIN != chunkType) {
            console.warn('not BIN.');
            return;
        }
        const chunkData = new Uint8Array(src.buffer, offset + 8, chunkLength)
        return {chunkLength, chunkData}
    }

    // テスクチャを取り出す images, bufferViews
    private static loadImages = (chunk1: ArrayBuffer, json: any) => {
        console.log('loadImages', json.images)
        const images: any[] = []
        json.images.map((v: any) => {
            console.log('v', v)
            const bufferView = json.bufferViews[v.bufferView]
            console.log('v', {
                name: v.name,
                mimeType: v.mimeType,
                bufferView: bufferView
            })

            const buf = new Uint8Array(chunk1, bufferView.byteOffset, bufferView.byteLength);
            const img = URL.createObjectURL(new Blob([buf]))

            images.push({name: v.name, mimeType: v.mimeType, src: img})
        })

        return images
    }
}

export default VRMParser;