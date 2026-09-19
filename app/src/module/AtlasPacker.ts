/**
 * AtlasPacker.ts
 * 2Dテクスチャアトラスの自動パッキングおよびレイアウト計算ユーティリティ
 */

export interface AtlasItem {
  id: string | number;
  name: string;
  imageIndex: number;
  width: number;
  height: number;
  x: number;
  y: number;
  originalWidth: number;
  originalHeight: number;
  aspectRatioLocked?: boolean;
  src?: string;
  blob?: Blob;
  imgElement?: HTMLImageElement;
}

export interface AtlasLayoutResult {
  atlasWidth: number;
  atlasHeight: number;
  items: AtlasItem[];
  success: boolean;
}

export class AtlasPacker {
  /**
   * 選択されたテクスチャ群をアトラスキャンバス（正方形）内に自動整列（Shelf / Guillotineパッキング）
   * @param items 配置対象のアイテム一覧
   * @param atlasWidth アトラスキャンバス幅（例: 2048）
   * @param atlasHeight アトラスキャンバス高さ（例: 2048）
   * @param padding テクスチャ間の隙間（px）
   */
  public static autoPack(
    items: AtlasItem[],
    atlasWidth = 2048,
    atlasHeight = 2048,
    padding = 2
  ): AtlasLayoutResult {
    if (!items || items.length === 0) {
      return { atlasWidth, atlasHeight, items: [], success: true }
    }

    // 単一スケールでパッキングを試行するヘルパー
    const tryPackWithScale = (scale: number) => {
      const sorted = items.map((it, idx) => {
        const baseW = it.originalWidth || it.width
        const baseH = it.originalHeight || it.height
        return {
          ...it,
          id: it.id ?? idx,
          width: Math.max(16, Math.floor(baseW * scale)),
          height: Math.max(16, Math.floor(baseH * scale))
        }
      }).sort((a, b) => {
        const diffH = b.height - a.height
        if (diffH !== 0) return diffH
        return b.width - a.width
      })

      let currentX = padding
      let currentY = padding
      let shelfHeight = 0
      const placed: any[] = []

      for (const item of sorted) {
        if (item.width + padding * 2 > atlasWidth || item.height + padding * 2 > atlasHeight) {
          return null
        }
        if (currentX + item.width + padding > atlasWidth) {
          currentX = padding
          currentY += shelfHeight + padding
          shelfHeight = 0
        }
        if (currentY + item.height + padding > atlasHeight) {
          return null // はみ出し
        }
        placed.push({ ...item, x: currentX, y: currentY })
        currentX += item.width + padding
        shelfHeight = Math.max(shelfHeight, item.height)
      }

      return placed
    }

    // まず scale = 1.0 で試行
    let bestPlaced = tryPackWithScale(1.0)
    let bestScale = 1.0

    // 収まらない場合は二分探索で重なりなく収まる最大スケールを探索
    if (!bestPlaced) {
      let low = 0.05
      let high = 1.0
      for (let i = 0; i < 16; i++) {
        const mid = (low + high) / 2
        const res = tryPackWithScale(mid)
        if (res) {
          bestPlaced = res
          bestScale = mid
          low = mid // さらに大きくできるか探索
        } else {
          high = mid // 縮小して再試行
        }
      }
    }

    // 万一二分探索でも収まらなかった場合のフォールバック
    if (!bestPlaced) {
      bestPlaced = items.map((it, idx) => ({
        ...it,
        id: it.id ?? idx,
        x: 0,
        y: 0,
        width: Math.min(it.width, atlasWidth),
        height: Math.min(it.height, atlasHeight)
      }))
    }

    // 元のアイテム配列順に戻して反映
    const resultMap = new Map<string | number, any>()
    bestPlaced.forEach((it: any) => resultMap.set(it.id, it))

    const packedItems = items.map((orig, idx) => {
      const p = resultMap.get(orig.id ?? idx)
      if (p) {
        return {
          ...orig,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height
        }
      }
      return orig
    })

    return {
      atlasWidth,
      atlasHeight,
      items: packedItems,
      success: true
    }
  }

