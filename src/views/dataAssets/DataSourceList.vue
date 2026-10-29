<template>
  <div class="app-container">
    <el-alert title="MySQL 数据源" description="连接由服务器白名单控制；请使用仅有 SELECT 权限的数据库账号。密码加密保存且不回显。内置本地数据源与外部连接相互独立；真实准确性取决于参考依据是否可信。" type="info" :closable="false" />
    <el-tabs v-model="tab" @tab-click="loadTab">
      <el-tab-pane v-if="can('list')" label="连接管理" name="connections">
        <el-button v-hasPermi="['dqservice:dataSource:add']" type="primary" size="small" @click="editSource()">新增 MySQL 连接</el-button>
        <el-button size="small" @click="getList">刷新</el-button>
        <el-table v-loading="loading" :data="connections">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="host" label="主机" />
          <el-table-column prop="port" label="端口" width="80" />
          <el-table-column prop="databaseName" label="绑定数据库" />
          <el-table-column prop="tlsMode" label="TLS" />
          <el-table-column prop="configVersion" label="配置版本" width="90" />
          <el-table-column label="状态" width="110"><template slot-scope="s"><el-tag :type="s.row.enabled && s.row.configured ? 'success' : 'info'">{{ !s.row.configured ? '未配置' : s.row.enabled ? '已启用' : '已停用' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="230">
            <template slot-scope="s">
              <el-button v-hasPermi="['dqservice:dataSource:edit']" type="text" @click="editSource(s.row)">编辑</el-button>
              <el-button v-hasPermi="['dqservice:dataSource:test']" type="text" :disabled="testing || !s.row.configured" @click="testSaved(s.row)">测试连接</el-button>
              <el-button v-hasPermi="['dqservice:dataSource:remove']" type="text" @click="remove(s.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />
      </el-tab-pane>
      <el-tab-pane v-if="can('metadata')" label="表浏览" name="tables">
        <el-form inline>
          <el-form-item label="数据源"><el-select v-model="sourceKey" filterable @change="changeSource">
            <el-option label="内置本地数据源" value="local" />
            <el-option v-for="s in options" :key="s.id" :label="s.name + ' / ' + s.databaseName" :value="String(s.id)" />
          </el-select></el-form-item>
          <el-form-item label="表名"><el-input v-model="tableQuery.search" clearable @keyup.enter.native="searchTables" /></el-form-item>
          <el-button type="primary" @click="searchTables">查询</el-button>
        </el-form>
        <p>当前数据库：{{ databaseName || '—' }}</p>
        <el-table v-loading="tableLoading" :data="tables" @expand-change="expandTable" row-key="tableName">
          <el-table-column type="expand"><template slot-scope="s">
            <el-alert v-if="s.row.metadataError" :title="s.row.metadataError" type="error" :closable="false" />
            <el-table v-loading="s.row.metadataLoading" :data="s.row.columns || []" size="small">
              <el-table-column prop="name" label="字段" /><el-table-column prop="type" label="类型" />
              <el-table-column label="允许 NULL"><template slot-scope="c">{{ c.row.nullable ? '是' : '否' }}</template></el-table-column>
              <el-table-column prop="comment" label="说明" />
            </el-table>
            <p v-for="i in s.row.indexes || []" :key="i.name">{{ i.name }}：{{ i.columns.join('、') }}（{{ i.unique ? '唯一' : '普通' }}{{ i.prefix ? '，含前缀/表达式' : '' }}）</p>
          </template></el-table-column>
          <el-table-column prop="tableName" label="表名" /><el-table-column prop="comment" label="说明" />
          <el-table-column prop="tableType" label="类型" />
          <el-table-column label="操作"><template slot-scope="s"><el-button v-hasPermi="['dqservice:dataSource:preview']" type="text" @click="preview(s.row)">预览前 20 行</el-button></template></el-table-column>
        </el-table>
        <pagination v-show="tableTotal > 0" :total="tableTotal" :page.sync="tableQuery.pageNum" :limit.sync="tableQuery.pageSize" @pagination="getTables" />
      </el-tab-pane>
    </el-tabs>
    <el-dialog :title="form.id ? '编辑 MySQL 连接' : '新增 MySQL 连接'" :visible.sync="open" width="680px" :close-on-click-modal="false" @closed="clearPassword">
      <el-form ref="sourceForm" :model="form" :rules="rules" label-width="110px" :disabled="saving">
        <el-form-item v-for="f in fields" :key="f.key" :label="f.label" :prop="f.key"><el-input v-model="form[f.key]" :maxlength="f.max || 128" /></el-form-item>
        <el-form-item label="端口" prop="port"><el-input-number v-model="form.port" :min="1" :max="65535" /></el-form-item>
        <el-form-item label="密码" prop="password"><el-input v-model="form.password" type="password" show-password autocomplete="new-password" maxlength="1024" :placeholder="form.id ? '留空保持原密码；变更连接目标须重填' : '填写只读数据库账号密码'" /></el-form-item>
        <el-form-item label="TLS 模式"><el-select v-model="form.tlsMode"><el-option v-for="v in tlsModes" :key="v" :label="v" :value="v" /></el-select></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.description" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <el-alert v-if="form.tlsMode === 'DISABLED'" title="仅服务器显式授权的本地演示目标允许关闭 TLS，生产连接请使用 VERIFY_IDENTITY。" type="warning" :closable="false" />
      <span slot="footer"><el-button v-hasPermi="['dqservice:dataSource:test']" :loading="testing" :disabled="saving" @click="testDraft">测试（不保存）</el-button><el-button type="primary" :loading="saving" :disabled="testing" @click="save">保存</el-button><el-button :disabled="saving || testing" @click="open = false">取消</el-button></span>
    </el-dialog>
    <el-dialog title="数据预览（最多 20 行）" :visible.sync="previewOpen" width="90%">
      <el-alert v-if="previewError" :title="previewError" type="error" :closable="false" />
      <el-table v-loading="previewLoading" :data="previewRows" max-height="500">
        <el-table-column v-for="name in previewFields" :key="name" :label="name" min-width="140"><template slot-scope="s">{{ fieldValueText(s.row[name]) }}</template></el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script>
import { listDataSource, addDataSource, updateDataSource, delDataSource, sourceOptions, sourceTables, sourceColumns, sourcePreview, testSource, testSavedSource } from '@/api/dqservice/dataSource'
import { checkPermi } from '@/utils/permission'
import { fieldValueText } from '@/utils/quality'
const blank = () => ({ name: '', type: 'MYSQL', host: '', port: 3306, databaseName: '', username: '', password: '', tlsMode: 'VERIFY_IDENTITY', timeZone: 'Asia/Shanghai', enabled: true, description: '' })

export default {
  name: 'DataSource',
  data() {
    return { tab: checkPermi(['dqservice:dataSource:list']) ? 'connections' : 'tables', loading: false,
      connections: [], total: 0, queryParams: { pageNum: 1, pageSize: 10 }, options: [], sourceKey: 'local',
      tables: [], tableTotal: 0, tableQuery: { pageNum: 1, pageSize: 10, search: '' }, databaseName: '', tableLoading: false, requestId: 0,
      open: false, form: blank(), saving: false, testing: false, previewOpen: false, previewLoading: false, previewRows: [], previewError: '', previewId: 0,
      tlsModes: ['VERIFY_IDENTITY', 'VERIFY_CA', 'REQUIRED', 'DISABLED'],
      fields: [{ key: 'name', label: '连接名称', max: 100 }, { key: 'host', label: '主机', max: 253 },
        { key: 'databaseName', label: '绑定数据库', max: 64 }, { key: 'username', label: '只读用户名' }, { key: 'timeZone', label: 'IANA 时区' }],
      rules: ['name', 'host', 'databaseName', 'username', 'port', 'timeZone'].reduce((r, k) => {
        r[k] = [{ required: true, message: '此项必填', trigger: 'blur' }]; return r
      }, {}) }
  },
  computed: { previewFields() { return this.previewRows.length ? Object.keys(this.previewRows[0]).filter(k => k !== '__rowId') : [] } },
  created() { this.loadTab(); this.loadOptions() },
  beforeDestroy() { this.requestId++; this.previewId++; this.clearPassword() },
  methods: {
    fieldValueText,
    can(action) { return checkPermi(['dqservice:dataSource:' + action]) },
    loadTab() { if (this.tab === 'connections' && this.can('list')) this.getList(); else if (this.can('metadata')) this.getTables() },
    loadOptions() { if (this.can('use')) sourceOptions().then(r => { this.options = r.data || [] }).catch(() => {}) },
    getList() {
      this.loading = true
      return listDataSource(this.queryParams).then(r => { this.connections = r.rows; this.total = Number(r.total) })
        .catch(() => {}).finally(() => { this.loading = false })
    },
    params() { return { sourceId: this.sourceKey === 'local' ? undefined : Number(this.sourceKey) } },
    changeSource() { this.tables = []; this.databaseName = ''; this.searchTables() },
    searchTables() { this.tableQuery.pageNum = 1; this.getTables() },
    getTables() {
      const id = ++this.requestId
      this.tableLoading = true
      return sourceTables({ ...this.params(), ...this.tableQuery }).then(r => {
        if (id !== this.requestId) return
        this.tables = r.data.rows; this.tableTotal = Number(r.data.total); this.databaseName = r.data.databaseName
      }).catch(() => { if (id === this.requestId) { this.tables = []; this.tableTotal = 0 } })
        .finally(() => { if (id === this.requestId) this.tableLoading = false })
    },
    expandTable(row, expanded) {
      if (!expanded.includes(row) || row.columns || row.metadataLoading) return
      const id = this.requestId
      this.$set(row, 'metadataLoading', true)
      sourceColumns({ ...this.params(), tableName: row.tableName }).then(r => {
        if (id !== this.requestId) return
        this.$set(row, 'columns', r.data.columns); this.$set(row, 'indexes', r.data.indexes)
      }).catch(() => { this.$set(row, 'metadataError', '字段加载失败，折叠后展开可重试') })
        .finally(() => { this.$set(row, 'metadataLoading', false) })
    },
    preview(row) {
      const id = ++this.previewId
      this.previewRows = []; this.previewError = ''; this.previewOpen = true; this.previewLoading = true
      sourcePreview({ ...this.params(), tableName: row.tableName, limit: 20 }).then(r => {
        if (id === this.previewId) this.previewRows = r.data || []
      }).catch(() => { if (id === this.previewId) this.previewError = '预览失败，请检查连接和权限' })
        .finally(() => { if (id === this.previewId) this.previewLoading = false })
    },
    editSource(row) {
      this.form = { ...blank(), ...(row || {}), type: 'MYSQL', password: '' }
      if (!row || !row.configured) Object.assign(this.form, { host: '', port: 3306, databaseName: '', username: '', tlsMode: 'VERIFY_IDENTITY', timeZone: 'Asia/Shanghai' })
      this.open = true
      this.$nextTick(() => this.$refs.sourceForm.clearValidate())
    },
    clearPassword() { this.form.password = '' },
    payload() {
      const payload = { ...this.form }
      delete payload.configured
      if (!payload.password) delete payload.password
      return payload
    },
    save() {
      if (this.saving || this.testing) return
      this.$refs.sourceForm.validate(valid => {
        if (!valid) return
        if (!this.form.id && !this.form.password) return this.$message.error('请填写数据库密码')
        this.saving = true
        const save = this.form.id ? updateDataSource : addDataSource
        save(this.payload()).then(() => { this.$message.success('连接已保存'); this.open = false; this.clearPassword(); this.getList(); this.loadOptions() })
          .catch(() => {}).finally(() => { this.saving = false })
      })
    },
    testDraft() {
      if (this.testing) return
      this.$refs.sourceForm.validate(valid => {
        if (!valid) return
        this.testing = true
        testSource(this.payload()).then(() => this.$message.success('连接测试成功，配置未保存'))
          .catch(() => {}).finally(() => { this.testing = false })
      })
    },
    testSaved(row) {
      this.testing = true
      testSavedSource(row.id).then(() => this.$message.success('连接测试成功')).catch(() => {}).finally(() => { this.testing = false })
    },
    remove(row) {
      this.$confirm('确认删除连接“' + row.name + '”？被规则使用的连接不能删除。', '删除连接', { type: 'warning' })
        .then(() => delDataSource(row.id)).then(() => { this.getList(); this.loadOptions(); this.$message.success('连接已删除') }).catch(() => {})
    }
  }
};
</script>
