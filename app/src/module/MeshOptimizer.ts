import { MeshoptSimplifier } from 'meshoptimizer'

export interface PrimitiveMeshStats {
  meshIndex: number
  primitiveIndex: number
  meshName: string
  triangleCount: number
  vertexCount: number
  hasMorphTargets: boolean
  hasSkin: boolean
  materialName: string
  materialIndex: number
}

export interface ModelPolygonStats {
  totalTriangles: number
  totalVertices: number
  meshCount: number
  primitiveCount: number
  primitives: PrimitiveMeshStats[]
}

export interface ReducedPrimitiveResult {
  meshIndex: number
  primitiveIndex: number
  meshName: string
  originalTriangleCount: number
  newTriangleCount: number
  newIndices: Uint16Array | Uint32Array
  error: number
}

export class MeshOptimizer {
  private static isReady = false

  public static async init(): Promise<void> {
    if (MeshOptimizer.isReady) return
    await MeshoptSimplifier.ready
    MeshOptimizer.isReady = true
  }

  /**
   * VRMのJSONとバイナリ(chunkData)からメッシュおよびプリミティブのポリゴン統計を取得
   */
  public static getModelPolygonStats(json: any): ModelPolygonStats {
    let totalTriangles = 0
    let totalVertices = 0
    const primitives: PrimitiveMeshStats[] = []

    if (!json || !json.meshes) {
      return { totalTriangles: 0, totalVertices: 0, meshCount: 0, primitiveCount: 0, primitives: [] }
    }

    json.meshes.forEach((mesh: any, mIdx: number) => {
      const meshName = mesh.name || `Mesh_${mIdx}`
      if (!mesh.primitives) return

      mesh.primitives.forEach((prim: any, pIdx: number) => {
        let triCount = 0
        let vCount = 0

        // インデックスアクセサ
        if (typeof prim.indices === 'number' && json.accessors?.[prim.indices]) {
          const idxAcc = json.accessors[prim.indices]
          triCount = Math.floor(idxAcc.count / 3)
        }

        // 頂点位置アクセサ
        const posAccIdx = prim.attributes?.POSITION
        if (typeof posAccIdx === 'number' && json.accessors?.[posAccIdx]) {
          const posAcc = json.accessors[posAccIdx]
          vCount = posAcc.count
        }

        const hasMorphTargets = !!(prim.targets && Array.isArray(prim.targets) && prim.targets.length > 0)
        const hasSkin = typeof prim.attributes?.JOINTS_0 === 'number'
        const matIdx = typeof prim.material === 'number' ? prim.material : -1
        const matName = (matIdx >= 0 && json.materials?.[matIdx]?.name) ? json.materials[matIdx].name : 'Default'

        totalTriangles += triCount
        totalVertices += vCount

        primitives.push({
          meshIndex: mIdx,
          primitiveIndex: pIdx,
          meshName,
          triangleCount: triCount,
          vertexCount: vCount,
          hasMorphTargets,
          hasSkin,
          materialName: matName,
          materialIndex: matIdx
        })
      })
    })

    return {
      totalTriangles,
      totalVertices,
      meshCount: json.meshes.length,
      primitiveCount: primitives.length,
      primitives
    }
  }

  /**
   * 指定のプリミティブからインデックス配列を取得
   */
  public static getPrimitiveIndices(json: any, chunkData: Uint8Array, indicesAccIdx: number): Uint32Array {
    const acc = json.accessors?.[indicesAccIdx]
    if (!acc) throw new Error(`Accessor ${indicesAccIdx} not found`)
    const bv = json.bufferViews?.[acc.bufferView]
    if (!bv) throw new Error(`BufferView ${acc.bufferView} not found`)

    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0)
    const count = acc.count
    const compType = acc.componentType // 5121: UBYTE, 5123: USHORT, 5125: UINT
    const dataView = new DataView(chunkData.buffer, chunkData.byteOffset + byteOffset, bv.byteLength)

    const result = new Uint32Array(count)
    if (compType === 5123) {
      for (let i = 0; i < count; i++) {
        result[i] = dataView.getUint16(i * 2, true)
      }
    } else if (compType === 5125) {
      for (let i = 0; i < count; i++) {
        result[i] = dataView.getUint32(i * 4, true)
      }
    } else if (compType === 5121) {
      for (let i = 0; i < count; i++) {
        result[i] = dataView.getUint8(i)
      }
    } else {
      throw new Error(`Unsupported index componentType: ${compType}`)
    }

