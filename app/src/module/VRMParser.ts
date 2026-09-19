/** VRMParser
 *  VRMの解析とテクスチャ置き換え等の機能をもつ
 * 
 *  Copyright (c) 2022 Nobuyuki Furukawa (tfuru)
 *  This software is released under the MIT License, see LICENSE.
 */
class VRMParser {
    /* * ファイルフォーマット ドキュメント
    * glTF2.0 glb フォーマット
    * https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification
    * 
    * VRM 0.0 フォーマット
    * https://github.com/vrm-c/vrm-specification/blob/master/specification/0.0/README.ja.md 
    */

    static IS_LITTLE_ENDIAN = true
    static HEADER_MAGIC = 0x46546C67
    static CHUNK_TYPE_JSON = 0x4E4F534A
    static CHUNK_TYPE_BIN = 0x004E4942

    static CHUNK_HEADER_SIZE = 12
    static CHUNK_LENGTH_SIZE = 4
    static CHUNK_TYPE_SIZE = 4

    static json?: any
    static images: any[] = []

    static filename?: string
    static header?: any
    static chunk0?: any
    static chunk1?: any

    static callback: (json: any, images: any[]) => void

    //VRM パース
    public static parse = (file: File, callback: (json: any, images: any[]) => void) => {
        console.log('parse', file)
        VRMParser.filename = file.name
        VRMParser.callback = callback;

        const reader = new FileReader()
        reader.onload = VRMParser.onLoadVRMFile
        reader.readAsArrayBuffer(file)
    }

    private static onLoadVRMFile = async (event: any) => {
        // console.log('onLoadVRMFile', event)
        // console.log('total', event.total)        
        const raw: ArrayBuffer = event.currentTarget.result
        // DataView バイナリデータ読み書きオブジェクト
        const src = new DataView(raw)
        // Header, Chunks を取り出す
        // Header 12-byte        
        VRMParser.header = VRMParser.parseHeader(src)
        // console.log('magic', header.magicToStr)
        if (VRMParser.header.magic != VRMParser.HEADER_MAGIC) {
            // glb じゃなかった
            console.warn('file is not GLB file');
            return;
        }
        console.log('magic', VRMParser.toHexStr(VRMParser.header.magic))
        console.log('version', VRMParser.header.version)
        console.log('length', VRMParser.header.length)

        // Chunks 0 を jsonとしてパース
        VRMParser.chunk0 = VRMParser.parseChunk0(src, VRMParser.CHUNK_HEADER_SIZE)
        if (typeof VRMParser.chunk0  == 'undefined') {
            return
        }
        console.log('chunk0', VRMParser.chunk0 )
        VRMParser.json = VRMParser.chunk0.json

        // Chunks 1 を 取得
        const chunk1Offset = VRMParser.CHUNK_HEADER_SIZE 
            + VRMParser.CHUNK_LENGTH_SIZE 
            + VRMParser.CHUNK_TYPE_SIZE 
            + VRMParser.chunk0.chunkLength
        VRMParser.chunk1 = VRMParser.parseChunk1(src, chunk1Offset)
        if (typeof VRMParser.chunk1?.chunkData == 'undefined') {
            return
        }
        console.log('chunk1', VRMParser.chunk1)

        // テクスチャを取り出す images, bufferViews
        VRMParser.loadImages(VRMParser.chunk1.chunkData, VRMParser.json)
            .then(images => {
                VRMParser.images = images
                console.log('images', VRMParser.images)

                // コールバックする
                VRMParser.callback(VRMParser.json, VRMParser.images)
            })
            .catch(e => {
                console.error('e', e)
            })
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
        const magic = src.getUint32(0, VRMParser.IS_LITTLE_ENDIAN)
        const version = src.getUint32(4, VRMParser.IS_LITTLE_ENDIAN)
        const length = src.getUint32(8, VRMParser.IS_LITTLE_ENDIAN)
        return {magic, version, length}
    }

    /* Chunks
    uint32 chunkLength
    uint32 chunkType
    ubyte[] chunkData
    */
    private static parseChunk = (type: number, src: DataView, offset: number) => {
        console.log('parseChunk', src, offset)
        const chunkLength = src.getUint32(offset, VRMParser.IS_LITTLE_ENDIAN)
        const chunkType = src.getUint32(offset + VRMParser.CHUNK_LENGTH_SIZE, VRMParser.IS_LITTLE_ENDIAN)
        if (type != chunkType) {
            console.warn('not JSON.');
            return;
        }

        // データを取り出す
        const chunkData = new Uint8Array(src.buffer,
            offset + VRMParser.CHUNK_LENGTH_SIZE + VRMParser.CHUNK_TYPE_SIZE,             
            chunkLength)

        return {chunkLength, chunkData}
    }

    // JSON 部分を取り出す
    private static parseChunk0 = (src: DataView, offset: number) => {
        console.log('parseChunk0', src, offset)
        const chunk = VRMParser.parseChunk(VRMParser.CHUNK_TYPE_JSON, src, offset)
        if (typeof chunk == 'undefined') {
            return
        }

        const chunkLength = chunk.chunkLength
        const chunkData = chunk.chunkData

        const decoder = new TextDecoder("utf8")
        const jsonText = decoder.decode(chunk.chunkData)
        const json = JSON.parse(jsonText)
        
        return {chunkLength, chunkData, json}
    }

    // バイナリ部分を取り出す  
    private static parseChunk1 = (src: DataView, offset: number) => {
        console.log('parseChunk1', src, offset)
        const chunk = VRMParser.parseChunk(VRMParser.CHUNK_TYPE_BIN, src, offset)
        if (typeof chunk == 'undefined') {
            return
        }
        const chunkLength = chunk.chunkLength
        const chunkData = chunk.chunkData

        return {chunkLength, chunkData}
    }

