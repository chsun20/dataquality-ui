// 使用 Node.js 18+ 内置测试运行器；复用项目现有 Babel 与 Vue 编译器，不依赖服务或数据库。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const babel = require('@babel/core')
const compiler = require('vue-template-compiler')
const Vue = require('vue')

const root = path.resolve(__dirname, '..')

function loadScript(source, dependencies = {}) {
  const { code } = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')]
  })
  const module = { exports: {} }
  const requireStub = name => {
    if (Object.prototype.hasOwnProperty.call(dependencies, name)) return dependencies[name]
    throw new Error('测试中未配置的依赖：' + name)
  }
  new Function('require', 'module', 'exports', code)(requireStub, module, module.exports)
  return module.exports
}

const quality = loadScript(fs.readFileSync(path.join(root, 'src/utils/quality.js'), 'utf8'))

function loadComponent(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const sfc = compiler.parseComponent(source)
  const compiled = compiler.compile(sfc.template.content)
  assert.deepEqual(compiled.errors, [], file + ' 模板应能编译')
  const options = loadScript(sfc.script.content, {
    '@/utils/quality': quality,
    '@/api/dqservice/rule': {},
    '@/api/dqservice/report': {},
    '@/api/dqservice/ruleTemplate': {},
    '@/api/dqservice/dataSource': {},
    '@/api/dqservice/task': {},
    '@/components/Crontab': {},
    '@/utils/permission': { checkPermi: () => true },
    './report/EvaluationDetail': {},
    './EvaluationDetail': {},
    '../report/EvaluationDetail': {},
    '@/views/rules/accuracy/DataSelect': {},
    '@/views/rules/accuracy/RuleSelect': {},
    '@/views/rules/accuracy/Configuration': {},
    ...dependencies
  }).default
  return { options, compiled }
}

function createVm(component) {
  return new Vue({
    ...component.options,
    created: [],
    methods: { ...component.options.methods, parseTime: () => '' },
    render: new Function(component.compiled.render),
    staticRenderFns: component.compiled.staticRenderFns.map(code => new Function(code))
  })
}

function findNodes(vnode, predicate) {
  if (!vnode) return []
  const own = predicate(vnode) ? [vnode] : []
  return own.concat((vnode.children || []).flatMap(child => findNodes(child, predicate)))
}

function nodeText(node) {
  return (node.text || '') + (node.children || []).map(nodeText).join('')
}

for (const record of [{}, { totalRows: 10 }, { totalRows: 10, passRate: null },
  { totalRows: 10, passRate: 'invalid' }, { totalRows: 10, passRate: -1 },
  { totalRows: 10, passRate: 101 }]) {
  test('缺失或非法通过率不伪装成 0%：' + JSON.stringify(record), () => {
    assert.equal(quality.rateText(record), '未评价')
    assert.equal(quality.rateTagType(record), 'info')
  })
}

for (const rate of [null, 0, 100, undefined]) {
  test('空表含新旧通过率时均不评价：' + rate, () => {
    const record = { totalRows: 0, passRate: rate }
    assert.equal(quality.rateText(record), '无数据／不评价')
    assert.equal(quality.rateTagType(record), 'info')
    assert.equal(quality.emptyViolationText(record), '无数据／不评价')
  })
}

for (const [rate, text, color] of [[0, '0.0%', 'danger'], [59.9, '59.9%', 'danger'],
  [60, '60.0%', 'warning'], [90, '90.0%', 'success'], [100, '100.0%', 'success'],
  ['66.7', '66.7%', 'warning']]) {
  test('有数据时保留正确的一位小数通过率：' + rate, () => {
    assert.equal(quality.rateText({ totalRows: 10, passRate: rate }), text)
    assert.equal(quality.rateTagType({ totalRows: 10, passRate: rate }), color)
  })
}

test('NULL、空字符串、纯空白与有效零值分别展示', () => {
  for (const [value, expected] of [[null, 'NULL'], [undefined, '—'], ['', '空字符串（""）'],
    [' \t', '纯空白字符串（2 字符）'], [0, '0'], [false, 'false'], ['正常', '正常']]) {
    assert.equal(quality.fieldValueText(value), expected)
  }
})

test('质量维度与规则类型分离，未知或自定义显示未分类', () => {
  assert.equal(quality.dimensionsText(['完整性', '唯一性']), '完整性、唯一性')
  assert.equal(quality.dimensionsText([]), '未分类')
  assert.equal(quality.dimensionsText(undefined), '未分类')
})

test('未加载、无数据与有数据未检出违规的提示不同', () => {
  assert.equal(quality.emptyViolationText({}), '暂无检测结果')
  assert.equal(quality.emptyViolationText({ totalRows: 10 }), '本次扫描未发现违规')
})