    return result
  }

  /**
   * 指定のプリミティブから頂点位置配列 (Float32Array [x, y, z, ...]) を取得
   */
  public static getPrimitivePositions(json: any, chunkData: Uint8Array, posAccIdx: number): Float32Array {
    const acc = json.accessors?.[posAccIdx]
    if (!acc) throw new Error(`Position accessor ${posAccIdx} not found`)
    const bv = json.bufferViews?.[acc.bufferView]
    if (!bv) throw new Error(`Position bufferView ${acc.bufferView} not found`)

    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0)
    const count = acc.count
    const stride = bv.byteStride || 12 // 3 floats * 4 bytes = 12
    const dataView = new DataView(chunkData.buffer, chunkData.byteOffset + byteOffset, bv.byteLength)

    const result = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const off = i * stride
      result[i * 3] = dataView.getFloat32(off, true)
      result[i * 3 + 1] = dataView.getFloat32(off + 4, true)
      result[i * 3 + 2] = dataView.getFloat32(off + 8, true)
    }

    return result
  }

  /**
   * 単一プリミティブのポリゴン削減を実行
   */
  public static simplifyPrimitive(
    indices: Uint32Array,
    positions: Float32Array,
    targetRatio: number, // 0.0 ~ 0.9 (削減率)
    targetError = 0.01
  ): { newIndices: Uint16Array | Uint32Array; error: number } {
    if (targetRatio <= 0) {
      return {
        newIndices: positions.length / 3 < 65536 ? new Uint16Array(indices) : indices,
        error: 0
      }
    }

    const targetIndexCount = Math.max(3, Math.floor(indices.length * (1 - targetRatio)))
    // targetIndexCountは3の倍数に
    const alignedTarget = Math.floor(targetIndexCount / 3) * 3

    // MeshoptSimplifier.simplify は [newIndices, error] を返す
    const [simplified, error] = MeshoptSimplifier.simplify(
      indices,
      positions,
      3,
      alignedTarget,
      targetError
    )

    const vertexCount = positions.length / 3
    if (vertexCount < 65536) {
      return {
        newIndices: new Uint16Array(simplified),
        error
      }
    } else {
      return {
        newIndices: simplified,
        error
      }
    }
  }

  /**
   * VRMモデル全体のポリゴン削減を実行
   */
  public static async simplifyVRM(
    json: any,
    chunkData: Uint8Array,
    options: {
      ratio: number // 0.0 ~ 0.9
      protectMorphTargets?: boolean
      targetError?: number
      selectedPrimitives?: Set<string> // `${meshIndex}_${primitiveIndex}`
    }
  ): Promise<ReducedPrimitiveResult[]> {
    await MeshOptimizer.init()

    const protectMorph = options.protectMorphTargets !== false
    const targetError = options.targetError || 0.01
    const results: ReducedPrimitiveResult[] = []

    if (!json.meshes) return results

    for (let mIdx = 0; mIdx < json.meshes.length; mIdx++) {
      const mesh = json.meshes[mIdx]
      if (!mesh.primitives) continue

      for (let pIdx = 0; pIdx < mesh.primitives.length; pIdx++) {
        const prim = mesh.primitives[pIdx]
        const primKey = `${mIdx}_${pIdx}`

        // 選択されたプリミティブのフィルタリング
        if (options.selectedPrimitives && !options.selectedPrimitives.has(primKey)) {
          continue
        }

        // モーフターゲット保護
        const hasMorphTargets = !!(prim.targets && Array.isArray(prim.targets) && prim.targets.length > 0)
        if (protectMorph && hasMorphTargets) {
          continue
        }

        if (typeof prim.indices !== 'number' || typeof prim.attributes?.POSITION !== 'number') {
          continue
        }

        const indices = MeshOptimizer.getPrimitiveIndices(json, chunkData, prim.indices)
        const positions = MeshOptimizer.getPrimitivePositions(json, chunkData, prim.attributes.POSITION)
        const origTriCount = Math.floor(indices.length / 3)

        if (origTriCount <= 1) continue

        const { newIndices, error } = MeshOptimizer.simplifyPrimitive(
          indices,
          positions,
          options.ratio,
          targetError
        )

        results.push({
          meshIndex: mIdx,
          primitiveIndex: pIdx,
          meshName: mesh.name || `Mesh_${mIdx}`,
          originalTriangleCount: origTriCount,
          newTriangleCount: Math.floor(newIndices.length / 3),
          newIndices,
          error
        })
      }
    }

    return results
  }
}
