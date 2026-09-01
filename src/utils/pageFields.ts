import type { PageField } from '../types/field'
import { createFieldKey, renumberFieldSort } from './fieldRules'
import { schemaToFormFields } from './schema'

export type CoreFieldOverride = Pick<PageField, 'field' | 'showInTable' | 'searchMode' | 'dateSearchPrecision'>

export const applyCoreFieldOverrides = (
    coreFields: PageField[],
    coreFieldOverrides: CoreFieldOverride[] = [],
): PageField[] => {
    if (!coreFieldOverrides.length) {
        return coreFields
    }
    const overrideMap = new Map(coreFieldOverrides.map((overrideItem) => [overrideItem.field, overrideItem]))
    return coreFields.map((fieldItem) => {
        const overrideItem = overrideMap.get(fieldItem.field)
        if (!overrideItem) {
            return fieldItem
        }
        return {
            ...fieldItem,
            ...(overrideItem.showInTable !== undefined ? { showInTable: overrideItem.showInTable } : {}),
            ...(overrideItem.searchMode !== undefined ? { searchMode: overrideItem.searchMode } : {}),
            ...(overrideItem.dateSearchPrecision !== undefined
                ? { dateSearchPrecision: overrideItem.dateSearchPrecision }
                : {}),
        }
    })
}

export const extractCoreFieldOverrides = (
    designerFields: PageField[],
    coreFieldNames: Set<string>,
): CoreFieldOverride[] => designerFields
    .filter((fieldItem) => coreFieldNames.has(fieldItem.field))
    .map((fieldItem) => ({
        field: fieldItem.field,
        showInTable: fieldItem.showInTable,
        searchMode: fieldItem.searchMode,
        dateSearchPrecision: fieldItem.dateSearchPrecision,
    }))

export const prepareCoreFields = (fields: PageField[]): PageField[] =>
    fields.map((fieldItem, index) => ({
        ...fieldItem,
        key: fieldItem.key || `core-${fieldItem.field}`,
        locked: true,
        lockReason: 'core' as const,
        sort: index + 1,
    }))

export const getCoreFieldNames = (coreFields: PageField[]) =>
    new Set(coreFields.map((fieldItem) => fieldItem.field))

export const normalizeExtraFields = (fields: PageField[], coreFieldNames: Set<string>): PageField[] =>
    renumberFieldSort(
        fields
            .filter((fieldItem) => fieldItem.field && !coreFieldNames.has(fieldItem.field))
            .map((fieldItem) => ({
                ...fieldItem,
                key: fieldItem.key || createFieldKey(),
                locked: false,
                lockReason: undefined,
            })),
    )

export const applyFieldOrder = (fields: PageField[], fieldOrder: string[] = []): PageField[] => {
    if (!fieldOrder.length) {
        return renumberFieldSort(fields)
    }
    const fieldMap = new Map(fields.map((fieldItem) => [fieldItem.field, fieldItem]))
    const orderedFields: PageField[] = []
    const usedFieldNames = new Set<string>()
    fieldOrder.forEach((fieldName) => {
        const matchedField = fieldMap.get(fieldName)
        if (matchedField) {
            orderedFields.push(matchedField)
            usedFieldNames.add(fieldName)
        }
    })
    fields.forEach((fieldItem) => {
        if (!usedFieldNames.has(fieldItem.field)) {
            orderedFields.push(fieldItem)
        }
    })
    return renumberFieldSort(orderedFields)
}

export const mergeCoreAndExtraFields = (
    coreFields: PageField[],
    extraFields: PageField[],
    fieldOrder: string[] = [],
    coreFieldOverrides: CoreFieldOverride[] = [],
): PageField[] => {
    const mergedCoreFields = applyCoreFieldOverrides(coreFields, coreFieldOverrides)
    const preparedCore = prepareCoreFields(mergedCoreFields)
    const coreFieldNames = getCoreFieldNames(preparedCore)
    const normalizedExtra = normalizeExtraFields(extraFields, coreFieldNames)
    const merged = [...preparedCore, ...normalizedExtra]
    return schemaToFormFields(applyFieldOrder(merged, fieldOrder))
}

export const buildDesignerFields = (
    coreFields: PageField[],
    extraFields: PageField[],
    fieldOrder: string[] = [],
    coreFieldOverrides: CoreFieldOverride[] = [],
): PageField[] => {
    const mergedCoreFields = applyCoreFieldOverrides(coreFields, coreFieldOverrides)
    const preparedCore = prepareCoreFields(mergedCoreFields)
    const coreFieldNames = getCoreFieldNames(preparedCore)
    const normalizedExtra = normalizeExtraFields(extraFields, coreFieldNames)
    return applyFieldOrder([...preparedCore, ...normalizedExtra], fieldOrder)
}

export const splitDesignerFields = (
    designerFields: PageField[],
    coreFieldNames: Set<string>,
) => {
    const fieldOrder = designerFields.map((fieldItem) => fieldItem.field)
    const extraFields = normalizeExtraFields(
        designerFields.filter((fieldItem) => !coreFieldNames.has(fieldItem.field)),
        coreFieldNames,
    )
    const coreFieldOverrides = extractCoreFieldOverrides(designerFields, coreFieldNames)
    return { extraFields, fieldOrder, coreFieldOverrides }
}

export const pickExtraFieldValues = (
    payload: Record<string, unknown>,
    coreFieldNames: Set<string>,
) => {
    const extras: Record<string, unknown> = {}
    Object.entries(payload).forEach(([fieldName, fieldValue]) => {
        if (!coreFieldNames.has(fieldName)) {
            extras[fieldName] = fieldValue
        }
    })
    return extras
}

export const stripExtraFieldValues = (
    payload: Record<string, unknown>,
    coreFieldNames: Set<string>,
) => {
    const corePayload: Record<string, unknown> = {}
    Object.entries(payload).forEach(([fieldName, fieldValue]) => {
        if (coreFieldNames.has(fieldName)) {
            corePayload[fieldName] = fieldValue
        }
    })
    return corePayload
}