test('即时结果和报告详情实际渲染相同通过率，不给无数据追加百分号', () => {
  const rules = createVm(loadComponent('src/views/rules/Rules.vue'))
  const report = createVm(loadComponent('src/views/rules/report/index.vue'))
  try {
    for (const record of [{ totalRows: 0, passRate: 100 }, { totalRows: 10, passRate: 0 },
      { totalRows: 3, passRate: 66.7 }, { totalRows: 10, passRate: null }]) {
      rules.execResult = { ...record, violations: [], fieldStats: [] }
      report.detail = { ...record, violations: [], fieldStats: [] }
      for (const vm of [rules, report]) {
        const tags = findNodes(vm._render(), node => node.tag === 'el-tag')
        const rateTag = tags.find(node => node.data.attrs.size === 'medium')
        assert.ok(rateTag)
        assert.equal(nodeText(rateTag), quality.rateText(record))
        assert.equal(rateTag.data.attrs.type, quality.rateTagType(record))
      }
    }
    assert.equal(rules.statisticsNote, report.statisticsNote)
    for (const value of [null, '', ' ', 0]) {
      assert.equal(rules.fieldValueText(value), report.fieldValueText(value))
    }
  } finally {
    rules.$destroy()
    report.$destroy()
  }
})

test('历史报告列表的作用域插槽也使用完整报告判断空数据', () => {
  const vm = createVm(loadComponent('src/views/rules/report/index.vue'))
  try {
    const column = findNodes(vm._render(), node => node.tag === 'el-table-column' &&
      node.data.attrs.label === '行通过率')[0]
    assert.ok(column)
    const nodes = column.data.scopedSlots.default({ row: { totalRows: 0, passRate: 100 } })
    assert.equal(nodes.map(nodeText).join('').trim(), '无数据／不评价')
  } finally {
    vm.$destroy()
  }
})

test('维度 API 使用新接口，不更改模板清单路径', async () => {
  const requests = []
  const api = loadScript(fs.readFileSync(path.join(root, 'src/api/dqservice/ruleTemplate.js'), 'utf8'), {
    '@/utils/request': config => { requests.push(config); return Promise.resolve({ data: [] }) }
  })
  await api.listRuleTemplate()
  await api.listQualityDimensions()
  assert.deepEqual(requests.map(item => [item.url, item.method]), [
    ['/dqservice/rule/template/list', 'get'], ['/dqservice/rule/template/dimensions', 'get']
  ])
})

test('维度定义加载失败可重试，成功后使用后端覆盖数据', async () => {
  let reject = true
  const dimensions = [{ code: 'ACCURACY', name: '准确性', description: '真实事实', templates: [] }]
  const { options } = loadComponent('src/views/rules/accuracy/RuleSelect.vue', {
    '@/api/dqservice/ruleTemplate': {
      listQualityDimensions: () => reject ? Promise.reject(new Error('测试失败')) : Promise.resolve({ data: dimensions })
    }
  })
  const state = options.data()
  await options.methods.loadDimensions.call(state)
  assert.equal(state.dimensionsFailed, true)
  assert.equal(state.dimensionsLoading, false)
  reject = false
  await options.methods.loadDimensions.call(state)
  assert.equal(state.dimensionsFailed, false)
  assert.equal(state.dimensionsLoading, false)
  assert.deepEqual(state.dimensions, dimensions)
})

for (const [status, expected, color] of [['FAILED', '执行失败', 'danger'], ['PARTIAL', '未完整评价', 'warning'], ['NO_DATA', '无数据／不评价', 'info']]) {
  test(status + ' 优先于旧通过率并不伪装为成功', () => {
    for (const totalRows of [0, 10]) {
      const record = { evaluationStatus: status, totalRows, passRate: 100 }
      assert.equal(quality.rateText(record), expected)
      assert.equal(quality.rateTagType(record), color)
    }
  })
}

for (const file of ['dataAssets/DataSourceList.vue', 'rules/accuracy/DataSelect.vue', 'rules/accuracy/index.vue', 'rules/accuracy/Configuration.vue', 'rules/report/EvaluationDetail.vue', 'rules/task/index.vue']) {
  test(file + ' 页面模板及脚本可编译', () => { loadComponent('src/views/' + file) })
}

test('任务 Cron 生成器只接受六段，七段年份为 * 时自动截断', () => {
  const { options } = loadComponent('src/views/rules/task/index.vue')
  const vm = { form: { cronExpression: '' }, warnings: [], $message: { warning(msg) { vm.warnings.push(msg) } } }
  options.methods.crontabFill.call(vm, '0 0 2 * * ? *')
  assert.equal(vm.form.cronExpression, '0 0 2 * * ?')
  options.methods.crontabFill.call(vm, '0 0 2 * * ? 2027')
  assert.equal(vm.form.cronExpression, '0 0 2 * * ?')
  assert.equal(vm.warnings.length, 1)
})

test('任务提交把内置数据源映射为 null，外部数据源提交数字ID', () => {
  const { options } = loadComponent('src/views/rules/task/index.vue')
  assert.equal(options.methods.payload.call({ form: { sourceKey: 'local', taskName: 't' } }).sourceId, null)
  assert.equal(options.methods.payload.call({ form: { sourceKey: '12' } }).sourceId, 12)
  assert.equal(Object.hasOwn(options.methods.payload.call({ form: { sourceKey: 'local' } }), 'sourceKey'), false)
})

