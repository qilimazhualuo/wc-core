import type { FieldInputType, FieldInputTypeOption, FieldLockReason } from '../types/schema'
import type { PageField } from '../types/field'

export const DEFAULT_INPUT_TYPE_OPTIONS: FieldInputTypeOption[] = [
    { label: '文本框', value: 'input' },
    { label: '文本域', value: 'textarea' },
    { label: '数字框', value: 'number' },
    { label: '下拉框', value: 'select' },
    { label: '单选框', value: 'radio' },
    { label: '复选框', value: 'checkbox' },
    { label: '日期', value: 'date' },
    { label: '日期时间', value: 'datetime' },
    { label: '开关', value: 'switch' },
    { label: '空间几何', value: 'geom' },
]

export const AUDIT_FIELD_DEFS: Array<{
    field: string
    title: string
    dbType: string
    inputType: FieldInputType
}> = [
    { field: 'create_by', title: '创建人', dbType: 'varchar(255)', inputType: 'input' },
    { field: 'create_time', title: '创建时间', dbType: 'timestamp', inputType: 'datetime' },
    { field: 'update_by', title: '更新人', dbType: 'varchar(255)', inputType: 'input' },
    { field: 'update_time', title: '更新时间', dbType: 'timestamp', inputType: 'datetime' },
]

export const AUDIT_COLUMN_NAMES = new Set(
    AUDIT_FIELD_DEFS.map((fieldItem) => fieldItem.field.toLowerCase()),
)

export const isAuditColumn = (fieldName: string) =>
    AUDIT_COLUMN_NAMES.has(fieldName.trim().toLowerCase())

export const isShowInTable = (fieldItem: PageField) =>
    fieldItem.showInTable !== false
    && fieldItem.inputType !== 'geom'
    && fieldItem.lockReason !== 'geometry'

export const resolveLockReason = (options: {
    isPrimaryKey?: boolean
    isGeometry?: boolean
    isAudit?: boolean
}): FieldLockReason | undefined => {
    if (options.isGeometry) {
        return 'geometry'
    }
    if (options.isPrimaryKey) {
        return 'pk'
    }
    if (options.isAudit) {
        return 'audit'
    }
    return undefined
}

export const guessInputType = (
    fieldName: string,
    dbType?: string,
    isGeometry = false,
): FieldInputType => {
    if (isGeometry) {
        return 'geom'
    }
    if (isAuditColumn(fieldName)) {
        const auditDef = AUDIT_FIELD_DEFS.find(
            (item) => item.field.toLowerCase() === fieldName.trim().toLowerCase(),
        )
        if (auditDef) {
            return auditDef.inputType
        }
    }
    const normalizedType = (dbType || '').toLowerCase()
    if (normalizedType.includes('bool')) {
        return 'switch'
    }
    if (normalizedType.includes('timestamp') || normalizedType.includes('datetime')) {
        return 'datetime'
    }
    if (normalizedType === 'date') {
        return 'date'
    }
    if (
        normalizedType.includes('int')
        || normalizedType.includes('numeric')
        || normalizedType.includes('decimal')
        || normalizedType.includes('double')
        || normalizedType.includes('real')
        || normalizedType.includes('float')
    ) {
        return 'number'
    }
    if (normalizedType.includes('text') || normalizedType.includes('json')) {
        return 'textarea'
    }
    return 'input'
}

export const resolveFieldInputType = (fieldItem: PageField): FieldInputType => {
    if (fieldItem.inputType) {
        return fieldItem.inputType
    }
    const dataType = fieldItem.dataType?.type || ''
    if (dataType === 'domain' || dataType === 'select' || dataType === 'radio') {
        return 'select'
    }
    if (dataType === 'multipleSelect' || dataType === 'checkbox') {
        return 'checkbox'
    }
    if (dataType === 'number' || dataType === 'longitude' || dataType === 'latitude' || dataType === 'mapZoom') {
        return 'number'
    }
    if (dataType === 'date' || dataType === 'time' || dataType === 'rTime') {
        return dataType === 'date' ? 'date' : 'datetime'
    }
    if (dataType === 'switch') {
        return 'switch'
    }
    if (dataType === 'textArea') {
        return 'textarea'
    }
    if (dataType === 'tree' || dataType === 'treeSelect' || dataType === 'unit' || dataType === 'user') {
        return 'select'
    }
    return 'input'
}

export const createFieldKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `field_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

export const renumberFieldSort = (fields: PageField[]): PageField[] =>
    fields.map((field, index) => ({
        ...field,
        sort: index + 1,
    }))

export const ensureAuditFields = (fields: PageField[]): PageField[] => {
    const withAuditLock = fields.map((fieldItem) => {
        if (!isAuditColumn(fieldItem.field)) {
            return fieldItem
        }
        if (fieldItem.lockReason === 'geometry' || fieldItem.lockReason === 'pk') {
            return fieldItem
        }
        return {
            ...fieldItem,
            locked: true,
            lockReason: 'audit' as FieldLockReason,
        }
    })
    const existingNames = new Set(
        withAuditLock.map((fieldItem) => fieldItem.field.trim().toLowerCase()),
    )
    const missingFields = AUDIT_FIELD_DEFS
        .filter((auditField) => !existingNames.has(auditField.field.toLowerCase()))
        .map((auditField, index) => ({
            key: createFieldKey(),
            field: auditField.field,
            title: auditField.title,
            comment: auditField.title,
            dbType: auditField.dbType,
            inputType: auditField.inputType,
            required: false,
            showInTable: true,
            searchMode: 'none' as const,
            sort: withAuditLock.length + index + 1,
            locked: true,
            lockReason: 'audit' as FieldLockReason,
        }))
    if (!missingFields.length) {
        return renumberFieldSort(withAuditLock)
    }
    return renumberFieldSort([...withAuditLock, ...missingFields])
}

export const resolvePrimaryKeyField = (fields: PageField[]): string | null => {
    const matched = fields.find(
        (fieldItem) => fieldItem.lockReason === 'pk' && fieldItem.field.trim(),
    )
    return matched?.field.trim() || null
}

export const applyPrimaryKeyField = (
    fields: PageField[],
    fieldName: string | null,
): PageField[] => {
    const targetName = (fieldName || '').trim().toLowerCase()
    return fields.map((fieldItem) => {
        if (
            fieldItem.lockReason === 'geometry'
            || fieldItem.lockReason === 'audit'
            || fieldItem.inputType === 'geom'
            || isAuditColumn(fieldItem.field)
        ) {
            return fieldItem
        }
        const isTarget = !!targetName
            && fieldItem.field.trim().toLowerCase() === targetName
        if (isTarget) {
            return {
                ...fieldItem,
                locked: true,
                lockReason: 'pk' as FieldLockReason,
                required: true,
            }
        }
        if (fieldItem.lockReason === 'pk') {
            return {
                ...fieldItem,
                locked: false,
                lockReason: undefined,
            }
        }
        return fieldItem
    })
}
