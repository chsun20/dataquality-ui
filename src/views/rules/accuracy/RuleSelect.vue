<template>
<div class="app-container">
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
              :value="item.code"/>
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
              <el-input
                v-if="p.type === 'text' || p.type === 'number' || !p.type"
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
                <el-option v-for="o in p.options" :key="o" :label="o" :value="o"/>
              </el-select>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-row style="margin-top: 40px">
      <el-col :span="8" :offset="8">
        <el-button @click="back" type="primary">上一步</el-button>
      </el-col>
      <el-col :span="8">
        <el-button @click="commitRuleSelect" type="primary">下一步</el-button>
      </el-col>
    </el-row>
  </el-form>
</div>
</template>

<script>
import { listRuleTemplate } from '@/api/dqservice/ruleTemplate'

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
      templateMap: {}
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
  },
  methods: {
    loadTemplates() {
      listRuleTemplate().then(res => {
        const list = res.data || []
        const map = {}
        list.forEach(item => { map[item.code] = item })
        this.templates = list
        this.templateMap = map
        // 模板定义到位后补齐默认参数
        ;(this.droolsRule.cols || []).forEach(col => this.initColParams(col))
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
      this.$set(col.params[row.code], p.key, value)
    },
    commitRuleSelect() {
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
      this.$emit('finish')
    },
    back() {
      this.$emit('back')
    }
  }
}
</script>

<style scoped>
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
