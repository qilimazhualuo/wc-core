export type FieldInputType =
    | 'input'
    | 'textarea'
    | 'number'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'datetime'
    | 'switch'
    | 'geom'

export type FieldLockReason = 'geometry' | 'pk' | 'audit' | 'core'

export type FieldSearchMode =
    | 'none'
    | 'text'
    | 'number'
    | 'numberRange'
    | 'date'
    | 'dateRange'
    | 'datetime'
    | 'datetimeRange'
    | 'select'
    | 'selectMultiple'
    | 'boolean'

export type DateSearchPrecision = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'

export type PageSchema = {
    tableName: string
    comment?: string
    fields: import('./field').PageField[]
}

export type PageTableOption = {
    name: string
    comment?: string
    geometryKind?: string | null
    hasGeometry?: boolean
}

export type FieldInputTypeOption = {
    label: string
    value: FieldInputType
}

export type PageTableRow = {
    id: string
    attributes: Record<string, unknown>
}

export type PageTablePage = {
    fields?: import('./field').PageField[]
    items: PageTableRow[]
    total: number
}

export type PageTableFilter = {
    field: string
    searchMode: FieldSearchMode
    value?: unknown
    min?: unknown
    max?: unknown
    dateSearchPrecision?: DateSearchPrecision
}

export type PageTableLoadParams = {
    tableName: string
    page: number
    pageSize: number
    filters?: PageTableFilter[]
}

export type PageTableLoadData = (
    params: PageTableLoadParams,
) => Promise<PageTablePage>