  /**
   * 2つの矩形が衝突（重なり）しているかを判定
   */
  public static checkCollision(a: AtlasItem, b: AtlasItem, padding = 0): boolean {
    return (
      a.x < b.x + b.width + padding &&
      a.x + a.width + padding > b.x &&
      a.y < b.y + b.height + padding &&
      a.y + a.height + padding > b.y
    )
  }

  /**
   * キャンバス範囲外にはみ出していないかを判定
   */
  public static isWithinBounds(item: AtlasItem, atlasWidth: number, atlasHeight: number): boolean {
    return (
      item.x >= 0 &&
      item.y >= 0 &&
      item.x + item.width <= atlasWidth &&
      item.y + item.height <= atlasHeight
    )
  }

  /**
   * 単一テクスチャのUV変換パラメータを算出
   */
  public static getUVTransform(
    item: { x: number; y: number; width: number; height: number },
    atlasWidth: number,
    atlasHeight: number
  ): { scaleU: number; scaleV: number; offsetU: number; offsetV: number } {
    return {
      scaleU: item.width / atlasWidth,
      scaleV: item.height / atlasHeight,
      offsetU: item.x / atlasWidth,
      offsetV: item.y / atlasHeight
    }
  }

  /**
   * ドラッグ中のテクスチャ位置に対してキャンバス境界・他テクスチャ境界へのスマートスナップを計算
   */
  public static calculateSnap(
    targetItem: AtlasItem,
    candidateX: number,
    candidateY: number,
    allItems: AtlasItem[],
    atlasWidth: number,
    atlasHeight: number,
    threshold = 8
  ): { x: number; y: number; guideLinesX: number[]; guideLinesY: number[] } {
    let snappedX = candidateX
    let snappedY = candidateY
    const guideLinesX: number[] = []
    const guideLinesY: number[] = []

    const w = targetItem.width
    const h = targetItem.height

    // X軸スナップ候補（キャンバス左右・中央、他アイテムの左右・中央）
    const snapCandidatesX: number[] = [0, atlasWidth, atlasWidth / 2]
    const snapCandidatesY: number[] = [0, atlasHeight, atlasHeight / 2]

    allItems.forEach(other => {
      if (other.id === targetItem.id) return
      snapCandidatesX.push(other.x, other.x + other.width, other.x + other.width / 2)
      snapCandidatesY.push(other.y, other.y + other.height, other.y + other.height / 2)
    })

    // X軸判定
    let minDiffX = threshold + 1
    let bestSnapX = candidateX
    let activeGuideX: number | null = null

    for (const sx of snapCandidatesX) {
      // 自身の左端をsxに合わせる
      const diffLeft = Math.abs(candidateX - sx)
      if (diffLeft < minDiffX) {
        minDiffX = diffLeft
        bestSnapX = sx
        activeGuideX = sx
      }
      // 自身の右端をsxに合わせる
      const diffRight = Math.abs((candidateX + w) - sx)
      if (diffRight < minDiffX) {
        minDiffX = diffRight
        bestSnapX = sx - w
        activeGuideX = sx
      }
    }

    if (minDiffX <= threshold && activeGuideX !== null) {
      snappedX = bestSnapX
      guideLinesX.push(activeGuideX)
    }

    // Y軸判定
    let minDiffY = threshold + 1
    let bestSnapY = candidateY
    let activeGuideY: number | null = null

    for (const sy of snapCandidatesY) {
      // 自身の上端をsyに合わせる
      const diffTop = Math.abs(candidateY - sy)
      if (diffTop < minDiffY) {
        minDiffY = diffTop
        bestSnapY = sy
        activeGuideY = sy
      }
      //自身の下端をsyに合わせる
      const diffBottom = Math.abs((candidateY + h) - sy)
      if (diffBottom < minDiffY) {
        minDiffY = diffBottom
        bestSnapY = sy - h
        activeGuideY = sy
      }
    }

    if (minDiffY <= threshold && activeGuideY !== null) {
      snappedY = bestSnapY
      guideLinesY.push(activeGuideY)
    }

    return {
      x: snappedX,
      y: snappedY,
      guideLinesX,
      guideLinesY
    }
  }
}

export default AtlasPacker;

