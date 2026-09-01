import type {
    DateSearchPrecision,
    FieldInputType,
    FieldSearchMode,
    PageTableFilter,
} from '../types/schema'
import type { PageField } from '../types/field'
import { resolveFieldInputType } from './fieldRules'

export type SearchModeOption = {
    label: string
    value: FieldSearchMode
}

export type DatePrecisionOption = {
    label: string
    value: DateSearchPrecision
}

const NONE_OPTION: SearchModeOption = { label: '不搜索', value: 'none' }

export const DATE_PRECISION_FORMAT: Record<DateSearchPrecision, string> = {
    year: 'YYYY',
    month: 'YYYY-MM',
    day: 'YYYY-MM-DD',
    hour: 'YYYY-MM-DD HH',
    minute: 'YYYY-MM-DD HH:mm',
    second: 'YYYY-MM-DD HH:mm:ss',
}

export const getSearchModeOptions = (inputType: FieldInputType): SearchModeOption[] => {
    if (inputType === 'geom') {
        return [NONE_OPTION]
    }
    if (inputType === 'number') {
        return [
            NONE_OPTION,
            { label: '数字', value: 'number' },
            { label: '数字范围', value: 'numberRange' },
        ]
    }
    if (inputType === 'date') {
        return [
            NONE_OPTION,
            { label: '日期', value: 'date' },
            { label: '日期范围', value: 'dateRange' },
        ]
    }
    if (inputType === 'datetime') {
        return [
            NONE_OPTION,
            { label: '日期时间', value: 'datetime' },
            { label: '日期时间范围', value: 'datetimeRange' },
        ]
    }
    if (inputType === 'select' || inputType === 'radio') {
        return [
            NONE_OPTION,
            { label: '单选', value: 'select' },
            { label: '多选', value: 'selectMultiple' },
        ]
    }
    if (inputType === 'switch' || inputType === 'checkbox') {
        return [
            NONE_OPTION,
            { label: '是/否', value: 'boolean' },
        ]
    }
    return [
        NONE_OPTION,
        { label: '文本', value: 'text' },
    ]
}

export const getDatePrecisionOptions = (inputType: FieldInputType): DatePrecisionOption[] => {
    const dateOptions: DatePrecisionOption[] = [
        { label: '年', value: 'year' },
        { label: '年月', value: 'month' },
        { label: '年月日', value: 'day' },
    ]
    if (inputType !== 'datetime') {
        return dateOptions
    }
    return [
        ...dateOptions,
        { label: '年月日时', value: 'hour' },
        { label: '年月日时分', value: 'minute' },
        { label: '年月日时分秒', value: 'second' },
    ]
}

export const defaultDatePrecision = (inputType: FieldInputType): DateSearchPrecision =>
    inputType === 'datetime' ? 'second' : 'day'

export const isDateSearchMode = (searchMode?: FieldSearchMode) =>
    searchMode === 'date'
    || searchMode === 'dateRange'
    || searchMode === 'datetime'
    || searchMode === 'datetimeRange'

export const isSearchEnabled = (fieldItem: PageField) => {
    const searchMode = fieldItem.searchMode || 'none'
    return searchMode !== 'none'
        && fieldItem.inputType !== 'geom'
        && fieldItem.lockReason !== 'geometry'
}

export const normalizeSearchMode = (
    inputType: FieldInputType,
    searchMode?: FieldSearchMode,
): FieldSearchMode => {
    const allowed = new Set(getSearchModeOptions(inputType).map((optionItem) => optionItem.value))
    if (searchMode && allowed.has(searchMode)) {
        return searchMode
    }
    return 'none'
}

export const resolveDatePrecision = (fieldItem: PageField): DateSearchPrecision => {
    const precision = fieldItem.dateSearchPrecision
    const inputType = resolveFieldInputType(fieldItem)
    const allowed = new Set(
        getDatePrecisionOptions(inputType).map((optionItem) => optionItem.value),
    )
    if (precision && allowed.has(precision)) {
        return precision
    }
    return defaultDatePrecision(inputType)
}

export const getDatePickerConfig = (precision: DateSearchPrecision) => {
    if (precision === 'year') {
        return { picker: 'year' as const, showTime: false, format: DATE_PRECISION_FORMAT.year }
    }
    if (precision === 'month') {
        return { picker: 'month' as const, showTime: false, format: DATE_PRECISION_FORMAT.month }
    }
    if (precision === 'hour') {
        return {
            picker: 'date' as const,
            showTime: { format: 'HH' },
            format: DATE_PRECISION_FORMAT.hour,
        }
    }
    if (precision === 'minute') {
        return {
            picker: 'date' as const,
            showTime: { format: 'HH:mm' },
            format: DATE_PRECISION_FORMAT.minute,
        }
    }
    if (precision === 'second') {
        return {
            picker: 'date' as const,
            showTime: { format: 'HH:mm:ss' },
            format: DATE_PRECISION_FORMAT.second,
        }
    }
    return { picker: 'date' as const, showTime: false, format: DATE_PRECISION_FORMAT.day }
}

const isEmptySearchValue = (rawValue: unknown):boolean => {
    if (rawValue == null) {
        return true
    }
    if (typeof rawValue === 'string') {
        return rawValue.trim() === ''
    }
    if (Array.isArray(rawValue)) {
        return rawValue.every((item) => isEmptySearchValue(item))
    }
    return false
}

export const buildTableFilters = (
    fields: PageField[],
    searchValues: Record<string, unknown>,
): PageTableFilter[] => {
    const filters: PageTableFilter[] = []
    fields.filter(isSearchEnabled).forEach((fieldItem) => {
        const searchMode = fieldItem.searchMode || 'none'
        const rawValue = searchValues[fieldItem.field]
        if (isEmptySearchValue(rawValue)) {
            return
        }
        const filterItem: PageTableFilter = {
            field: fieldItem.field,
            searchMode,
        }
        if (isDateSearchMode(searchMode)) {
            filterItem.dateSearchPrecision = resolveDatePrecision(fieldItem)
        }
        if (searchMode === 'numberRange' || searchMode === 'dateRange' || searchMode === 'datetimeRange') {
            const rangeValue = Array.isArray(rawValue) ? rawValue : [null, null]
            filterItem.min = rangeValue[0]
            filterItem.max = rangeValue[1]
            if (isEmptySearchValue(filterItem.min) && isEmptySearchValue(filterItem.max)) {
                return
            }
        } else {
            filterItem.value = rawValue
        }
        filters.push(filterItem)
    })
    return filters
}