test('任务运行状态文字与标签语义一致，未知状态不伪装成功', () => {
  const { options } = loadComponent('src/views/rules/task/index.vue')
  const vm = {}
  for (const [status, text, type] of [['RUNNING', '运行中', 'warning'], ['SUCCESS', '成功', 'success'],
    ['PARTIAL', '部分完成', 'warning'], ['NO_DATA', '无数据', 'info'], ['FAILED', '失败', 'danger'],
    ['SKIPPED', '已跳过', 'info'], [undefined, '—', 'info']]) {
    assert.equal(options.methods.runStatusText.call(vm, status), text)
    assert.equal(options.methods.runStatusType.call(vm, status), type)
  }
})

test('同表字段候选使用完整元数据且按类型过滤，组合字段按 JSON 数组读写', () => {
  const { options } = loadComponent('src/views/rules/accuracy/RuleSelect.vue')
  const vm = { droolsRule: { allColumns: [{ name: 'amount', type: 'decimal' }, { name: 'other', type: 'int' }, { name: 'name', type: 'varchar' }],
    cols: [{ name: 'amount', type: 'decimal', rules: ['compositeUnique'], params: { compositeUnique: { fields: '["amount","name"]' } } }] } }
  for (const [k, v] of Object.entries(options.methods)) vm[k] = v.bind(vm)
  const row = { field: 'amount', colIndex: 0, code: 'compositeUnique' }
  assert.deepEqual(vm.fieldOptions(row, { key: 'otherField', type: 'field' }).map(c => c.name), ['other'])
  assert.deepEqual(vm.multiValue(row, { key: 'fields' }), ['amount', 'name'])
  assert.equal(vm.supports('notBlank', 'int'), false)
  assert.equal(vm.supports('freshness', 'date'), false)
  assert.equal(vm.supports('freshness', 'timestamp'), true)
})

test('切换数据源后过期表请求不覆盖新结果', async () => {
  const pending = []
  const { options } = loadComponent('src/views/rules/accuracy/DataSelect.vue', {
    '@/api/dqservice/dataSource': { sourceTables: () => new Promise(resolve => pending.push(resolve)) }
  })
  const vm = { droolsRule: { sourceId: 1, dbName: '', cols: [] } }
  Object.assign(vm, options.data.call(vm))
  for (const [k, v] of Object.entries(options.methods)) vm[k] = v.bind(vm)
  const first = vm.searchTables('old')
  vm.droolsRule.sourceId = 2
  const second = vm.searchTables('new')
  pending[1]({ data: { rows: [{ tableName: 'new' }], total: 1, databaseName: 'new_db' } })
  await second
  pending[0]({ data: { rows: [{ tableName: 'old' }], total: 99, databaseName: 'old_db' } })
  await first
  assert.equal(vm.tables[0].tableName, 'new')
  assert.equal(vm.droolsRule.dbName, 'new_db')
  assert.equal(vm.tableTotal, 1)
})

test('连接编辑留空不提交密码，输入密码才替换', () => {
  const { options } = loadComponent('src/views/dataAssets/DataSourceList.vue')
  assert.equal(Object.hasOwn(options.methods.payload.call({ form: { id: 1, password: '', configured: true } }), 'password'), false)
  assert.equal(options.methods.payload.call({ form: { id: 1, password: 'test-only' } }).password, 'test-only')
})

test('向导只提交可持久化配置且阻止重复提交', async () => {
  const saved = []
  let resolveSave
  const { options } = loadComponent('src/views/rules/accuracy/index.vue', {
    '@/api/dqservice/rule': { addRule: payload => { saved.push(payload); return new Promise(resolve => { resolveSave = resolve }) } }
  })
  const vm = { submitting: false, droolsRule: { ruleName: '测试规则', ruleDescription: '旧页面无效字段', sourceId: 1, cols: [] },
    $message: { success() {} }, $router: { push() {} } }
  options.methods.commit.call(vm)
  options.methods.commit.call(vm)
  assert.equal(saved.length, 1)
  assert.equal(saved[0].sourceId, 1)
  assert.equal(Object.hasOwn(saved[0], 'ruleDescription'), false)
  assert.equal(vm.submitting, true)
  resolveSave({})
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(vm.submitting, false)
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/views/rules/accuracy/Configuration.vue'), 'utf8'), /v-model="droolsRule.ruleDescription"/)
})

test('新状态和快照兼容历史缺失与损坏 JSON', () => {
  assert.equal(quality.evaluationText({}), '历史未记录')
  assert.equal(quality.evaluationText({ evaluationStatus: 'PARTIAL' }), '未完整评价')
  assert.deepEqual(quality.parseQualityJson('{broken', []), [])
  assert.match(quality.emptyViolationText({ evaluationStatus: 'FAILED', totalRows: 0 }), /不能据此/)
})
