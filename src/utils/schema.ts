import type { FieldInputType } from '../types/schema'
import type { FieldDataType, PageField, SearchField } from '../types/field'
import type { PageTableFilter } from '../types/schema'
import { isSearchEnabled } from './searchFields'
import { getDatePickerConfig, resolveDatePrecision } from './searchFields'
import { resolveFieldInputType } from './fieldRules'

const INPUT_TYPE_MAP: Record<FieldInputType, string> = {
    input: 'text',
    textarea: 'textArea',
    number: 'number',
    select: 'select',
    radio: 'radio',
    checkbox: 'checkbox',
    date: 'date',
    datetime: 'date',
    switch: 'switch',
    geom: 'geom',
}

const inputTypeToDataType = (fieldItem: PageField): FieldDataType | undefined => {
    if (!fieldItem.inputType) {
        return fieldItem.dataType
    }
    const baseType = INPUT_TYPE_MAP[fieldItem.inputType]
    const dataType: FieldDataType = {
        type: baseType,
        ...(fieldItem.options ? { options: fieldItem.options } : {}),
    }
    if (fieldItem.inputType === 'datetime') {
        dataType.showTime = true
    }
    if (fieldItem.dictType) {
        dataType.type = 'domain'
        dataType.dataMark = fieldItem.dictType
    }
    return dataType
}

const shouldHideInForm = (fieldItem: PageField) =>
    fieldItem.lockReason === 'pk'
    || fieldItem.lockReason === 'geometry'
    || fieldItem.inputType === 'geom'

export const normalizeSchemaField = (rawField: Record<string, unknown>): PageField => ({
    ...(rawField as PageField),
    field: String(rawField.field || rawField.columnName || ''),
    title: String(rawField.title || rawField.label || rawField.field || rawField.columnName || ''),
})

export const normalizeSchemaFields = (fields: Array<Record<string, unknown> | PageField>): PageField[] =>
    fields.map((fieldItem) => normalizeSchemaField(fieldItem as Record<string, unknown>))

export const serializeSchemaField = (fieldItem: PageField) => ({
    ...fieldItem,
    columnName: fieldItem.field,
    label: fieldItem.title,
})

export const serializeSchemaFields = (fields: PageField[]) =>
    fields.map((fieldItem) => serializeSchemaField(fieldItem))

export const schemaToTableFields = (fields: PageField[]): PageField[] =>
    fields
        .filter((fieldItem) => fieldItem.showInTable !== false
            && fieldItem.inputType !== 'geom'
            && fieldItem.lockReason !== 'geometry')
        .map((fieldItem, index) => ({
            ...fieldItem,
            tableParams: fieldItem.tableParams ?? { index },
        }))

export const schemaToFormFields = (fields: PageField[]): PageField[] =>
    fields.map((fieldItem) => ({
        ...fieldItem,
        dataType: fieldItem.dataType ?? inputTypeToDataType(fieldItem),
        rules: fieldItem.rules ?? (fieldItem.required
            ? [{ required: true, message: `请输入${fieldItem.title}` }]
            : undefined),
        hiddenInForm: fieldItem.hiddenInForm ?? shouldHideInForm(fieldItem),
    }))

const resolveSearchFieldType = (fieldItem: PageField): string => {
    const searchMode = fieldItem.searchMode || 'none'
    const dataType = fieldItem.dataType?.type || ''
    if (searchMode === 'number' || searchMode === 'numberRange') {
        return 'number'
    }
    if (searchMode === 'date' || searchMode === 'datetime') {
        return 'date'
    }
    if (searchMode === 'dateRange' || searchMode === 'datetimeRange') {
        return 'range'
    }
    if (searchMode === 'select' || searchMode === 'selectMultiple') {
        return 'select'
    }
    if (searchMode === 'boolean') {
        return 'switch'
    }
    if (dataType === 'domain') {
        return 'domain'
    }
    const resolvedInputType = resolveFieldInputType(fieldItem)
    if (resolvedInputType === 'select' || resolvedInputType === 'radio' || resolvedInputType === 'checkbox') {
        return 'select'
    }
    if (resolvedInputType === 'switch') {
        return 'switch'
    }
    if (resolvedInputType === 'number') {
        return 'number'
    }
    if (resolvedInputType === 'date' || resolvedInputType === 'datetime') {
        return 'date'
    }
    return 'text'
}

export const schemaToSearchFields = (fields: PageField[]): SearchField[] =>
    fields
        .filter(isSearchEnabled)
        .map((fieldItem) => {
            const dataType = fieldItem.dataType || {}
            const searchType = resolveSearchFieldType(fieldItem)
            const searchField: SearchField = {
                field: fieldItem.field,
                searchField: fieldItem.field,
                title: fieldItem.title,
                type: searchType,
                options: fieldItem.options ?? dataType.options,
            }
            if (dataType.fieldNames) {
                searchField.fieldNames = dataType.fieldNames
            }
            if (dataType.dataMark) {
                searchField.dataMark = dataType.dataMark
            }
            if (searchType === 'date' || searchType === 'range') {
                const precision = resolveDatePrecision(fieldItem)
                const pickerConfig = getDatePickerConfig(precision)
                Object.assign(searchField, pickerConfig)
            }
            if (fieldItem.searchMode === 'datetime' || fieldItem.searchMode === 'datetimeRange') {
                searchField.showTime = true
            }
            return searchField
        })

export const resolvePageFields = (options: {
    fields?: PageField[]
    schema?: { fields: PageField[] } | null
}): PageField[] => {
    if (options.schema?.fields?.length) {
        return schemaToFormFields(normalizeSchemaFields(options.schema.fields))
    }
    return options.fields || []
}

export const resolveTableFields = (options: {
    fields?: PageField[]
    schema?: { fields: PageField[] } | null
}): PageField[] => {
    if (options.schema?.fields?.length) {
        return schemaToTableFields(normalizeSchemaFields(options.schema.fields))
    }
    return (options.fields || []).filter((fieldItem) => fieldItem.tableParams)
}

export const resolveSearchFields = (options: {
    searchFields?: SearchField[]
    schema?: { fields: PageField[] } | null
    fields?: PageField[]
}): SearchField[] => {
    if (options.schema?.fields?.length) {
        return schemaToSearchFields(normalizeSchemaFields(options.schema.fields))
    }
    if (options.searchFields?.length) {
        return options.searchFields
    }
    if (options.fields?.length) {
        return schemaToSearchFields(normalizeSchemaFields(options.fields))
    }
    return []
}

export const toApiTableFilters = (filters: PageTableFilter[]) =>
    filters.map(({ field, ...rest }) => ({
        ...rest,
        columnName: field,
    }))
