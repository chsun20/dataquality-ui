<template>
<div class="app-container">
  <el-alert
    title="规则口径"
    description="13 类模板覆盖六维度的代表性检查，不代表穷尽所有质量问题。空值检测只查 NULL，非空白检查也查空字符串与 Unicode 空白。字段比较、新鲜度和引用存在性跳过 NULL；可信参考值核验缺键、缺参考或值为 NULL 时记无法核验，不计作准确或错误。唯一性仅判断本次扫描，重复组全部行违规。固定日期区间属于有效性，不是时效性。"
    type="info"
    :closable="false"
    show-icon
    class="quality-note"
  />
  <el-collapse class="quality-note">
    <el-collapse-item title="质量维度定义与内置模板覆盖" name="dimensions">
      <p>以下说明内置模板的覆盖范围，不代表本次已检测所有维度；未检测维度不生成得分。</p>
      <div v-loading="dimensionsLoading">
        <div v-if="dimensionsFailed">
          维度定义加载失败。
          <el-button type="text" @click="loadDimensions">重试</el-button>
        </div>
        <el-table v-else :data="dimensions" size="small" border>
          <el-table-column label="维度" prop="name" width="90" />
          <el-table-column label="定义" prop="description" min-width="300" />
          <el-table-column label="当前内置模板" min-width="220">
            <template slot-scope="scope">
              <span>{{ scope.row.templates.length ? scope.row.templates.join('、') : '暂无内置模板' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-collapse-item>
  </el-collapse>
  <el-form>
    <el-table :data="droolsRule.cols">
      <el-table-column label="列名" prop="name" width="200"/>
      <el-table-column label="数据类型" prop="type" width="160"/>
      <el-table-column label="规则选择">
        <template slot-scope="scope">
          <el-select
            v-model="droolsRule.cols[scope.$index].rules"
            multiple
            placeholder="请选择规则模板"
            @change="handleRulesChange(scope.row)">
            <el-option
              v-for="item in templates"
              :key="item.code"
              :label="item.name + '（' + item.dimension + '）'"
              :value="item.code"
              :disabled="!supports(item.code, scope.row.type)"/>
          </el-select>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="paramRows.length" class="param-panel">
      <div class="param-title">规则参数</div>
      <el-table :data="paramRows" size="small" border>
        <el-table-column label="字段" prop="field" width="160"/>
        <el-table-column label="规则模板" prop="templateName" width="180"/>
        <el-table-column label="参数配置">
          <template slot-scope="scope">
            <div class="param-item" v-for="p in scope.row.params" :key="p.key">
              <span class="param-label">
                {{ p.label }}<em v-if="p.required" class="required">*</em>
              </span>
              <el-select v-if="p.type === 'field' || p.type === 'fields'" filterable
                :multiple="p.type === 'fields'" :multiple-limit="5"
                :value="p.type === 'fields' ? multiValue(scope.row, p) : paramValue(scope.row, p)"
                @change="val => setParamValue(scope.row, p, p.type === 'fields' ? JSON.stringify(val) : val)">
                <el-option v-for="c in fieldOptions(scope.row, p)" :key="c.name" :label="c.name + ' (' + c.type + ')'" :value="c.name" />
              </el-select>
              <el-select v-else-if="p.type === 'source'" filterable :value="paramValue(scope.row, p)" @change="val => setParamValue(scope.row, p, val)">
                <el-option v-for="s in sources" :key="s.id" :label="s.name + ' / ' + s.databaseName" :value="String(s.id)" />
              </el-select>
              <el-select v-else-if="p.type === 'referenceTable'" filterable remote
                :remote-method="text => loadReference(scope.row, text)" :loading="referenceState(scope.row).loading"
                :value="paramValue(scope.row, p)" @change="val => setParamValue(scope.row, p, val)">
                <el-option v-for="t in referenceState(scope.row).tables" :key="t.tableName" :label="t.tableName" :value="t.tableName" />
              </el-select>
              <el-select v-else-if="p.type === 'referenceKey' || p.type === 'referenceValue'" filterable
                :loading="referenceState(scope.row).loading" :value="paramValue(scope.row, p)" @change="val => setParamValue(scope.row, p, val)">
                <el-option v-for="c in referenceFields(scope.row, p)" :key="c.name" :label="c.name + ' (' + c.type + ')'" :value="c.name" />
              </el-select>
              <el-input
                v-else-if="p.type === 'text' || p.type === 'number' || !p.type"
                :placeholder="p.placeholder"
                size="small"
                style="width: 280px"
                :value="paramValue(scope.row, p)"
                @input="val => setParamValue(scope.row, p, val)"/>
              <el-date-picker
                v-else-if="p.type === 'date'"
                type="date"
                size="small"
                value-format="yyyy-MM-dd"
                :placeholder="p.placeholder || '选择日期'"
                :value="paramValue(scope.row, p)"
                @input="val => setParamValue(scope.row, p, val)"/>
              <el-select
                v-else-if="p.type === 'select'"
                size="small"
                style="width: 200px"
                :value="paramValue(scope.row, p)"
                @change="val => setParamValue(scope.row, p, val)">
                <el-option v-for="o in p.options" :key="o" :label="o" :value="o" :disabled="p.key === 'operator' && kind(droolsRule.cols[scope.row.colIndex].type) === 'TEXT' && !['EQ', 'NE'].includes(o)"/>
              </el-select>
            </div>
            <el-alert v-if="referenceState(scope.row).error" :title="referenceState(scope.row).error" type="error" :closable="false" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-row style="margin-top: 40px">
      <el-col :span="8" :offset="8">
        <el-button @click="back" type="primary">上一步</el-button>
      </el-col>
      <el-col :span="8">
        <el-button :loading="validating" :disabled="!templates.length" @click="commitRuleSelect" type="primary">下一步</el-button>
      </el-col>
    </el-row>
  </el-form>
</div>
</template>

<script>
import { listRuleTemplate, listQualityDimensions, previewRuleTemplate } from '@/api/dqservice/ruleTemplate'
import { sourceOptions, sourceTables, sourceColumns } from '@/api/dqservice/dataSource'
import { checkPermi } from '@/utils/permission'

export default {
  name: 'RuleSelect',
  props: {
    droolsRule: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      // 后端注册的规则模板
      templates: [],
      // code -> 模板定义，便于按编码取参数描述
      templateMap: {},
      dimensions: [],
      dimensionsLoading: true,
      dimensionsFailed: false,
      sources: [], referenceData: {}, validating: false
    }
  },
  computed: {
    // 需要填参数的「字段 + 模板」组合
    paramRows() {
      const rows = []
      const cols = this.droolsRule.cols || []
      cols.forEach((col, colIndex) => {
        (col.rules || []).forEach(code => {
          const tpl = this.templateMap[code]
          if (!tpl || !tpl.params || tpl.params.length === 0) return
          rows.push({
            colIndex: colIndex,
            field: col.name,
            code: code,
            templateName: tpl.name,
            params: tpl.params
          })
        })
      })
      return rows
    }
  },
  created() {
    // 兼容旧数据：cols 可能没有 rules / params 字段
    const cols = this.droolsRule.cols || []
    cols.forEach(col => {
      if (!col.rules) this.$set(col, 'rules', [])
      this.initColParams(col)
    })
    this.loadTemplates()
    this.loadDimensions()
    if (checkPermi(['dqservice:dataSource:use'])) sourceOptions().then(r => { this.sources = r.data || [] }).catch(() => {})
  },
  beforeDestroy() { Object.values(this.referenceData).forEach(s => { s.token++ }) },
  methods: {
    kind(type) {
      const t = String(type || '').toLowerCase()
      if (/^(tinyint|smallint|mediumint|int|integer|bigint|decimal|numeric|float|double|real)$/.test(t)) return 'NUMBER'
      if (/^(char|varchar|tinytext|text|mediumtext|longtext|enum|set|string)$/.test(t)) return 'TEXT'
      if (/^(date|datetime|timestamp)$/.test(t)) return 'TIME'
      return 'OTHER'
    },
    supports(code, type) {
      if (code === 'notBlank') return this.kind(type) === 'TEXT'
      if (code === 'freshness') return /^(datetime|timestamp)$/i.test(type)
      if (code === 'referenceExists') return ['TEXT', 'NUMBER'].includes(this.kind(type))
      if (['fieldCompare', 'referenceMatch', 'compositeUnique'].includes(code)) return this.kind(type) !== 'OTHER'
      return true
    },
    multiValue(row, p) {
      try { const value = JSON.parse(this.paramValue(row, p)); return Array.isArray(value) ? value : [] } catch (e) { return [] }
    },
    fieldOptions(row, p) {
      const fields = this.droolsRule.allColumns || []
      if (p.key === 'sourceKey') return fields.filter(c => ['TEXT', 'NUMBER'].includes(this.kind(c.type)))
      if (p.type === 'fields') return fields.filter(c => this.kind(c.type) !== 'OTHER')
      return fields.filter(c => c.name !== row.field && this.kind(c.type) === this.kind(this.droolsRule.cols[row.colIndex].type))
    },
    referenceState(row) {
      const key = row.field + ':' + row.code
      if (!this.referenceData[key]) this.$set(this.referenceData, key, { tables: [], columns: [], indexes: [], loading: false, error: '', token: 0 })
      return this.referenceData[key]
    },
    async loadReference(row, search = '', columnsOnly = false) {
      const state = this.referenceState(row)
      const token = ++state.token
      const params = this.droolsRule.cols[row.colIndex].params[row.code] || {}
      if (!params.referenceSourceId) { state.tables = []; state.columns = []; state.indexes = []; state.loading = false; return }
      state.loading = true; state.error = ''
      try {
        if (!columnsOnly) {
          const r = await sourceTables({ sourceId: params.referenceSourceId, search, pageSize: 100 })
          if (token !== state.token) return
          state.tables = r.data.rows
        }
        if (params.referenceTable) {
          const r = await sourceColumns({ sourceId: params.referenceSourceId, tableName: params.referenceTable })
          if (token !== state.token) return
          state.columns = r.data.columns; state.indexes = r.data.indexes
        }
      } catch (e) {
        if (token === state.token) state.error = '参考元数据读取失败，请检查连接并重新选择参考源或表'
      } finally { if (token === state.token) state.loading = false }
    },
    referenceFields(row, p) {
      const state = this.referenceState(row)
      const params = this.droolsRule.cols[row.colIndex].params[row.code] || {}
      const sourceName = p.type === 'referenceValue' || row.code === 'referenceExists' ? row.field : params.sourceKey
      const source = (this.droolsRule.allColumns || []).find(c => c.name === sourceName)
      return state.columns.filter(c => (!source || this.kind(c.type) === this.kind(source.type)) &&
        (p.type !== 'referenceKey' || state.indexes.some(i => !i.prefix && i.columns[0] === c.name &&
          (row.code !== 'referenceMatch' || (i.unique && i.columns.length === 1)))))
    },
    loadDimensions() {
      this.dimensionsLoading = true
      this.dimensionsFailed = false
      return listQualityDimensions().then(res => {
        this.dimensions = res.data || []
      }).catch(() => {
        this.dimensionsFailed = true
      }).finally(() => {
        this.dimensionsLoading = false
      })
    },
    loadTemplates() {
      listRuleTemplate().then(async res => {
        const list = res.data || []
        const map = {}
        list.forEach(item => { map[item.code] = item })
        this.templates = list
        this.templateMap = map
        // 模板定义到位后补齐默认参数
        ;(this.droolsRule.cols || []).forEach(col => this.initColParams(col))
        for (const row of this.paramRows) if (row.code.startsWith('reference')) await this.loadReference(row)
      }).catch(() => {
        this.$message.error('规则模板加载失败')
      })
    },
    // 初始化某字段的模板参数结构，并清理已取消的模板
    initColParams(col) {
      if (!col.params) this.$set(col, 'params', {})
      const selected = col.rules || []
      Object.keys(col.params).forEach(code => {
        if (selected.indexOf(code) === -1) this.$delete(col.params, code)
      })
      selected.forEach(code => {
        const tpl = this.templateMap[code]
        if (!tpl || !tpl.params || tpl.params.length === 0) return
        if (!col.params[code]) {
          const values = {}
          tpl.params.forEach(p => { values[p.key] = p.defaultValue || '' })
          this.$set(col.params, code, values)
        }
      })
    },
    handleRulesChange(row) {
      const index = this.droolsRule.cols.indexOf(row)
      if (index === -1) return
      this.initColParams(this.droolsRule.cols[index])
    },
    paramValue(row, p) {
      const col = this.droolsRule.cols[row.colIndex]
      const values = (col.params && col.params[row.code]) || {}
      return values[p.key] === undefined ? '' : values[p.key]
    },
    setParamValue(row, p, value) {
      const col = this.droolsRule.cols[row.colIndex]
      if (!col.params) this.$set(col, 'params', {})
      if (!col.params[row.code]) this.$set(col.params, row.code, {})
      this.$set(col.params[row.code], p.key, value == null ? '' : String(value))
      if (p.key === 'referenceSourceId' || p.key === 'referenceTable') {
        const state = this.referenceState(row)
        state.columns = []; state.indexes = []; state.error = ''
        if (p.key === 'referenceSourceId') { state.tables = []; this.$set(col.params[row.code], 'referenceTable', '') }
        this.$set(col.params[row.code], 'referenceKey', '')
        if (row.code === 'referenceMatch') this.$set(col.params[row.code], 'referenceValue', '')
        this.loadReference(row, '', p.key === 'referenceTable')
      }
    },
    commitRuleSelect() {
      if (this.validating) return
      const cols = this.droolsRule.cols || []
      if (cols.length === 0) {
        this.$message.error('请先选择需要检测的字段')
        return
      }
      for (const col of cols) {
        if (!col.rules || col.rules.length === 0) {
          this.$message.error('请为每个字段至少选择一个规则')
          return
        }
      }
      for (const row of this.paramRows) {
        for (const p of row.params) {
          if (p.required && !String(this.paramValue(row, p)).trim()) {
            this.$message.error('字段 ' + row.field + ' 的「' + row.templateName + '」需要填写' + p.label)
            return
          }
        }
      }
      this.validating = true
      previewRuleTemplate({ ...this.droolsRule, ruleName: this.droolsRule.ruleName || '参数校验' })
        .then(() => this.$emit('finish')).catch(() => {})
        .finally(() => { this.validating = false })
    },
    back() {
      this.$emit('back')
    }
  }
}
</script>

<style scoped>
.quality-note {
  margin-bottom: 16px;
}
.param-panel {
  margin-top: 30px;
}
.param-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #303133;
}
.param-item {
  display: inline-block;
  margin-right: 24px;
}
.param-label {
  display: inline-block;
  width: 110px;
  color: #606266;
}
.required {
  color: #f56c6c;
  font-style: normal;
  margin-left: 2px;
}
</style>
