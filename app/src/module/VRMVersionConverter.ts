/**
 * VRMVersionConverter
 * VRM 0.x と VRM 1.0 の相互変換機能を提供するモジュール
 *
 * Copyright (c) 2024 tfuru / Cecil Tools
 * Released under the MIT License
 */

export class VRMVersionConverter {
    /**
     * 指定されたターゲットバージョン（0 または 1）へ変換する
     * @param json glTF JSON オブジェクト
     * @param targetVersion '0' (VRM 0.x) または '1' (VRM 1.0)
     * @returns 変換後の新しい glTF JSON オブジェクト（ディープコピー）
     */
    public static convert(json: any, targetVersion: '0' | '1'): any {
        if (!json) return json;
        if (targetVersion === '1') {
            return VRMVersionConverter.convertVrm0ToVrm1(json);
        } else if (targetVersion === '0') {
            return VRMVersionConverter.convertVrm1ToVrm0(json);
        }
        return JSON.parse(JSON.stringify(json));
    }

    /**
     * VRM 0.x から VRM 1.0 へ変換する
     */
    public static convertVrm0ToVrm1(sourceJson: any): any {
        const gltf = JSON.parse(JSON.stringify(sourceJson));
        const vrm0 = gltf.extensions?.VRM;
        if (!vrm0) {
            // すでにVRM 1.0またはVRM拡張を持たない場合はそのまま返す
            return gltf;
        }

        // 1. extensionsUsed の更新
        gltf.extensionsUsed = gltf.extensionsUsed || [];
        gltf.extensionsUsed = gltf.extensionsUsed.filter((ext: string) => ext !== 'VRM');
        if (!gltf.extensionsUsed.includes('VRMC_vrm')) {
            gltf.extensionsUsed.push('VRMC_vrm');
        }
        if (!gltf.extensionsUsed.includes('VRMC_materials_mtoon')) {
            gltf.extensionsUsed.push('VRMC_materials_mtoon');
        }

        // 2. メタ情報の変換
        const v0Meta = vrm0.meta || {};
        const authors: string[] = [];
        if (v0Meta.author) {
            authors.push(v0Meta.author);
        } else {
            authors.push('Unknown');
        }

        let avatarPermission = 'onlyAuthor';
        if (v0Meta.allowedUserName === 'Everyone') {
            avatarPermission = 'everyone';
        } else if (v0Meta.allowedUserName === 'ExplicitlyLicensedPerson') {
            avatarPermission = 'onlySeparatelyLicensedPerson';
        }

        let commercialUsage = 'personalNonProfit';
        if (v0Meta.commercialUssageName === 'Allow') {
            commercialUsage = 'personalProfit';
        }

        const otherLicenseUrl = v0Meta.otherLicenseUrl || v0Meta.otherPermissionUrl || '';
        let ccLicenseUrl = '';
        switch (v0Meta.licenseName) {
            case 'CC0':
                ccLicenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/';
                break;
            case 'CC_BY':
                ccLicenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
                break;
            case 'CC_BY_NC':
                ccLicenseUrl = 'https://creativecommons.org/licenses/by-nc/4.0/';
                break;
            case 'CC_BY_SA':
                ccLicenseUrl = 'https://creativecommons.org/licenses/by-sa/4.0/';
                break;
            case 'CC_BY_NC_SA':
                ccLicenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
                break;
            case 'CC_BY_ND':
                ccLicenseUrl = 'https://creativecommons.org/licenses/by-nd/4.0/';
                break;
            case 'CC_BY_NC_ND':
                ccLicenseUrl = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';
                break;
        }

        const meta10: any = {
            name: v0Meta.title || gltf.asset?.generator || 'VRM Model',
            version: v0Meta.version || '1.0',
            authors,
            contactInformation: v0Meta.contactInformation || '',
            references: v0Meta.reference ? [v0Meta.reference] : [],
            licenseUrl: 'https://vrm.dev/licenses/1.0/',
            avatarPermission,
            allowExcessivelyViolentUsage: v0Meta.violentUssageName === 'Allow',
            allowExcessivelySexualUsage: v0Meta.sexualUssageName === 'Allow',
            commercialUsage,
            creditNotation: 'required',
            allowRedistribution: v0Meta.licenseName !== 'Redistribution_Prohibited',
            modification: 'allowModification'
        };
        const finalOtherLicenseUrl = otherLicenseUrl || ccLicenseUrl;
        if (finalOtherLicenseUrl) {
            meta10.otherLicenseUrl = finalOtherLicenseUrl;
        }
        if (typeof v0Meta.texture === 'number' && v0Meta.texture >= 0) {
            meta10.thumbnailImage = v0Meta.texture;
        }

        // 3. ヒューマノイドボーンの変換 (配列 -> オブジェクト & ボーン名対応)
        const v0HumanBones: any[] = vrm0.humanoid?.humanBones || [];
        const humanBones10: { [boneName: string]: { node: number } } = {};
        const boneRename0to1: { [key: string]: string } = {
            leftThumbProximal: 'leftThumbMetacarpal',
            leftThumbIntermediate: 'leftThumbProximal',
            rightThumbProximal: 'rightThumbMetacarpal',
            rightThumbIntermediate: 'rightThumbProximal'
        };

        v0HumanBones.forEach((b: any) => {
            if (b && typeof b.node === 'number' && b.bone) {
                const boneName10 = boneRename0to1[b.bone] || b.bone;
                humanBones10[boneName10] = { node: b.node };
            }
        });

        // 4. FirstPerson & LookAt の変換
        const v0FP = vrm0.firstPerson || {};
        const meshAnnotations10: any[] = [];
        if (Array.isArray(v0FP.meshAnnotations)) {
            v0FP.meshAnnotations.forEach((ma: any) => {
                const nodeIndex = gltf.nodes?.findIndex((n: any) => n.mesh === ma.mesh);
                if (nodeIndex !== -1 && nodeIndex !== undefined) {
                    let flagType = 'auto';
                    if (ma.firstPersonFlag) {
                        flagType = ma.firstPersonFlag.charAt(0).toLowerCase() + ma.firstPersonFlag.slice(1);
                    }
                    meshAnnotations10.push({
                        node: nodeIndex,
                        type: flagType
                    });
                }
            });
        }

        // lookAt.offsetFromHeadBone (VRM 0.x では -Z正面、1.0 では +Z正面のため Z反転)
        const offset = v0FP.firstPersonBoneOffset || { x: 0, y: 0.06, z: 0 };
        const lookAt10: any = {
            offsetFromHeadBone: [offset.x || 0, offset.y || 0, -(offset.z || 0)],
            type: v0FP.lookAtTypeName === 'BlendShape' ? 'expression' : 'bone',
            rangeMapHorizontalInner: { inputMaxValue: 90, outputScale: 10 },
            rangeMapHorizontalOuter: { inputMaxValue: 90, outputScale: 10 },
            rangeMapVerticalDown: { inputMaxValue: 90, outputScale: 10 },
            rangeMapVerticalUp: { inputMaxValue: 90, outputScale: 10 }
        };

        // 5. BlendShapeMaster -> Expressions の変換
        const presetMap0to1: { [key: string]: string } = {
            joy: 'happy',
            angry: 'angry',
            sorrow: 'sad',
            fun: 'relaxed',
            a: 'aa',
            i: 'ih',
            u: 'ou',
            e: 'ee',
            o: 'oh',
            blink: 'blink',
            blink_l: 'blinkLeft',
            blink_r: 'blinkRight',
            lookup: 'lookUp',
            lookdown: 'lookDown',
            neutral: 'neutral'
        };

        const presetExpressions: { [key: string]: any } = {};
        const customExpressions: { [key: string]: any } = {};
        const v0Groups = vrm0.blendShapeMaster?.blendShapeGroups || [];

        v0Groups.forEach((group: any) => {
            const morphTargetBinds: any[] = [];
            (group.binds || []).forEach((bind: any) => {
                const nodeIndex = gltf.nodes?.findIndex((n: any) => n.mesh === bind.mesh);
                if (nodeIndex !== -1 && nodeIndex !== undefined) {
                    morphTargetBinds.push({
                        node: nodeIndex,
                        index: bind.index,
                        weight: (bind.weight || 0) / 100.0
                    });
                }
            });

            const exprObj: any = {
                morphTargetBinds,
                isBinary: !!group.isBinary
            };

            const presetLower = (group.presetName || '').toLowerCase();
            const mappedPreset = presetMap0to1[presetLower];
            if (mappedPreset) {
                presetExpressions[mappedPreset] = exprObj;
            } else {
                const customName = group.name || group.presetName || 'custom';
                customExpressions[customName] = exprObj;
            }
        });

        // 6. VRMC_vrm 拡張オブジェクトの構築
        gltf.extensions = gltf.extensions || {};
        gltf.extensions.VRMC_vrm = {
            specVersion: '1.0',
            meta: meta10,
            humanoid: {
                humanBones: humanBones10
            },
            firstPerson: {
                meshAnnotations: meshAnnotations10
            },
            lookAt: lookAt10,
            expressions: {
                preset: presetExpressions,
                custom: customExpressions
            }
        };

        // 7. マテリアル (VRM.materialProperties -> VRMC_materials_mtoon)
        const v0MatProps: any[] = vrm0.materialProperties || [];
        gltf.materials = gltf.materials || [];

        v0MatProps.forEach((mp: any, mIdx: number) => {
            let targetMat = gltf.materials[mIdx];
            if (!targetMat || (targetMat.name && mp.name && targetMat.name !== mp.name)) {
                targetMat = gltf.materials.find((m: any) => m.name === mp.name) || targetMat;
            }
            if (!targetMat) return;

            targetMat.extensions = targetMat.extensions || {};
            const floatProps = mp.floatProperties || {};
            const vecProps = mp.vectorProperties || {};
            const texProps = mp.textureProperties || {};

            if (mp.shader === 'VRM/MToon') {
                let outlineWidthMode: 'none' | 'worldCoordinates' | 'screenCoordinates' = 'none';
                if (floatProps._OutlineWidthMode === 1) outlineWidthMode = 'worldCoordinates';
                else if (floatProps._OutlineWidthMode === 2) outlineWidthMode = 'screenCoordinates';

                const mtoon10: any = {
                    specVersion: '1.0',
                    shadeColorFactor: vecProps._ShadeColor ? vecProps._ShadeColor.slice(0, 3) : [0.9, 0.9, 0.9],
                    shadingShiftFactor: floatProps._ShadeShift ?? 0,
                    shadingToonyFactor: floatProps._ShadeToony ?? 0.9,
                    outlineWidthMode,
                    outlineWidthFactor: (floatProps._OutlineWidth ?? 0) / 100.0,
                    outlineColorFactor: vecProps._OutlineColor ? vecProps._OutlineColor.slice(0, 3) : [0, 0, 0],
                    outlineLightingMixFactor: floatProps._OutlineLightingMix ?? 1.0,
                    matcapFactor: vecProps._SphereAdd ? vecProps._SphereAdd.slice(0, 3) : [1, 1, 1],
                    parametricRimColorFactor: vecProps._RimColor ? vecProps._RimColor.slice(0, 3) : [0, 0, 0],
                    parametricRimFresnelPowerFactor: floatProps._RimFresnelPower ?? 1.0,
                    parametricRimLiftFactor: floatProps._RimLift ?? 0.0,
                    rimLightingMixFactor: floatProps._RimLightingMix ?? 1.0
                };

                if (typeof texProps._ShadeTexture === 'number' && texProps._ShadeTexture >= 0) {
                    mtoon10.shadeMultiplyTexture = { index: texProps._ShadeTexture };
                }
                if (typeof texProps._SphereAdd === 'number' && texProps._SphereAdd >= 0) {
                    mtoon10.matcapTexture = { index: texProps._SphereAdd };
                }
                if (typeof texProps._RimTexture === 'number' && texProps._RimTexture >= 0) {
                    mtoon10.rimMultiplyTexture = { index: texProps._RimTexture };
                }
                if (typeof texProps._OutlineWidthTexture === 'number' && texProps._OutlineWidthTexture >= 0) {
                    mtoon10.outlineWidthMultiplyTexture = { index: texProps._OutlineWidthTexture };
                }

                targetMat.extensions.VRMC_materials_mtoon = mtoon10;
            }

            // PBR 設定の補完
            targetMat.pbrMetallicRoughness = targetMat.pbrMetallicRoughness || {};
            if (typeof texProps._MainTex === 'number' && texProps._MainTex >= 0 && !targetMat.pbrMetallicRoughness.baseColorTexture) {
                targetMat.pbrMetallicRoughness.baseColorTexture = { index: texProps._MainTex };
            }
            if (vecProps._Color && !targetMat.pbrMetallicRoughness.baseColorFactor) {
                targetMat.pbrMetallicRoughness.baseColorFactor = vecProps._Color;
            }
            if (typeof texProps._BumpMap === 'number' && texProps._BumpMap >= 0 && !targetMat.normalTexture) {
                targetMat.normalTexture = { index: texProps._BumpMap };
            }
        });

        // 8. 揺れもの (secondaryAnimation -> VRMC_springBone)
        const sec = vrm0.secondaryAnimation;
        if (sec && (sec.boneGroups?.length > 0 || sec.colliderGroups?.length > 0)) {
            if (!gltf.extensionsUsed.includes('VRMC_springBone')) {
                gltf.extensionsUsed.push('VRMC_springBone');
            }

            const colliders10: any[] = [];
            const colliderGroups10: any[] = [];

            (sec.colliderGroups || []).forEach((cg: any) => {
                const colliderIndices: number[] = [];
                (cg.colliders || []).forEach((c: any) => {
                    const cIdx = colliders10.length;
                    colliders10.push({
                        node: cg.node,
                        shape: {
                            sphere: {
                                offset: c.offset ? [c.offset.x || 0, c.offset.y || 0, -(c.offset.z || 0)] : [0, 0, 0],
                                radius: c.radius || 0
                            }
                        }
                    });
                    colliderIndices.push(cIdx);
                });
                colliderGroups10.push({
                    colliders: colliderIndices
                });
            });

            const springs10: any[] = [];
            (sec.boneGroups || []).forEach((bg: any, bgIdx: number) => {
                const joints: any[] = (bg.bones || []).map((bNode: number) => ({
                    node: bNode,
                    hitRadius: bg.hitRadius || 0,
                    dragForce: bg.dragForce || 0,
                    gravityPower: bg.gravityPower || 0,
                    gravityDir: bg.gravityDir ? [bg.gravityDir.x || 0, bg.gravityDir.y || -1, -(bg.gravityDir.z || 0)] : [0, -1, 0],
                    stiffness: bg.stiffiness || 0
                }));

                springs10.push({
                    name: bg.comment || `Spring_${bgIdx}`,
                    joints,
                    colliderGroups: bg.colliderGroups || [],
                    center: typeof bg.center === 'number' && bg.center >= 0 ? bg.center : undefined
                });
            });

            gltf.extensions.VRMC_springBone = {
                specVersion: '1.0',
                colliders: colliders10,
                colliderGroups: colliderGroups10,
                springs: springs10
            };
        }

        // 9. 古い VRM 拡張の削除
        delete gltf.extensions.VRM;

        // 10. モデルの向きの反転 (VRM 0.x: -Z正面 -> VRM 1.0: +Z正面)
        VRMVersionConverter.rotateSceneRootNodes180(gltf);

        return gltf;
    }