    // テクスチャを取り出す images, bufferViews
    private static loadImages = (chunkData: ArrayBuffer, json: any): Promise<any[]> => {
        // console.log('loadImages', json.images)
        // console.log('chunkData', chunkData)
        return new Promise((resolve, reject) => {
            const images: any[] = []
            if (json.images.length == 0) {
                resolve(images)
                return
            }
            json.images
                .forEach((v: any, imgIdx: number) => {                
                const bufferView = json.bufferViews[v.bufferView]
                // new Uint8Array はうまく動作しない
                // const buf = new Uint8Array(chunkData, bufferView.byteOffset, bufferView.byteLength)
                const buf = chunkData.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength)
                const blob = new Blob([buf], {type: v.mimeType})

                const img = URL.createObjectURL(blob)
                images.push({
                    imageIndex: imgIdx,
                    index: v.bufferView,
                    name: v.name,
                    mimeType: v.mimeType,
                    src: img,
                    size: blob.size
                })
            })
            resolve(images)
        })
    }

    // json(chunk0), chunk1 を再構築する
    public static chunkRebuilding = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            // json.buffers[0].byteLength も更新
            VRMParser.json.buffers[0].byteLength = VRMParser.chunk1.chunkLength

            // console.log('bufferViews', VRMParser.json.bufferViews)
            // chunk0 を更新
            VRMParser.chunk0.json = VRMParser.json
            const jsonText = JSON.stringify(VRMParser.json)
            const rawBytes = new TextEncoder().encode(jsonText)
            // glTF 2.0 規格: JSON チャンクは 4 バイト境界にスペース (0x20) でパディング
            const padding = (4 - (rawBytes.length % 4)) % 4
            let chunkData: Uint8Array = rawBytes
            if (padding > 0) {
                chunkData = new Uint8Array(rawBytes.length + padding)
                chunkData.set(rawBytes)
                for (let i = 0; i < padding; i++) {
                    chunkData[rawBytes.length + i] = 0x20
                }
            }
            VRMParser.chunk0.chunkData = chunkData
            VRMParser.chunk0.chunkLength = chunkData.length
            console.log('chunk0', VRMParser.chunk0)

            // headerの length も更新
            VRMParser.header.length = VRMParser.CHUNK_HEADER_SIZE 
                + VRMParser.CHUNK_LENGTH_SIZE 
                + VRMParser.CHUNK_TYPE_SIZE 
                + VRMParser.chunk0.chunkLength
                + VRMParser.CHUNK_LENGTH_SIZE 
                + VRMParser.CHUNK_TYPE_SIZE 
                + VRMParser.chunk1.chunkLength
            
            console.log('header', VRMParser.header)

            resolve()                     
        })
    }

    // テクスチャを置き換えて json(chunk0), chunk1 を再構築する
    public static replaceImage = (img: any, fileBuf: ArrayBuffer): Promise<void> => {
        console.log('replaceImage', img, fileBuf)
        
        return new Promise((resolve, reject) => {

            const chunkData = VRMParser.chunk1.chunkData
            const distChunkDataList: any[] = []
            let byteOffset = 0;
            VRMParser.json.bufferViews.forEach((bufferView: any, index: number) => {
                // console.log('bufferViews', bufferView)
                const buf = chunkData.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength)
                const blob = new Blob([buf])
                // console.log('blob', blob)
                distChunkDataList.push({
                    index: index,
                    byteOffset: byteOffset,
                    byteLength: blob.size,
                    blob: blob,
                    src: buf
                })
                byteOffset += blob.size
            })
            // console.log('images', VRMParser.json.images)
            // index が 一致する json.images を取り出す
            let image = VRMParser.json.images[img.index]
            if (typeof image == 'undefined') {
                // 名前が一致する json.images を取り出す
                image = VRMParser.json.images.filter((v: any) => (v.name == img.name))[0]
            }
            console.log('-- image', image)

            // console.log('image', image)
            const distChunkDataListIndex = image.bufferView

            // distChunkDataList distChunkDataListIndex の位置の blob を file 書き換える
            distChunkDataList[distChunkDataListIndex].byteLength = fileBuf.byteLength
            distChunkDataList[distChunkDataListIndex].blob = new Blob([fileBuf])
            distChunkDataList[distChunkDataListIndex].src = new Uint8Array(fileBuf)
            
            // distChunkDataList byteOffset を書き換える
            byteOffset = 0;
            distChunkDataList.forEach((v: any, i: number, src: any[]) => {
                src[i].byteOffset = byteOffset
                byteOffset += v.byteLength
            })
            console.log('distChunkDataList', distChunkDataList)

            // distChunkDataList を元に chunk1 を作成する
            // byteOffset は byteLength            
            VRMParser.chunk1.chunkData = new Uint8Array(byteOffset)
            distChunkDataList.forEach( (v: any) => {
                VRMParser.chunk1.chunkData.set(v.src, v.byteOffset)
            })
            VRMParser.chunk1.chunkLength = VRMParser.chunk1.chunkData.length
            console.log('chunk1', VRMParser.chunk1)

            // json.bufferViews 位置の byteOffset, byteLength 書き換え
            VRMParser.json.bufferViews.forEach((v: any, i: number, src: any[]) => { 
                const data = distChunkDataList[i]
                src[i].byteLength = data.byteLength
                src[i].byteOffset = data.byteOffset
            })

            // json(chunk0), chunk1 を再構築する
            return VRMParser.chunkRebuilding()
                .then(() => {
                    resolve()
                })
                .catch(e => {
                    console.error('error', e)
                })
        })
    }

    // 一人称視点の視点のオフセット位置を取得
    public static getFirstPersonBone = (): {firstPerson: any} => {
        const extVRM = VRMParser.getVRMExtensionJson()
        const version = VRMParser.getVRMVersion()
        if (version.version == 1) {
            // VRM 1.0
            return extVRM.lookAt
        } else {
            // VRM 0
            return extVRM.firstPerson
        }
    }

    // 一人称視点の視点のオフセット位置を設定
    public static setFirstPersonBoneOffset = (position: any): Promise<void> => {
        // VRM 0 firstPersonBoneOffset を更新する
        // VRM 1 lookAtOffset を更新する
        return new Promise((resolve, reject) => {
            const extVRM = VRMParser.getVRMExtensionJson()
            const version = VRMParser.getVRMVersion()
            if (version.version == 0) {
                extVRM.firstPerson.firstPersonBoneOffset = position.firstPersonBoneOffset
            } else {
                extVRM.lookAt.offsetFromHeadBone = position.offsetFromHeadBone
            }            
            return VRMParser.chunkRebuilding()
                .then(() => {
                    resolve()
                })
                .catch(e => {
                    console.error('error', e)
                })
        })
    }

    public static createVRMFile = (): Promise<File> => {
        /* Header 12-byte
        uint32 magic
        uint32 version
        uint32 length
        */
        /* chunk0 json
        uint32 chunkLength
        uint32 chunkType
        ubyte[] chunkData
        */
        /* chunk1 bin
        uint32 chunkLength
        uint32 chunkType
        ubyte[] chunkData
        */
        console.log('chunk0', VRMParser.chunk0) 
        console.log('chunk1', VRMParser.chunk1)

        return new Promise((resolve, reject) => {
            const data = new ArrayBuffer(
                VRMParser.CHUNK_HEADER_SIZE 
                + VRMParser.CHUNK_LENGTH_SIZE 
                + VRMParser.CHUNK_TYPE_SIZE 
                + VRMParser.chunk0.chunkLength
                + VRMParser.CHUNK_LENGTH_SIZE 
                + VRMParser.CHUNK_TYPE_SIZE 
                + VRMParser.chunk1.chunkLength )

            const uint8 = new Uint8Array(data)
            const view = new DataView(data);
            let offset = 0
            view.setUint32(0, VRMParser.header.magic, VRMParser.IS_LITTLE_ENDIAN)
            view.setUint32(4, VRMParser.header.version, VRMParser.IS_LITTLE_ENDIAN)
            view.setUint32(8, VRMParser.header.length, VRMParser.IS_LITTLE_ENDIAN)
            offset += VRMParser.CHUNK_HEADER_SIZE
            view.setUint32(offset, VRMParser.chunk0.chunkLength, VRMParser.IS_LITTLE_ENDIAN)
            offset += VRMParser.CHUNK_LENGTH_SIZE
            view.setUint32(offset, VRMParser.CHUNK_TYPE_JSON, VRMParser.IS_LITTLE_ENDIAN)
            offset += VRMParser.CHUNK_TYPE_SIZE
            uint8.set(VRMParser.chunk0.chunkData, offset)

            offset += VRMParser.chunk0.chunkLength
            view.setUint32(offset, VRMParser.chunk1.chunkLength, VRMParser.IS_LITTLE_ENDIAN)
            offset += VRMParser.CHUNK_LENGTH_SIZE
            view.setUint32(offset, VRMParser.CHUNK_TYPE_BIN, VRMParser.IS_LITTLE_ENDIAN)
            offset += VRMParser.CHUNK_TYPE_SIZE
            uint8.set(VRMParser.chunk1.chunkData, offset)

            resolve(new File([data], VRMParser.filename!))
        })
    }

    // ダウンロードしてみる
    private static downloadBlob(file: File) {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(file)
        link.download = file.name
        link.click()
    }
    
    // TODO 頭にアクセサリを追加してみる
    public static addHeadAccessory = (): Promise<void> => {
        console.log('addAccessory')
        return new Promise((resolve, reject) => {
            // json を 編集する
            // meshes に Accessory meshe 情報を追加
            // nodes に Accessory meshe を追加 
            // nodes -> Head の children に Accessory meshe の インデックス追加
            
            resolve()
        })      
    }

    // スプリングボーン グループ を取得する
    public static getSecondaryAnimationBoneGroups = (): {boneGroups: any} => {
        const extVRM = VRMParser.getVRMExtensionJson()
        console.log('extVRM', extVRM)
        console.log('secondaryAnimation', extVRM.secondaryAnimation)
        return extVRM.secondaryAnimation?.boneGroups
    }

    // スプリングボーンを更新
    public static setSecondaryAnimationBoneGroups = (boneGroups: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            const extVRM = VRMParser.getVRMExtensionJson()
            extVRM.secondaryAnimation.boneGroups = boneGroups

            return VRMParser.chunkRebuilding()
                .then(() => {
                    resolve()
                })
                .catch(e => {
                    console.error('error', e)
                })
        })
    }
    
    // スケールを設定する
    public static setScale = (scale: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            // VRMParser.json.nodes から name が Armature を探す
            VRMParser.json.nodes.forEach((node: any) => {
                const name = node.name.toLowerCase()
                if (name === 'amature') {
                    // name Armature に scale がない場合がある
                    if (!node.scale) {
                        node.scale = [1.0, 1.0, 1.0]
                    }
                    node.scale[0] = scale[0]
                    node.scale[1] = scale[1]
                    node.scale[2] = scale[2]
                }       
            })
            console.log('setScale scale', VRMParser.json.nodes[0].scale)

            return VRMParser.chunkRebuilding()
                .then(() => {
                    resolve()
                })
                .catch(e => {
                    console.error('error', e)
                })
        })
    }

    // モデル情報を更新する
    public static replaceMeta = (meta: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            // メタ情報を更新する
            let extVRM = VRMParser.json.extensions.VRM
            if (extVRM) {
                VRMParser.json.extensions.VRM.meta = meta;
            }
            else {
                // VRM 1.0 に対応
                extVRM = VRMParser.json.extensions.VRMC_vrm
                VRMParser.json.extensions.VRMC_vrm.meta = meta;
            }

            // json(chunk0), chunk1 を再構築する
            return VRMParser.chunkRebuilding()
                .then(() => {
                    resolve()
                })
                .catch(e => {
                    console.error('error', e)
                })
        });
    }

    public static getVRMExtensionJson() {
        let extVRM = null;
        if ('VRMC_vrm' in VRMParser.json.extensions) {
            // console.warn('NOT VRM 0.0, attempting to parse VRM 1.0')
            extVRM = VRMParser.json.extensions.VRMC_vrm
        } else if ('VRM' in VRMParser.json.extensions) {
            extVRM = VRMParser.json.extensions.VRM
        }
        return extVRM
    }

    // VRM バージョン情報を取得する
    public static getVRMVersion() {
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM == null) {
            return {version: 0, value: "", generator: ""}
        }
        if ('exporterVersion' in extVRM) {
            return {
                version: 0, 
                value: extVRM.exporterVersion.replace("Uni", ""),
                generator: extVRM.exporterVersion
            }
        }
        return {
            version: 1,
            value: `VRM-${extVRM.specVersion}`,
            generator: VRMParser.json.asset.generator
        }
    }
    
    // モーフターゲットを持つメッシュ一覧を取得する
    public static getMeshesWithMorphTargets = () => {
        if (!VRMParser.json || !VRMParser.json.meshes) return [];
        const result: any[] = [];
        VRMParser.json.meshes.forEach((mesh: any, meshIndex: number) => {
            const primitives = mesh.primitives || [];
            let targetCount = 0;
            for (const prim of primitives) {
                if (prim.targets && prim.targets.length > 0) {
                    targetCount = prim.targets.length;
                    break;
                }
            }
            if (targetCount > 0) {
                const nodeIndex = VRMParser.json.nodes?.findIndex((node: any) => node.mesh === meshIndex);
                const targetNames = mesh.extras?.targetNames || primitives[0]?.extras?.targetNames || [];
                result.push({
                    meshIndex,
                    nodeIndex: nodeIndex !== -1 && nodeIndex !== undefined ? nodeIndex : meshIndex,
                    name: mesh.name || `Mesh_${meshIndex}`,
                    targetCount,
                    targetNames
                });
            }
        });
        return result;
    }

    // ブレンドシェイプグループ を取得する
    public static getBlendShapeGroups = () => {
        const version = VRMParser.getVRMVersion()
        const extVRM = VRMParser.getVRMExtensionJson()
        if (!extVRM) return version.version == 0 ? [] : {}
        if (version.version == 0) {
            return extVRM.blendShapeMaster?.blendShapeGroups || []
        }
        else {
            const preset = extVRM.expressions?.preset || {}
            const custom = extVRM.expressions?.custom || {}
            return { ...preset, ...custom }
        }
    }

    // ブレンドシェイプを更新する
    public static updateBlendShapeGroup = (clipData: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            const version = VRMParser.getVRMVersion()
            const extVRM = VRMParser.getVRMExtensionJson()
            if (!extVRM) {
                resolve()
                return
            }

            if (version.version == 0) {
                const groups = extVRM.blendShapeMaster?.blendShapeGroups || []
                const target = groups.find((g: any) => g.name === clipData.name || g.presetName === clipData.presetName)
                if (target) {
                    if (clipData.name !== undefined) target.name = clipData.name
                    if (clipData.binds !== undefined) target.binds = clipData.binds
                    if (clipData.isBinary !== undefined) target.isBinary = clipData.isBinary
                }
            } else {
                if (!extVRM.expressions) extVRM.expressions = {}
                const name = clipData.name || clipData.presetName
                if (extVRM.expressions.preset && extVRM.expressions.preset[name]) {
                    const target = extVRM.expressions.preset[name]
                    if (clipData.morphTargetBinds !== undefined) target.morphTargetBinds = clipData.morphTargetBinds
                    if (clipData.isBinary !== undefined) target.isBinary = clipData.isBinary
                } else {
                    if (!extVRM.expressions.custom) extVRM.expressions.custom = {}
                    if (!extVRM.expressions.custom[name]) extVRM.expressions.custom[name] = {}
                    const target = extVRM.expressions.custom[name]
                    if (clipData.morphTargetBinds !== undefined) target.morphTargetBinds = clipData.morphTargetBinds
                    if (clipData.isBinary !== undefined) target.isBinary = clipData.isBinary
                }
            }

            return VRMParser.chunkRebuilding()
                .then(() => resolve())
                .catch(e => reject(e))
        })
    }

    // 新規ブレンドシェイプを追加する
    public static addBlendShapeGroup = (newClipData: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            const version = VRMParser.getVRMVersion()
            const extVRM = VRMParser.getVRMExtensionJson()
            if (!extVRM) {
                resolve()
                return
            }

            if (version.version == 0) {
                if (!extVRM.blendShapeMaster) extVRM.blendShapeMaster = { blendShapeGroups: [] }
                if (!extVRM.blendShapeMaster.blendShapeGroups) extVRM.blendShapeMaster.blendShapeGroups = []
                extVRM.blendShapeMaster.blendShapeGroups.push({
                    name: newClipData.name,
                    presetName: newClipData.presetName || 'unknown',
                    binds: newClipData.binds || [],
                    materialValues: [],
                    isBinary: !!newClipData.isBinary
                })
            } else {
                if (!extVRM.expressions) extVRM.expressions = {}
                if (newClipData.isPreset && newClipData.presetName) {
                    if (!extVRM.expressions.preset) extVRM.expressions.preset = {}
                    extVRM.expressions.preset[newClipData.presetName] = {
                        morphTargetBinds: newClipData.morphTargetBinds || [],
                        isBinary: !!newClipData.isBinary
                    }
                } else {
                    if (!extVRM.expressions.custom) extVRM.expressions.custom = {}
                    extVRM.expressions.custom[newClipData.name] = {
                        morphTargetBinds: newClipData.morphTargetBinds || [],
                        isBinary: !!newClipData.isBinary
                    }
                }
            }

            return VRMParser.chunkRebuilding()
                .then(() => resolve())
                .catch(e => reject(e))
        })
    }

    // ブレンドシェイプを削除する
    public static deleteBlendShapeGroup = (name: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const version = VRMParser.getVRMVersion()
            const extVRM = VRMParser.getVRMExtensionJson()
            if (!extVRM) {
                resolve()
                return
            }

            if (version.version == 0) {
                const groups = extVRM.blendShapeMaster?.blendShapeGroups
                if (groups) {
                    const idx = groups.findIndex((g: any) => g.name === name || g.presetName === name)
                    if (idx !== -1) {
                        groups.splice(idx, 1)
                    }
                }
            } else {
                if (extVRM.expressions?.custom && extVRM.expressions.custom[name]) {
                    delete extVRM.expressions.custom[name]
                } else if (extVRM.expressions?.preset && extVRM.expressions.preset[name]) {
                    delete extVRM.expressions.preset[name]
                }
            }

            return VRMParser.chunkRebuilding()
                .then(() => resolve())
                .catch(e => reject(e))
        })
    }

    // クォータニオン [x, y, z, w] をオイラー角（度数法）に変換
    public static quatToEulerDegrees = (q: [number, number, number, number]): [number, number, number] => {
        const [x, y, z, w] = q
        const sinr_cosp = 2 * (w * x + y * z)
        const cosr_cosp = 1 - 2 * (x * x + y * y)
        const roll = Math.atan2(sinr_cosp, cosr_cosp)

        const sinp = 2 * (w * y - z * x)
        let pitch = 0
        if (Math.abs(sinp) >= 1) {
            pitch = (Math.sign(sinp) * Math.PI) / 2
        } else {
            pitch = Math.asin(sinp)
        }

        const siny_cosp = 2 * (w * z + x * y)
        const cosy_cosp = 1 - 2 * (y * y + z * z)
        const yaw = Math.atan2(siny_cosp, cosy_cosp)

        const radToDeg = 180 / Math.PI
        return [
            parseFloat((roll * radToDeg).toFixed(2)),
            parseFloat((pitch * radToDeg).toFixed(2)),
            parseFloat((yaw * radToDeg).toFixed(2))
        ]
    }

    // VRM 標準ヒューマノイドボーン定義一覧
    public static readonly STANDARD_HUMANOID_BONES = [
        // 体幹 (Torso)
        { name: 'hips', category: 'torso', isRequired: true },
        { name: 'spine', category: 'torso', isRequired: true },
        { name: 'chest', category: 'torso', isRequired: false },
        { name: 'upperChest', category: 'torso', isRequired: false },
        { name: 'neck', category: 'torso', isRequired: false },
        // 頭部 (Head)
        { name: 'head', category: 'head', isRequired: true },
        { name: 'leftEye', category: 'head', isRequired: false },
        { name: 'rightEye', category: 'head', isRequired: false },
        { name: 'jaw', category: 'head', isRequired: false },
        // 左腕 (Left Arm)
        { name: 'leftShoulder', category: 'leftArm', isRequired: false },
        { name: 'leftUpperArm', category: 'leftArm', isRequired: true },
        { name: 'leftLowerArm', category: 'leftArm', isRequired: true },
        { name: 'leftHand', category: 'leftArm', isRequired: true },
        // 右腕 (Right Arm)
        { name: 'rightShoulder', category: 'rightArm', isRequired: false },
        { name: 'rightUpperArm', category: 'rightArm', isRequired: true },
        { name: 'rightLowerArm', category: 'rightArm', isRequired: true },
        { name: 'rightHand', category: 'rightArm', isRequired: true },
        // 左手 指 (Left Fingers)
        { name: 'leftThumbMetacarpal', category: 'leftFingers', isRequired: false },
        { name: 'leftThumbProximal', category: 'leftFingers', isRequired: false },
        { name: 'leftThumbDistal', category: 'leftFingers', isRequired: false },
        { name: 'leftIndexProximal', category: 'leftFingers', isRequired: false },
        { name: 'leftIndexIntermediate', category: 'leftFingers', isRequired: false },
        { name: 'leftIndexDistal', category: 'leftFingers', isRequired: false },
        { name: 'leftMiddleProximal', category: 'leftFingers', isRequired: false },
        { name: 'leftMiddleIntermediate', category: 'leftFingers', isRequired: false },
        { name: 'leftMiddleDistal', category: 'leftFingers', isRequired: false },
        { name: 'leftRingProximal', category: 'leftFingers', isRequired: false },
        { name: 'leftRingIntermediate', category: 'leftFingers', isRequired: false },
        { name: 'leftRingDistal', category: 'leftFingers', isRequired: false },
        { name: 'leftLittleProximal', category: 'leftFingers', isRequired: false },
        { name: 'leftLittleIntermediate', category: 'leftFingers', isRequired: false },
        { name: 'leftLittleDistal', category: 'leftFingers', isRequired: false },
        // 右手 指 (Right Fingers)
        { name: 'rightThumbMetacarpal', category: 'rightFingers', isRequired: false },
        { name: 'rightThumbProximal', category: 'rightFingers', isRequired: false },
        { name: 'rightThumbDistal', category: 'rightFingers', isRequired: false },
        { name: 'rightIndexProximal', category: 'rightFingers', isRequired: false },
        { name: 'rightIndexIntermediate', category: 'rightFingers', isRequired: false },
        { name: 'rightIndexDistal', category: 'rightFingers', isRequired: false },
        { name: 'rightMiddleProximal', category: 'rightFingers', isRequired: false },
        { name: 'rightMiddleIntermediate', category: 'rightFingers', isRequired: false },
        { name: 'rightMiddleDistal', category: 'rightFingers', isRequired: false },
        { name: 'rightRingProximal', category: 'rightFingers', isRequired: false },
        { name: 'rightRingIntermediate', category: 'rightFingers', isRequired: false },
        { name: 'rightRingDistal', category: 'rightFingers', isRequired: false },
        { name: 'rightLittleProximal', category: 'rightFingers', isRequired: false },
        { name: 'rightLittleIntermediate', category: 'rightFingers', isRequired: false },
        { name: 'rightLittleDistal', category: 'rightFingers', isRequired: false },
        // 左脚 (Left Leg)
        { name: 'leftUpperLeg', category: 'leftLeg', isRequired: true },
        { name: 'leftLowerLeg', category: 'leftLeg', isRequired: true },
        { name: 'leftFoot', category: 'leftLeg', isRequired: true },
        { name: 'leftToes', category: 'leftLeg', isRequired: false },
        // 右脚 (Right Leg)
        { name: 'rightUpperLeg', category: 'rightLeg', isRequired: true },
        { name: 'rightLowerLeg', category: 'rightLeg', isRequired: true },
        { name: 'rightFoot', category: 'rightLeg', isRequired: true },
        { name: 'rightToes', category: 'rightLeg', isRequired: false }
    ]

    // ヒューマノイドボーン対応マップ（VRM 0.x / 1.0 統一）を取得
    public static getHumanoidBonesData = () => {
        if (!VRMParser.json) {
            return {
                humanoidBones: [],
                nodeToHumanoid: {},
                mappedCount: 0,
                requiredTotalCount: 15,
                requiredMappedCount: 0
            }
        }

        const extVRM = VRMParser.getVRMExtensionJson()
        const version = VRMParser.getVRMVersion()
        const nodeToHumanoid: { [key: number]: string } = {}
        const rawBoneMap: { [boneName: string]: number } = {}

        if (extVRM && extVRM.humanoid) {
            if (version.version === 0) {
                // VRM 0.x: humanBones: [ { bone: "hips", node: 1 } ]
                const humanBones = extVRM.humanoid.humanBones || []
                humanBones.forEach((b: any) => {
                    if (b && typeof b.node === 'number') {
                        nodeToHumanoid[b.node] = b.bone
                        rawBoneMap[b.bone.toLowerCase()] = b.node
                    }
                })
            } else {
                // VRM 1.0: humanBones: { hips: { node: 1 } }
                const humanBones = extVRM.humanoid.humanBones || {}
                Object.keys(humanBones).forEach((boneName: string) => {
                    const item = humanBones[boneName]
                    if (item && typeof item.node === 'number') {
                        nodeToHumanoid[item.node] = boneName
                        rawBoneMap[boneName.toLowerCase()] = item.node
                    }
                })
            }
        }

        let mappedCount = 0
        let requiredMappedCount = 0
        const requiredTotalCount = VRMParser.STANDARD_HUMANOID_BONES.filter(b => b.isRequired).length

        const humanoidBones = VRMParser.STANDARD_HUMANOID_BONES.map(def => {
            const lowerName = def.name.toLowerCase()
            let nodeIndex: number | null = rawBoneMap[lowerName] ?? null

            // VRM 0.x の指名揺れ（thumbProximal / thumbIntermediate）対応
            if (nodeIndex === null && lowerName.includes('thumbmetacarpal')) {
                const alt = lowerName.replace('thumbmetacarpal', 'thumbproximal')
                nodeIndex = rawBoneMap[alt] ?? null
            } else if (nodeIndex === null && lowerName.includes('thumbproximal')) {
                const alt = lowerName.replace('thumbproximal', 'thumbintermediate')
                nodeIndex = rawBoneMap[alt] ?? null
            }

            const isMapped = nodeIndex !== null && typeof nodeIndex === 'number'
            if (isMapped) {
                mappedCount++
                if (def.isRequired) requiredMappedCount++
            }

            const node = (isMapped && VRMParser.json.nodes) ? VRMParser.json.nodes[nodeIndex!] : null

            return {
                name: def.name,
                category: def.category,
                isRequired: def.isRequired,
                isMapped: isMapped,
                nodeIndex: nodeIndex,
                nodeName: node ? (node.name || `Node_${nodeIndex}`) : null
            }
        })

        return {
            humanoidBones,
            nodeToHumanoid,
            mappedCount,
            requiredTotalCount,
            requiredMappedCount
        }
    }

    // アーマチュアおよびボーン階層ツリーを取得
    public static getBoneHierarchy = () => {
        if (!VRMParser.json || !VRMParser.json.nodes) {
            return {
                roots: [],
                allNodes: [],
                skinJoints: new Set<number>(),
                parentMap: {},
                childrenMap: {}
            }
        }

        const nodes = VRMParser.json.nodes
        const { nodeToHumanoid } = VRMParser.getHumanoidBonesData()

        // スキンに登録されているジョイントインデックスを収集
        const skinJoints = new Set<number>()
        if (VRMParser.json.skins) {
            VRMParser.json.skins.forEach((skin: any) => {
                if (skin.joints && Array.isArray(skin.joints)) {
                    skin.joints.forEach((j: number) => skinJoints.add(j))
                }
            })
        }

        const parentMap: { [nodeIndex: number]: number } = {}
        const childrenMap: { [nodeIndex: number]: number[] } = {}

        // 親子関係マップ構築
        nodes.forEach((node: any, idx: number) => {
            childrenMap[idx] = node.children ? [...node.children] : []
            if (node.children && Array.isArray(node.children)) {
                node.children.forEach((childIdx: number) => {
                    parentMap[childIdx] = idx
                })
            }
        })

        // 各ノード情報の構築関数
        const buildTreeNode = (nodeIndex: number): any => {
            const node = nodes[nodeIndex] || {}
            const rotation: [number, number, number, number] = node.rotation
                ? [node.rotation[0] ?? 0, node.rotation[1] ?? 0, node.rotation[2] ?? 0, node.rotation[3] ?? 1]
                : [0, 0, 0, 1]
            const euler = VRMParser.quatToEulerDegrees(rotation)
            const translation: [number, number, number] = node.translation
                ? [node.translation[0] ?? 0, node.translation[1] ?? 0, node.translation[2] ?? 0]
                : [0, 0, 0]
            const scale: [number, number, number] = node.scale
                ? [node.scale[0] ?? 1, node.scale[1] ?? 1, node.scale[2] ?? 1]
                : [1, 1, 1]

            const isHumanoid = nodeToHumanoid[nodeIndex] !== undefined
            const isJoint = skinJoints.has(nodeIndex)
            const isMesh = typeof node.mesh === 'number'

            const childIndices = childrenMap[nodeIndex] || []
            const children = childIndices.map((cIdx: number) => buildTreeNode(cIdx))

            return {
                index: nodeIndex,
                name: node.name || `Node_${nodeIndex}`,
                humanoidBone: nodeToHumanoid[nodeIndex] || null,
                translation,
                rotation,
                euler,
                scale,
                isHumanoid,
                isJoint,
                isMesh,
                children
            }
        }

        // ルートノードの決定
        // scene[0].nodes から探索（なければ親のいないノード）
        let rootIndices: number[] = []
        if (VRMParser.json.scenes && VRMParser.json.scenes[0] && Array.isArray(VRMParser.json.scenes[0].nodes)) {
            rootIndices = VRMParser.json.scenes[0].nodes
        } else {
            rootIndices = nodes
                .map((_: any, idx: number) => idx)
                .filter((idx: number) => parentMap[idx] === undefined)
        }

        const roots = rootIndices.map(rIdx => buildTreeNode(rIdx))

        // 全ノードのフラット一覧（検索・直接参照用）
        const allNodes = nodes.map((node: any, idx: number) => {
            const rotation: [number, number, number, number] = node.rotation
                ? [node.rotation[0] ?? 0, node.rotation[1] ?? 0, node.rotation[2] ?? 0, node.rotation[3] ?? 1]
                : [0, 0, 0, 1]
            const euler = VRMParser.quatToEulerDegrees(rotation)
            const translation: [number, number, number] = node.translation
                ? [node.translation[0] ?? 0, node.translation[1] ?? 0, node.translation[2] ?? 0]
                : [0, 0, 0]
            const scale: [number, number, number] = node.scale
                ? [node.scale[0] ?? 1, node.scale[1] ?? 1, node.scale[2] ?? 1]
                : [1, 1, 1]

            return {
                index: idx,
                name: node.name || `Node_${idx}`,
                humanoidBone: nodeToHumanoid[idx] || null,
                translation,
                rotation,
                euler,
                scale,
                parentIndex: parentMap[idx] !== undefined ? parentMap[idx] : null,
                parentName: parentMap[idx] !== undefined ? (nodes[parentMap[idx]]?.name || `Node_${parentMap[idx]}`) : null,
                childIndices: childrenMap[idx] || [],
                isHumanoid: nodeToHumanoid[idx] !== undefined,
                isJoint: skinJoints.has(idx),
                isMesh: typeof node.mesh === 'number'
            }
        })

        return {
            roots,
            allNodes,
            skinJoints,
            parentMap,
            childrenMap
        }
    }

    // 最小1x1 PNG画像バイナリ（67バイト）
    private static PLACEHOLDER_1X1_PNG = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0xF8, 0xCF, 0x50, 0x0F,
        0x00, 0x03, 0x86, 0x01, 0x82, 0x5A, 0x3D, 0x6B,
        0x6B, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    // 指定画像を参照しているマテリアル一覧インデックスを取得
    public static getMaterialsUsingImage = (img: any): number[] => {
        if (!VRMParser.json || !VRMParser.json.materials) return []
        const json = VRMParser.json

        // 画像のインデックスを特定
        let targetImgIdx = -1
        if (typeof img.imageIndex === 'number' && json.images[img.imageIndex]) {
            targetImgIdx = img.imageIndex
        } else {
            targetImgIdx = json.images.findIndex((v: any) => v.name === img.name || v.bufferView === img.index)
        }
        if (targetImgIdx === -1) return []

        // targetImgIdx を参照している textures のインデックス一覧
        const textureIndices = new Set<number>()
        if (json.textures) {
            json.textures.forEach((tex: any, tIdx: number) => {
                if (tex.source === targetImgIdx) {
                    textureIndices.add(tIdx)
                }
            })
        }

        // textureIndices を参照している materials のインデックス一覧
        const materialIndices: number[] = []
        json.materials.forEach((mat: any, mIdx: number) => {
            const baseTex = mat.pbrMetallicRoughness?.baseColorTexture?.index
            if (typeof baseTex === 'number' && textureIndices.has(baseTex)) {
                materialIndices.push(mIdx)
                return
            }

            // VRM 0.x materialProperties チェック (主テクスチャ _MainTex のみを優先判定)
            const extVRM = VRMParser.getVRMExtensionJson()
            if (extVRM?.materialProperties && extVRM.materialProperties[mIdx]) {
                const texProps = extVRM.materialProperties[mIdx].textureProperties || {}
                if (texProps._MainTex !== undefined && textureIndices.has(texProps._MainTex)) {
                    materialIndices.push(mIdx)
                    return
                }
            }
        })

        return materialIndices
    }

    // 指定画像が使用されているメッシュのUV座標範囲（min/max）および[0,1]はみ出しをチェック
    public static checkUVBoundsForImage = (img: any): { minU: number; maxU: number; minV: number; maxV: number; hasOverflow: boolean } => {
        const defaultResult = { minU: 0, maxU: 1, minV: 0, maxV: 1, hasOverflow: false }
        if (!VRMParser.json || !VRMParser.chunk1) return defaultResult

        const materialIndices = new Set(VRMParser.getMaterialsUsingImage(img))
        if (materialIndices.size === 0) return defaultResult

        let minU = Infinity, maxU = -Infinity
        let minV = Infinity, maxV = -Infinity
        let foundUV = false

        if (VRMParser.json.meshes) {
            VRMParser.json.meshes.forEach((mesh: any) => {
                if (mesh.primitives) {
                    mesh.primitives.forEach((prim: any) => {
                        if (materialIndices.has(prim.material) && typeof prim.attributes?.TEXCOORD_0 === 'number') {
                            const acc = VRMParser.json.accessors[prim.attributes.TEXCOORD_0]
                            if (acc && acc.min && acc.max) {
                                foundUV = true
                                minU = Math.min(minU, acc.min[0])
                                maxU = Math.max(maxU, acc.max[0])
                                minV = Math.min(minV, acc.min[1])
                                maxV = Math.max(maxV, acc.max[1])
                            }
                        }
                    })
                }
            })
        }

        if (!foundUV) return defaultResult

        const hasOverflow = minU < -0.01 || maxU > 1.01 || minV < -0.01 || maxV > 1.01
        return { minU, maxU, minV, maxV, hasOverflow }
    }

    // テクスチャアトラスを適用してVRMを再構築
    public static applyTextureAtlas = async (
        atlasBlob: Blob,
        atlasItems: Array<{
            imageIndex?: number
            index?: number
            name: string
            x: number
            y: number
            width: number
            height: number
            atlasWidth: number
            atlasHeight: number
        }>
    ): Promise<void> => {
        if (!VRMParser.json || !VRMParser.chunk1 || atlasItems.length === 0) {
            throw new Error('VRM or Atlas items not found')
        }

        const json = VRMParser.json
        const chunkData = VRMParser.chunk1.chunkData
        const atlasBuf = await atlasBlob.arrayBuffer()
        const placeholderBuf = VRMParser.PLACEHOLDER_1X1_PNG.buffer

        // 画像検索ヘルパー (imageIndexの整合性を検証し、フォールバック検索もサポート)
        const findImageInfo = (item: any): { image: any; imageIndex: number } | null => {
            if (typeof item.imageIndex === 'number' && json.images[item.imageIndex]) {
                const candidate = json.images[item.imageIndex]
                if (!item.name || candidate.name === item.name || candidate.bufferView === item.id) {
                    return { image: candidate, imageIndex: item.imageIndex }
                }
            }
            const idx = json.images.findIndex((img: any) => 
                (item.name && img.name === item.name) || 
                (typeof item.id === 'number' && img.bufferView === item.id) ||
                (typeof item.index === 'number' && img.bufferView === item.index)
            )
            if (idx !== -1) {
                return { image: json.images[idx], imageIndex: idx }
            }
            return null
        }

        // 1. 各アトラスアイテムの画像特定 & プライマリ画像スロット決定
        const primaryInfo = findImageInfo(atlasItems[0])
        if (!primaryInfo) {
            throw new Error('Primary image for atlas not found: ' + atlasItems[0].name)
        }
        const primaryImage = primaryInfo.image
        const primaryImageIndex = primaryInfo.imageIndex

        // プライマリ画像を参照する texture インデックスを特定（なければ作成）
        let primaryTextureIndex = -1
        if (json.textures) {
            primaryTextureIndex = json.textures.findIndex((t: any) => t.source === primaryImageIndex)
        }
        if (primaryTextureIndex === -1) {
            if (!json.textures) json.textures = []
            primaryTextureIndex = json.textures.length
            json.textures.push({ source: primaryImageIndex })
        }

        // 2. 各アイテムのUV変換係数を計算し、対象プリミティブのUV座標を chunkData 内で書き換え
        const view = new DataView(chunkData.buffer, chunkData.byteOffset, chunkData.byteLength)
        const processedAccessors = new Set<number>()
        const allAffectedMaterialIndices = new Set<number>()

        for (const item of atlasItems) {
            const imgInfo = findImageInfo(item)
            if (!imgInfo) continue

            const scaleU = item.width / item.atlasWidth
            const scaleV = item.height / item.atlasHeight
            const offsetU = item.x / item.atlasWidth
            const offsetV = item.y / item.atlasHeight

            // 対象マテリアル一覧
            const matIndices = VRMParser.getMaterialsUsingImage(imgInfo.image)
            matIndices.forEach(m => allAffectedMaterialIndices.add(m))

            // 対象メッシュプリミティブのUVを書き換え
            if (json.meshes) {
                json.meshes.forEach((mesh: any) => {
                    if (!mesh.primitives) return
                    mesh.primitives.forEach((prim: any) => {
                        if (!matIndices.includes(prim.material)) return
                        const texAccIdx = prim.attributes?.TEXCOORD_0
                        if (typeof texAccIdx !== 'number') return

                        if (!processedAccessors.has(texAccIdx)) {
                            processedAccessors.add(texAccIdx)
                            const acc = json.accessors[texAccIdx]
                            if (acc && acc.componentType === 5126) { // 5126 = FLOAT
                                const bv = json.bufferViews[acc.bufferView]
                                const baseOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0)
                                const stride = bv.byteStride || 8 // VEC2 (2 floats = 8 bytes)
                                const count = acc.count

                                let minU = Infinity, maxU = -Infinity
                                let minV = Infinity, maxV = -Infinity

                                for (let k = 0; k < count; k++) {
                                    const offset = baseOffset + k * stride
                                    const u = view.getFloat32(offset, true)
                                    const v = view.getFloat32(offset + 4, true)

                                    const newU = offsetU + u * scaleU
                                    const newV = offsetV + v * scaleV

                                    view.setFloat32(offset, newU, true)
                                    view.setFloat32(offset + 4, newV, true)

                                    if (newU < minU) minU = newU
                                    if (newU > maxU) maxU = newU
                                    if (newV < minV) minV = newV
                                    if (newV > maxV) maxV = newV
                                }

                                acc.min = [minU, minV]
                                acc.max = [maxU, maxV]
                            }
                        }

                        // モーフターゲット（デルタUV）が存在する場合はスケール変換
                        if (prim.targets && Array.isArray(prim.targets)) {
                            prim.targets.forEach((target: any) => {
                                const morphAccIdx = target.TEXCOORD_0
                                if (typeof morphAccIdx === 'number' && !processedAccessors.has(morphAccIdx)) {
                                    processedAccessors.add(morphAccIdx)
                                    const mAcc = json.accessors[morphAccIdx]
                                    if (mAcc && mAcc.componentType === 5126) {
                                        const mBv = json.bufferViews[mAcc.bufferView]
                                        const mBaseOffset = (mBv.byteOffset || 0) + (mAcc.byteOffset || 0)
                                        const mStride = mBv.byteStride || 8
                                        let mMinU = Infinity, mMaxU = -Infinity
                                        let mMinV = Infinity, mMaxV = -Infinity

                                        for (let k = 0; k < mAcc.count; k++) {
                                            const offset = mBaseOffset + k * mStride
                                            const du = view.getFloat32(offset, true)
                                            const dv = view.getFloat32(offset + 4, true)

                                            const newDu = du * scaleU
                                            const newDv = dv * scaleV

                                            view.setFloat32(offset, newDu, true)
                                            view.setFloat32(offset + 4, newDv, true)

                                            if (newDu < mMinU) mMinU = newDu
                                            if (newDu > mMaxU) mMaxU = newDu
                                            if (newDv < mMinV) mMinV = newDv
                                            if (newDv > mMaxV) mMaxV = newDv
                                        }

                                        mAcc.min = [mMinU, mMinV]
                                        mAcc.max = [mMaxU, mMaxV]
                                    }
                                }
                            })
                        }
                    })
                })
            }
        }

        // 3. マテリアルのテクスチャ参照をプライマリテクスチャへ切り替え
        allAffectedMaterialIndices.forEach(mIdx => {
            const mat = json.materials[mIdx]
            if (mat?.pbrMetallicRoughness?.baseColorTexture) {
                mat.pbrMetallicRoughness.baseColorTexture.index = primaryTextureIndex
            }

            // VRM 0.x materialProperties
            const extVRM = VRMParser.getVRMExtensionJson()
            if (extVRM?.materialProperties && extVRM.materialProperties[mIdx]?.textureProperties) {
                const texProps = extVRM.materialProperties[mIdx].textureProperties
                const oldMainTex = texProps._MainTex
                if (texProps._MainTex !== undefined) {
                    texProps._MainTex = primaryTextureIndex
                }
                // _ShadeTexture が _MainTex と同じテクスチャを参照していた場合はアトラスに同期
                if (texProps._ShadeTexture !== undefined && (texProps._ShadeTexture === oldMainTex || texProps._ShadeTexture === primaryTextureIndex)) {
                    texProps._ShadeTexture = primaryTextureIndex
                }
            }

            // VRM 1.0 MToon
            if (mat?.extensions?.VRMC_materials_mtoon) {
                const mtoon = mat.extensions.VRMC_materials_mtoon
                if (mtoon.shadeMultiplyTexture) {
                    mtoon.shadeMultiplyTexture.index = primaryTextureIndex
                }
            }
        })

        // 4. bufferViews の再構築
        // プライマリスロットにアトラス画像を格納、その他の選択画像スロットを1x1プレースホルダーに置換
        const distChunkDataList: any[] = []
        let byteOffset = 0

        json.bufferViews.forEach((bufferView: any, index: number) => {
            const buf = chunkData.slice(bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength)
            distChunkDataList.push({
                index: index,
                byteOffset: byteOffset,
                byteLength: buf.byteLength,
                src: buf
            })
            byteOffset += buf.byteLength
        })

        // プライマリバッファビューをアトラス画像に更新
        const primaryBvIdx = primaryImage.bufferView
        distChunkDataList[primaryBvIdx].byteLength = atlasBuf.byteLength
        distChunkDataList[primaryBvIdx].src = new Uint8Array(atlasBuf)
        primaryImage.name = 'Atlas_' + primaryImage.name
        primaryImage.mimeType = 'image/png'

        // 2枚目以降の選択画像を 1x1 プレースホルダーに置換（ファイルサイズ大幅削減）
        for (let i = 1; i < atlasItems.length; i++) {
            const secInfo = findImageInfo(atlasItems[i])
            if (secInfo && secInfo.image.bufferView !== primaryBvIdx) {
                const secBvIdx = secInfo.image.bufferView
                distChunkDataList[secBvIdx].byteLength = placeholderBuf.byteLength
                distChunkDataList[secBvIdx].src = new Uint8Array(placeholderBuf)
                secInfo.image.mimeType = 'image/png'
            }
        }

        // byteOffset の再計算と 4 バイト境界アライメント（glTF 2.0 規格準拠）
        byteOffset = 0
        distChunkDataList.forEach((v: any, i: number) => {
            const padding = (4 - (v.src.byteLength % 4)) % 4
            let alignedSrc = v.src
            if (padding > 0) {
                alignedSrc = new Uint8Array(v.src.byteLength + padding)
                alignedSrc.set(v.src)
            }
            distChunkDataList[i].byteOffset = byteOffset
            distChunkDataList[i].byteLength = alignedSrc.byteLength
            distChunkDataList[i].src = alignedSrc
            byteOffset += alignedSrc.byteLength
        })

        // chunk1 の再生成
        VRMParser.chunk1.chunkData = new Uint8Array(byteOffset)
        distChunkDataList.forEach((v: any) => {
            VRMParser.chunk1.chunkData.set(v.src, v.byteOffset)
        })
        VRMParser.chunk1.chunkLength = VRMParser.chunk1.chunkData.length

        // json.bufferViews の更新
        json.bufferViews.forEach((v: any, i: number) => {
            v.byteLength = distChunkDataList[i].byteLength
            v.byteOffset = distChunkDataList[i].byteOffset
        })

        // チャンクとヘッダーを再構築
        await VRMParser.chunkRebuilding()
    }

    // マテリアルのアウトラインテクスチャ情報を取得
    public static getMaterialOutlineTexture = (materialIndex: number): { img: any; textureIndex: number } | null => {
        if (!VRMParser.json || !VRMParser.json.materials || !VRMParser.json.materials[materialIndex]) {
            return null
        }
        const json = VRMParser.json
        const mat = json.materials[materialIndex]
        let textureIndex = -1

        // VRM 0.x MToon チェック
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM?.materialProperties && extVRM.materialProperties[materialIndex]) {
            const texProps = extVRM.materialProperties[materialIndex].textureProperties || {}
            if (typeof texProps._OutlineWidthTexture === 'number' && texProps._OutlineWidthTexture >= 0) {
                textureIndex = texProps._OutlineWidthTexture
            }
        }

        // VRM 1.0 MToon チェック
        if (textureIndex === -1 && mat?.extensions?.VRMC_materials_mtoon) {
            const mtoon = mat.extensions.VRMC_materials_mtoon
            if (typeof mtoon.outlineWidthMultiplyTexture?.index === 'number' && mtoon.outlineWidthMultiplyTexture.index >= 0) {
                textureIndex = mtoon.outlineWidthMultiplyTexture.index
            }
        }

        if (textureIndex === -1 || !json.textures || !json.textures[textureIndex]) {
            return null
        }

        const sourceImageIdx = json.textures[textureIndex].source
        if (typeof sourceImageIdx !== 'number' || !VRMParser.images || !VRMParser.images[sourceImageIdx]) {
            return null
        }

        return {
            img: VRMParser.images[sourceImageIdx],
            textureIndex: textureIndex
        }
    }

    // マテリアルのアウトラインテクスチャスロットに textureIndex を設定し輪郭線を有効化
    private static assignOutlineTextureIndex = (materialIndex: number, textureIndex: number): void => {
        const json = VRMParser.json
        const mat = json.materials[materialIndex]

        // VRM 0.x MToon
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM?.materialProperties && extVRM.materialProperties[materialIndex]) {
            const mp = extVRM.materialProperties[materialIndex]
            if (!mp.textureProperties) mp.textureProperties = {}
            mp.textureProperties._OutlineWidthTexture = textureIndex

            if (!mp.floatProperties) mp.floatProperties = {}
            // 輪郭線モードが 0 (None) の場合は 1 (WorldCoordinates) に有効化
            if (!mp.floatProperties._OutlineWidthMode || mp.floatProperties._OutlineWidthMode === 0) {
                mp.floatProperties._OutlineWidthMode = 1
            }
            // 輪郭線幅が 0 の場合は初期値 0.1 を設定
            if (!mp.floatProperties._OutlineWidth || mp.floatProperties._OutlineWidth <= 0) {
                mp.floatProperties._OutlineWidth = 0.1
            }

            if (!mp.vectorProperties) mp.vectorProperties = {}
            if (!mp.vectorProperties._OutlineWidthTexture) {
                mp.vectorProperties._OutlineWidthTexture = [0, 0, 1, 1]
            }
            if (!mp.vectorProperties._OutlineColor) {
                mp.vectorProperties._OutlineColor = [0, 0, 0, 1]
            }
        }

        // VRM 1.0 MToon
        if (mat?.extensions?.VRMC_materials_mtoon) {
            const mtoon = mat.extensions.VRMC_materials_mtoon
            mtoon.outlineWidthMultiplyTexture = { index: textureIndex }
            if (!mtoon.outlineWidthMode || mtoon.outlineWidthMode === 'none') {
                mtoon.outlineWidthMode = 'worldCoordinates'
            }
            if (!mtoon.outlineWidthFactor || mtoon.outlineWidthFactor <= 0) {
                mtoon.outlineWidthFactor = 0.05
            }
        }
    }

    // ファイルから新規画像を登録してマテリアルのアウトラインテクスチャに設定
    public static setMaterialOutlineTextureFromFile = async (
        materialIndex: number,
        fileBuf: ArrayBuffer,
        mimeType: string,
        fileName = 'outline_texture'
    ): Promise<void> => {
        if (!VRMParser.json || !VRMParser.chunk1) {
            throw new Error('VRM data not found')
        }
        const json = VRMParser.json
        const chunkData = VRMParser.chunk1.chunkData

        // 1. 新規バッファビューの作成（4バイト境界パディング）
        const padding = (4 - (fileBuf.byteLength % 4)) % 4
        let alignedBuf = new Uint8Array(fileBuf)
        if (padding > 0) {
            const padded = new Uint8Array(fileBuf.byteLength + padding)
            padded.set(new Uint8Array(fileBuf))
            alignedBuf = padded
        }

        // 現在の chunkData の末尾に追記
        const newByteOffset = chunkData.byteLength
        const newChunk1Data = new Uint8Array(newByteOffset + alignedBuf.byteLength)
        newChunk1Data.set(chunkData, 0)
        newChunk1Data.set(alignedBuf, newByteOffset)

        VRMParser.chunk1.chunkData = newChunk1Data
        VRMParser.chunk1.chunkLength = newChunk1Data.byteLength

        // 2. bufferViews に追加
        if (!json.bufferViews) json.bufferViews = []
        const newBvIdx = json.bufferViews.length
        json.bufferViews.push({
            buffer: 0,
            byteOffset: newByteOffset,
            byteLength: fileBuf.byteLength
        })

        // 3. images に追加
        if (!json.images) json.images = []
        const newImgIdx = json.images.length
        json.images.push({
            name: fileName,
            bufferView: newBvIdx,
            mimeType: mimeType || 'image/png'
        })

        // 4. textures に追加
        if (!json.textures) json.textures = []
        const newTexIdx = json.textures.length
        json.textures.push({
            source: newImgIdx
        })

        // 5. マテリアルに割り当て
        VRMParser.assignOutlineTextureIndex(materialIndex, newTexIdx)

        // 6. チャンク再構築
        await VRMParser.chunkRebuilding()
    }

    // 既存の画像インデックスをマテリアルのアウトラインテクスチャに設定
    public static setMaterialOutlineTextureFromExisting = async (
        materialIndex: number,
        imageIndex: number
    ): Promise<void> => {
        if (!VRMParser.json || !VRMParser.json.images || !VRMParser.json.images[imageIndex]) {
            throw new Error('Image not found: ' + imageIndex)
        }
        const json = VRMParser.json

        // imageIndex を参照する texture を検索または作成
        if (!json.textures) json.textures = []
        let textureIndex = json.textures.findIndex((t: any) => t.source === imageIndex)
        if (textureIndex === -1) {
            textureIndex = json.textures.length
            json.textures.push({ source: imageIndex })
        }

        // マテリアルに割り当て
        VRMParser.assignOutlineTextureIndex(materialIndex, textureIndex)

        // チャンク再構築
        await VRMParser.chunkRebuilding()
    }

    // マテリアルのアウトラインテクスチャ設定を解除
    public static removeMaterialOutlineTexture = async (materialIndex: number): Promise<void> => {
        if (!VRMParser.json || !VRMParser.json.materials || !VRMParser.json.materials[materialIndex]) {
            throw new Error('Material not found: ' + materialIndex)
        }
        const json = VRMParser.json
        const mat = json.materials[materialIndex]

        // VRM 0.x MToon
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM?.materialProperties && extVRM.materialProperties[materialIndex]) {
            const mp = extVRM.materialProperties[materialIndex]
            if (mp.textureProperties) {
                delete mp.textureProperties._OutlineWidthTexture
            }
            if (mp.floatProperties) {
                mp.floatProperties._OutlineWidthMode = 0 // None
            }
        }

        // VRM 1.0 MToon
        if (mat?.extensions?.VRMC_materials_mtoon) {
            const mtoon = mat.extensions.VRMC_materials_mtoon
            delete mtoon.outlineWidthMultiplyTexture
            mtoon.outlineWidthMode = 'none'
        }

        await VRMParser.chunkRebuilding()
    }

    // マテリアルのアウトライン太さを取得（VRM内の設定値をそのまま返却）
    public static getMaterialOutlineWidth = (materialIndex: number): number => {
        if (!VRMParser.json || !VRMParser.json.materials || !VRMParser.json.materials[materialIndex]) {
            return 0
        }
        const json = VRMParser.json
        const mat = json.materials[materialIndex]

        // VRM 0.x MToon チェック
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM?.materialProperties) {
            let mp = extVRM.materialProperties[materialIndex]
            if (!mp || mp.name !== mat.name) {
                mp = extVRM.materialProperties.find((p: any) => p.name === mat.name) || mp
            }
            if (mp?.floatProperties) {
                const width = mp.floatProperties._OutlineWidth ?? 0
                return Math.round(width * 1000) / 1000
            }
        }

        // VRM 1.0 MToon チェック
        if (mat?.extensions?.VRMC_materials_mtoon) {
            const mtoon = mat.extensions.VRMC_materials_mtoon
            const width = mtoon.outlineWidthFactor ?? 0
            return Math.round(width * 1000) / 1000
        }

        return 0
    }

    // マテリアルのアウトラインモードを取得 ('none' | 'worldCoordinates' | 'screenCoordinates')
    public static getMaterialOutlineMode = (materialIndex: number): 'none' | 'worldCoordinates' | 'screenCoordinates' => {
        if (!VRMParser.json || !VRMParser.json.materials || !VRMParser.json.materials[materialIndex]) {
            return 'none'
        }
        const json = VRMParser.json
        const mat = json.materials[materialIndex]

        // VRM 0.x MToon チェック
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM?.materialProperties) {
            let mp = extVRM.materialProperties[materialIndex]
            if (!mp || mp.name !== mat.name) {
                mp = extVRM.materialProperties.find((p: any) => p.name === mat.name) || mp
            }
            const modeVal = mp?.floatProperties?._OutlineWidthMode ?? 0
            if (modeVal === 1) return 'worldCoordinates'
            if (modeVal === 2) return 'screenCoordinates'
            return 'none'
        }

        // VRM 1.0 MToon チェック
        if (mat?.extensions?.VRMC_materials_mtoon) {
            const mtoon = mat.extensions.VRMC_materials_mtoon
            const modeVal = mtoon.outlineWidthMode
            if (modeVal === 'worldCoordinates' || modeVal === 'screenCoordinates') {
                return modeVal
            }
            return 'none'
        }

        return 'none'
    }

    // マテリアルのアウトラインモードを設定
    public static setMaterialOutlineMode = async (
        materialIndex: number,
        mode: 'none' | 'worldCoordinates' | 'screenCoordinates'
    ): Promise<void> => {
        if (!VRMParser.json || !VRMParser.json.materials || !VRMParser.json.materials[materialIndex]) {
            throw new Error('Material not found: ' + materialIndex)
        }
        const json = VRMParser.json
        const mat = json.materials[materialIndex]

        // VRM 0.x MToon
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM?.materialProperties) {
            let mp = extVRM.materialProperties[materialIndex]
            if (!mp || mp.name !== mat.name) {
                mp = extVRM.materialProperties.find((p: any) => p.name === mat.name) || mp
            }
            if (mp) {
                if (!mp.floatProperties) mp.floatProperties = {}
                const modeNum = mode === 'worldCoordinates' ? 1 : (mode === 'screenCoordinates' ? 2 : 0)
                mp.floatProperties._OutlineWidthMode = modeNum

                if (mode !== 'none') {
                    if (!mp.vectorProperties) mp.vectorProperties = {}
                    if (!mp.vectorProperties._OutlineColor) {
                        mp.vectorProperties._OutlineColor = [0, 0, 0, 1]
                    }
                    if (!mp.floatProperties._OutlineWidth || mp.floatProperties._OutlineWidth <= 0) {
                        mp.floatProperties._OutlineWidth = 0.15
                    }
                }
            }
        }

        // VRM 1.0 MToon
        if (mat?.extensions?.VRMC_materials_mtoon) {
            const mtoon = mat.extensions.VRMC_materials_mtoon
            mtoon.outlineWidthMode = mode
            if (mode !== 'none') {
                if (!mtoon.outlineWidthFactor || mtoon.outlineWidthFactor <= 0) {
                    mtoon.outlineWidthFactor = 0.05
                }
            }
        }

        await VRMParser.chunkRebuilding()
    }

    // マテリアルのアウトライン太さを設定
    public static setMaterialOutlineWidth = async (materialIndex: number, width: number): Promise<void> => {
        if (!VRMParser.json || !VRMParser.json.materials || !VRMParser.json.materials[materialIndex]) {
            throw new Error('Material not found: ' + materialIndex)
        }
        const json = VRMParser.json
        const mat = json.materials[materialIndex]

        // VRM 0.x MToon
        const extVRM = VRMParser.getVRMExtensionJson()
        if (extVRM?.materialProperties) {
            let mp = extVRM.materialProperties[materialIndex]
            if (!mp || mp.name !== mat.name) {
                mp = extVRM.materialProperties.find((p: any) => p.name === mat.name) || mp
            }
            if (mp) {
                if (!mp.floatProperties) mp.floatProperties = {}
                mp.floatProperties._OutlineWidth = width

                if (mp.floatProperties._OutlineWidthMode === undefined) {
                    mp.floatProperties._OutlineWidthMode = 1 // WorldCoordinates
                }
                if (width > 0) {
                    if (!mp.vectorProperties) mp.vectorProperties = {}
                    if (!mp.vectorProperties._OutlineColor) {
                        mp.vectorProperties._OutlineColor = [0, 0, 0, 1]
                    }
                }
            }
        }

        // VRM 1.0 MToon
        if (mat?.extensions?.VRMC_materials_mtoon) {
            const mtoon = mat.extensions.VRMC_materials_mtoon
            mtoon.outlineWidthFactor = width
            if (mtoon.outlineWidthMode === undefined) {
                mtoon.outlineWidthMode = 'worldCoordinates'
            }
        }

        await VRMParser.chunkRebuilding()
    }
}

export default VRMParser;