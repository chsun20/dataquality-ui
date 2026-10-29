<template>
  <div class="app-container">
    <el-alert title="限量检测" description="默认扫描 1000 行，执行时最多 10000 行。有主键按主键排序，无主键时扫描范围不可稳定复现。唯一性仅对本次扫描有效，不提供尚未实现的过滤或分区功能。" :closable="false" />
    <el-form inline style="margin-top: 18px">
      <el-form-item label="数据源">
        <el-select v-model="sourceKey" @change="changeSource" filterable>
          <el-option label="内置本地数据源" value="local" />
          <el-option v-for="s in sources" :key="s.id" :label="s.name + ' / ' + s.databaseName" :value="String(s.id)" />
        </el-select>
      </el-form-item>
      <el-form-item label="数据表">
        <el-select v-model="droolsRule.tableName" filterable remote :remote-method="searchTables" :loading="tablesLoading" @change="changeTable">
          <el-option v-for="t in tables" :key="t.tableName" :label="t.tableName" :value="t.tableName" />
        </el-select>
        <span v-if="tableTotal > 100">共 {{ tableTotal }} 张表，请输入表名缩小范围</span>
      </el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-table ref="fields" v-loading="loading" :data="columns" row-key="name" @selection-change="handleSelectionChange">
      <el-table-column type="selection" />
      <el-table-column label="检测字段" prop="name" />
      <el-table-column label="类型" prop="type" />
      <el-table-column label="说明" prop="comment" />
    </el-table>
    <el-button style="margin-top: 20px" :disabled="loading || !columns.length" @click="commitDataSelect" type="primary">下一步</el-button>
  </div>
</template>

<script>
import { sourceOptions, sourceTables, sourceColumns } from '@/api/dqservice/dataSource'
import { checkPermi } from '@/utils/permission'

export default {
  name: 'DataSelect',
  props: { droolsRule: { type: Object, required: true } },
  data() {
    return { sourceKey: this.droolsRule.sourceId == null ? 'local' : String(this.droolsRule.sourceId),
      sources: [], tables: [], columns: [], selected: [], loading: false, tablesLoading: false,
      tableTotal: 0, tableRequest: 0, fieldRequest: 0, error: '' }
  },
  created() {
    if (checkPermi(['dqservice:dataSource:use'])) sourceOptions().then(r => { this.sources = r.data || [] }).catch(() => {})
    this.searchTables('')
    if (this.droolsRule.tableName) this.loadColumns(true)
  },
  beforeDestroy() { this.tableRequest++; this.fieldRequest++ },
  methods: {
    params() { return { sourceId: this.droolsRule.sourceId, databaseName: this.droolsRule.dbName || undefined } },
    clearFields() {
      this.fieldRequest++
      this.columns = []; this.selected = []; this.loading = false; this.error = ''
      this.$set(this.droolsRule, 'cols', [])
      this.$set(this.droolsRule, 'allColumns', [])
    },
    changeSource() {
      this.clearFields()
      this.droolsRule.tableName = ''; this.droolsRule.dbName = ''
      this.$set(this.droolsRule, 'sourceId', this.sourceKey === 'local' ? null : Number(this.sourceKey))
      const source = this.sources.find(s => String(s.id) === this.sourceKey)
      this.$set(this.droolsRule, 'sourceName', source ? source.name : '内置本地数据源')
      if (source) this.droolsRule.dbName = source.databaseName
      this.tables = []; this.searchTables('')
    },
    searchTables(search) {
      const request = ++this.tableRequest
      this.tablesLoading = true
      return sourceTables({ ...this.params(), search, pageSize: 100 }).then(r => {
        if (request !== this.tableRequest) return
        this.tables = r.data.rows; this.tableTotal = Number(r.data.total)
        this.droolsRule.dbName = r.data.databaseName
      }).catch(() => { if (request === this.tableRequest) this.error = '表列表加载失败，请检查连接或重新选择数据源' })
        .finally(() => { if (request === this.tableRequest) this.tablesLoading = false })
    },
    changeTable() { this.clearFields(); this.loadColumns(false) },
    loadColumns(restore) {
      const request = ++this.fieldRequest
      const previous = restore ? this.droolsRule.cols || [] : []
      this.loading = true
      return sourceColumns({ ...this.params(), tableName: this.droolsRule.tableName }).then(r => {
        if (request !== this.fieldRequest) return
        this.columns = r.data.columns || []
        this.droolsRule.dbName = r.data.databaseName
        this.$set(this.droolsRule, 'allColumns', this.columns)
        this.$nextTick(() => {
          if (request !== this.fieldRequest) return
          this.columns.forEach(c => { if (previous.some(p => p.name === c.name)) this.$refs.fields.toggleRowSelection(c, true) })
        })
      }).catch(() => { if (request === this.fieldRequest) this.error = '字段加载失败，请重新选择数据表' })
        .finally(() => { if (request === this.fieldRequest) this.loading = false })
    },
    handleSelectionChange(rows) { this.selected = rows },
    commitDataSelect() {
      if (!this.selected.length) return this.$message.error('请至少选择一个检测字段')
      const old = this.droolsRule.cols || []
      this.droolsRule.cols = this.selected.map(c => ({ ...c, ...(old.find(p => p.name === c.name) || {}), type: c.type }))
      this.$emit('finish')
    }
  }
};
</script>