    /**
     * VRM 1.0 から VRM 0.x へ変換する
     */
    public static convertVrm1ToVrm0(sourceJson: any): any {
        const gltf = JSON.parse(JSON.stringify(sourceJson));
        const vrm1 = gltf.extensions?.VRMC_vrm;
        if (!vrm1) {
            // すでにVRM 0.xまたはVRMC_vrm拡張を持たない場合はそのまま返す
            return gltf;
        }

        const springBone1 = gltf.extensions?.VRMC_springBone;

        // 1. extensionsUsed の更新
        gltf.extensionsUsed = gltf.extensionsUsed || [];
        gltf.extensionsUsed = gltf.extensionsUsed.filter((ext: string) =>
            ext !== 'VRMC_vrm' &&
            ext !== 'VRMC_materials_mtoon' &&
            ext !== 'VRMC_springBone' &&
            ext !== 'VRMC_node_constraint'
        );
        if (!gltf.extensionsUsed.includes('VRM')) {
            gltf.extensionsUsed.push('VRM');
        }

        // 2. メタ情報の変換
        const v1Meta = vrm1.meta || {};
        let allowedUserName = 'OnlyAuthor';
        if (v1Meta.avatarPermission === 'everyone') {
            allowedUserName = 'Everyone';
        } else if (v1Meta.avatarPermission === 'onlySeparatelyLicensedPerson') {
            allowedUserName = 'ExplicitlyLicensedPerson';
        }

        const meta0: any = {
            title: v1Meta.name || gltf.asset?.generator || 'VRM Model',
            version: v1Meta.version || '0.0',
            author: v1Meta.authors?.[0] || 'Unknown',
            contactInformation: v1Meta.contactInformation || '',
            reference: v1Meta.references?.[0] || '',
            texture: typeof v1Meta.thumbnailImage === 'number' ? v1Meta.thumbnailImage : -1,
            allowedUserName,
            violentUssageName: v1Meta.allowExcessivelyViolentUsage ? 'Allow' : 'Disallow',
            sexualUssageName: v1Meta.allowExcessivelySexualUsage ? 'Allow' : 'Disallow',
            commercialUssageName: v1Meta.commercialUsage === 'personalProfit' || v1Meta.commercialUsage === 'corporation' ? 'Allow' : 'Disallow',
            otherPermissionUrl: v1Meta.otherLicenseUrl || (v1Meta.licenseUrl && v1Meta.licenseUrl !== 'https://vrm.dev/licenses/1.0/' ? v1Meta.licenseUrl : '') || '',
            licenseName: 'Other',
            otherLicenseUrl: v1Meta.otherLicenseUrl || (v1Meta.licenseUrl && v1Meta.licenseUrl !== 'https://vrm.dev/licenses/1.0/' ? v1Meta.licenseUrl : '') || ''
        };

        // 3. ヒューマノイドボーンの変換 (オブジェクト -> 配列 & ボーン名対応)
        const v1HumanBones = vrm1.humanoid?.humanBones || {};
        const humanBones0: any[] = [];
        const boneRename1to0: { [key: string]: string } = {
            leftThumbMetacarpal: 'leftThumbProximal',
            leftThumbProximal: 'leftThumbIntermediate',
            rightThumbMetacarpal: 'rightThumbProximal',
            rightThumbProximal: 'rightThumbIntermediate'
        };

        Object.keys(v1HumanBones).forEach((boneName10: string) => {
            const b = v1HumanBones[boneName10];
            if (b && typeof b.node === 'number') {
                const boneName0 = boneRename1to0[boneName10] || boneName10;
                humanBones0.push({
                    bone: boneName0,
                    node: b.node,
                    useDefaultValues: true
                });
            }
        });

        // 4. FirstPerson の変換
        const v1FP = vrm1.firstPerson || {};
        const v1LookAt = vrm1.lookAt || {};
        const meshAnnotations0: any[] = [];
        if (Array.isArray(v1FP.meshAnnotations)) {
            v1FP.meshAnnotations.forEach((ma: any) => {
                const meshIndex = gltf.nodes?.[ma.node]?.mesh;
                if (typeof meshIndex === 'number') {
                    let flag = 'Auto';
                    if (ma.type) {
                        flag = ma.type.charAt(0).toUpperCase() + ma.type.slice(1);
                    }
                    meshAnnotations0.push({
                        mesh: meshIndex,
                        firstPersonFlag: flag
                    });
                }
            });
        }

        const offsetArr = v1LookAt.offsetFromHeadBone || [0, 0.06, 0];
        const firstPerson0: any = {
            firstPersonBone: humanBones0.find((b: any) => b.bone === 'head')?.node ?? -1,
            firstPersonBoneOffset: {
                x: offsetArr[0] || 0,
                y: offsetArr[1] || 0,
                z: -(offsetArr[2] || 0) // VRM 1.0 (+Z) -> VRM 0.x (-Z) 反転
            },
            meshAnnotations: meshAnnotations0,
            lookAtTypeName: v1LookAt.type === 'expression' ? 'BlendShape' : 'Bone',
            lookAtHorizontalInner: { curve: [0, 0, 0, 1, 1, 1, 1, 0], xRange: 90, yRange: 10 },
            lookAtHorizontalOuter: { curve: [0, 0, 0, 1, 1, 1, 1, 0], xRange: 90, yRange: 10 },
            lookAtVerticalDown: { curve: [0, 0, 0, 1, 1, 1, 1, 0], xRange: 90, yRange: 10 },
            lookAtVerticalUp: { curve: [0, 0, 0, 1, 1, 1, 1, 0], xRange: 90, yRange: 10 }
        };

        // 5. Expressions -> BlendShapeMaster の変換
        const presetMap1to0: { [key: string]: string } = {
            happy: 'Joy',
            angry: 'Angry',
            sad: 'Sorrow',
            relaxed: 'Fun',
            aa: 'A',
            ih: 'I',
            ou: 'U',
            ee: 'E',
            oh: 'O',
            blink: 'Blink',
            blinkLeft: 'Blink_L',
            blinkRight: 'Blink_R',
            lookUp: 'Lookup',
            lookDown: 'Lookdown',
            neutral: 'Neutral'
        };

        const blendShapeGroups0: any[] = [];
        const v1Presets = vrm1.expressions?.preset || {};
        const v1Customs = vrm1.expressions?.custom || {};

        const processExpression = (name: string, expr: any, isPreset: boolean) => {
            const presetName = isPreset ? (presetMap1to0[name] || 'unknown') : 'unknown';
            const groupName = isPreset ? presetName : name;

            const binds0: any[] = [];
            (expr.morphTargetBinds || []).forEach((bind: any) => {
                const meshIndex = gltf.nodes?.[bind.node]?.mesh;
                if (typeof meshIndex === 'number') {
                    binds0.push({
                        mesh: meshIndex,
                        index: bind.index,
                        weight: Math.round((bind.weight || 0) * 100)
                    });
                }
            });

            blendShapeGroups0.push({
                name: groupName,
                presetName,
                binds: binds0,
                materialValues: [],
                isBinary: !!expr.isBinary
            });
        };

        Object.keys(v1Presets).forEach(pName => processExpression(pName, v1Presets[pName], true));
        Object.keys(v1Customs).forEach(cName => processExpression(cName, v1Customs[cName], false));

        // 6. マテリアル (VRMC_materials_mtoon -> VRM.materialProperties)
        const materialProperties0: any[] = [];
        gltf.materials = gltf.materials || [];

        gltf.materials.forEach((mat: any, mIdx: number) => {
            const mtoon10 = mat.extensions?.VRMC_materials_mtoon;
            const pbr = mat.pbrMetallicRoughness || {};

            let outlineWidthMode0 = 0;
            if (mtoon10?.outlineWidthMode === 'worldCoordinates') outlineWidthMode0 = 1;
            else if (mtoon10?.outlineWidthMode === 'screenCoordinates') outlineWidthMode0 = 2;

            const floatProperties: { [key: string]: number } = {
                _ShadeShift: mtoon10?.shadingShiftFactor ?? 0,
                _ShadeToony: mtoon10?.shadingToonyFactor ?? 0.9,
                _OutlineWidth: (mtoon10?.outlineWidthFactor ?? 0) * 100.0,
                _OutlineLightingMix: mtoon10?.outlineLightingMixFactor ?? 1.0,
                _OutlineWidthMode: outlineWidthMode0,
                _RimLightingMix: mtoon10?.rimLightingMixFactor ?? 1.0,
                _RimFresnelPower: mtoon10?.parametricRimFresnelPowerFactor ?? 1.0,
                _RimLift: mtoon10?.parametricRimLiftFactor ?? 0.0
            };

            const vectorProperties: { [key: string]: number[] } = {
                _Color: pbr.baseColorFactor || [1, 1, 1, 1],
                _ShadeColor: mtoon10?.shadeColorFactor ? [...mtoon10.shadeColorFactor, 1] : [0.9, 0.9, 0.9, 1],
                _OutlineColor: mtoon10?.outlineColorFactor ? [...mtoon10.outlineColorFactor, 1] : [0, 0, 0, 1],
                _RimColor: mtoon10?.parametricRimColorFactor ? [...mtoon10.parametricRimColorFactor, 1] : [0, 0, 0, 1],
                _SphereAdd: mtoon10?.matcapFactor ? [...mtoon10.matcapFactor, 1] : [1, 1, 1, 1]
            };

            const textureProperties: { [key: string]: number } = {};
            if (typeof pbr.baseColorTexture?.index === 'number') {
                textureProperties._MainTex = pbr.baseColorTexture.index;
            }
            if (typeof mtoon10?.shadeMultiplyTexture?.index === 'number') {
                textureProperties._ShadeTexture = mtoon10.shadeMultiplyTexture.index;
            }
            if (typeof mat.normalTexture?.index === 'number') {
                textureProperties._BumpMap = mat.normalTexture.index;
            }
            if (typeof mtoon10?.matcapTexture?.index === 'number') {
                textureProperties._SphereAdd = mtoon10.matcapTexture.index;
            }
            if (typeof mtoon10?.rimMultiplyTexture?.index === 'number') {
                textureProperties._RimTexture = mtoon10.rimMultiplyTexture.index;
            }
            if (typeof mtoon10?.outlineWidthMultiplyTexture?.index === 'number') {
                textureProperties._OutlineWidthTexture = mtoon10.outlineWidthMultiplyTexture.index;
            }

            materialProperties0.push({
                name: mat.name || `Material_${mIdx}`,
                shader: mtoon10 ? 'VRM/MToon' : 'VRM_glTF',
                renderQueue: 2000,
                floatProperties,
                vectorProperties,
                textureProperties,
                keywordMap: {},
                tagMap: {}
            });

            if (mat.extensions?.VRMC_materials_mtoon) {
                delete mat.extensions.VRMC_materials_mtoon;
            }
        });

        // 7. 揺れもの (VRMC_springBone -> secondaryAnimation)
        const secondaryAnimation0: any = {
            boneGroups: [],
            colliderGroups: []
        };

        if (springBone1) {
            const colliders1 = springBone1.colliders || [];
            (springBone1.colliderGroups || []).forEach((cg: any) => {
                const colliders0: any[] = [];
                let targetNode = -1;
                (cg.colliders || []).forEach((cIdx: number) => {
                    const c = colliders1[cIdx];
                    if (c) {
                        targetNode = c.node;
                        const sphere = c.shape?.sphere;
                        colliders0.push({
                            offset: sphere?.offset ? { x: sphere.offset[0], y: sphere.offset[1], z: -sphere.offset[2] } : { x: 0, y: 0, z: 0 },
                            radius: sphere?.radius || 0
                        });
                    }
                });
                if (targetNode !== -1) {
                    secondaryAnimation0.colliderGroups.push({
                        node: targetNode,
                        colliders: colliders0
                    });
                }
            });

            (springBone1.springs || []).forEach((sp: any) => {
                const bones = (sp.joints || []).map((j: any) => j.node).filter((n: any) => typeof n === 'number');
                const firstJoint = sp.joints?.[0] || {};
                secondaryAnimation0.boneGroups.push({
                    comment: sp.name || '',
                    stiffiness: firstJoint.stiffness || 0,
                    gravityPower: firstJoint.gravityPower || 0,
                    gravityDir: firstJoint.gravityDir ? { x: firstJoint.gravityDir[0], y: firstJoint.gravityDir[1], z: -firstJoint.gravityDir[2] } : { x: 0, y: -1, z: 0 },
                    dragForce: firstJoint.dragForce || 0,
                    center: typeof sp.center === 'number' ? sp.center : -1,
                    hitRadius: firstJoint.hitRadius || 0,
                    bones,
                    colliderGroups: sp.colliderGroups || []
                });
            });
        }

        // 8. VRM 0.x オブジェクトの構築
        gltf.extensions = gltf.extensions || {};
        gltf.extensions.VRM = {
            exporterVersion: 'VRMEditorTools',
            specVersion: '0.0',
            meta: meta0,
            humanoid: {
                humanBones: humanBones0,
                armStretch: 0.05,
                legStretch: 0.05,
                upperArmTwist: 0.5,
                lowerArmTwist: 0.5,
                upperLegTwist: 0.5,
                lowerLegTwist: 0.5,
                feetSpacing: 0,
                hasTranslationDoF: false
            },
            firstPerson: firstPerson0,
            blendShapeMaster: {
                blendShapeGroups: blendShapeGroups0
            },
            secondaryAnimation: secondaryAnimation0,
            materialProperties: materialProperties0
        };

        // 9. 不要な VRM 1.0 拡張の削除
        delete gltf.extensions.VRMC_vrm;
        delete gltf.extensions.VRMC_springBone;
        delete gltf.extensions.VRMC_node_constraint;

        // 10. モデルの向きの反転 (VRM 1.0: +Z正面 -> VRM 0.x: -Z正面)
        VRMVersionConverter.rotateSceneRootNodes180(gltf);

        return gltf;
    }

