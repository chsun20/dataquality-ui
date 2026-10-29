// 即时执行与历史报告共用口径，避免把空数据或缺失值显示成 0%／100%。
export const QUALITY_STATISTICS_NOTE = '违规条数按检查命中累计，同一行可有多条；违规行数按本次扫描行号去重。行通过率 =（实际扫描行数 − 违规行数）÷ 实际扫描行数 × 100%，保留一位小数。结果仅代表本次扫描范围和所选规则，不是整表评分或检测精确率；无数据不评价。'

function hasRate(record) {
  return (!record.evaluationStatus || record.evaluationStatus === 'SUCCESS') &&
    record.totalRows != null && Number(record.totalRows) > 0 &&
    record.passRate != null && record.passRate !== '' &&
    Number.isFinite(Number(record.passRate)) &&
    Number(record.passRate) >= 0 && Number(record.passRate) <= 100
}

export function rateText(record = {}) {
  if (record.evaluationStatus === 'FAILED') return '执行失败'
  if (record.evaluationStatus === 'PARTIAL') return '未完整评价'
  if (record.evaluationStatus === 'REQUEST_ERROR') return '请求失败／未评价'
  if (record.evaluationStatus === 'NO_DATA') return '无数据／不评价'
  if (record.totalRows != null && Number(record.totalRows) === 0) return '无数据／不评价'
  return hasRate(record) ? Number(record.passRate).toFixed(1) + '%' : '未评价'
}

export function rateTagType(record = {}) {
  if (record.evaluationStatus === 'FAILED' || record.evaluationStatus === 'REQUEST_ERROR') return 'danger'
  if (record.evaluationStatus === 'PARTIAL') return 'warning'
  if (!hasRate(record)) return 'info'
  const rate = Number(record.passRate)
  if (rate >= 90) return 'success'
  if (rate >= 60) return 'warning'
  return 'danger'
}

export function fieldValueText(value) {
  if (value === null) return 'NULL'
  if (value === undefined) return '—'
  if (value === '') return '空字符串（""）'
  if (typeof value === 'string' && value.trim() === '') return '纯空白字符串（' + value.length + ' 字符）'
  return String(value)
}

export function evaluationText(record = {}) {
  return ({ SUCCESS: '评价完成', PARTIAL: '未完整评价', NO_DATA: '无数据／不评价', FAILED: '执行失败', REQUEST_ERROR: '请求失败' })[record.evaluationStatus] || '历史未记录'
}

export function parseQualityJson(value, fallback = null) {
  try { return typeof value === 'string' ? JSON.parse(value) : value || fallback } catch (e) { return fallback }
}

export function dimensionsText(dimensions) {
  return Array.isArray(dimensions) && dimensions.length ? dimensions.join('、') : '未分类'
}

export function emptyViolationText(record = {}) {
  if (record.evaluationStatus === 'FAILED' || record.evaluationStatus === 'REQUEST_ERROR') return '执行未完成，不能据此判断有无违规'
  if (record.evaluationStatus === 'PARTIAL') return '存在无法核验项，不代表全部通过'
  if (record.totalRows == null) return '暂无检测结果'
  return Number(record.totalRows) === 0 ? '无数据／不评价' : '本次扫描未发现违规'
}