    /**
     * glTFシーンのルートノードをY軸中心に180度回転する
     * (VRM 0.x と VRM 1.0 の座標系・正面方向の反転を解決する)
     */
    public static rotateSceneRootNodes180(gltf: any): void {
        const sceneIndex = gltf.scene || 0;
        const scene = gltf.scenes?.[sceneIndex];
        if (!scene || !Array.isArray(scene.nodes)) return;

        // Y軸周り180度回転クォータニオン: [0, 1, 0, 0] (x=0, y=1, z=0, w=0)
        // q_rot * q_orig:
        // x' =  z
        // y' =  w
        // z' = -x
        // w' = -y
        scene.nodes.forEach((nodeIdx: number) => {
            const node = gltf.nodes?.[nodeIdx];
            if (!node) return;

            if (node.rotation && Array.isArray(node.rotation) && node.rotation.length === 4) {
                const [x, y, z, w] = node.rotation;
                node.rotation = [z, w, -x, -y];
            } else {
                node.rotation = [0, 1, 0, 0];
            }

            // 平行移動 (translation) がある場合も Y軸180度回転 (x -> -x, z -> -z)
            if (node.translation && Array.isArray(node.translation) && node.translation.length === 3) {
                node.translation[0] = -node.translation[0];
                node.translation[2] = -node.translation[2];
            }
        });
    }
}

export default VRMVersionConverter;
