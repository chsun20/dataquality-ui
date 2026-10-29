<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="任务名称" prop="taskName">
        <el-input v-model="queryParams.taskName" placeholder="请输入任务名称" clearable @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="数据表" prop="tableName">
        <el-input v-model="queryParams.tableName" placeholder="请输入表名" clearable @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="调度状态" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="全部" clearable style="width: 120px">
          <el-option label="已启用" :value="true" />
          <el-option label="已停用" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-alert
      title="任务与调度"
      description="任务固定绑定一个数据源的一张表，可挂多条规则；定时触发只负责提交运行批次，规则在后台线程池中依次执行。任务层只汇总规则状态与违规条数合计，不合成任务级通过率。调度按单实例运行，启用后由服务端 Cron 触发。"
      type="info"
      :closable="false"
      show-icon
      class="task-note"
    />

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button v-hasPermi="['dqservice:task:add']" type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button icon="el-icon-refresh" size="mini" @click="getList">刷新</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="taskList">
      <el-table-column label="任务名称" prop="taskName" min-width="150" :show-overflow-tooltip="true" />
      <el-table-column label="数据源" prop="sourceName" min-width="130" show-overflow-tooltip />
      <el-table-column label="库.表" min-width="160" show-overflow-tooltip>
        <template slot-scope="s">{{ s.row.dbName }}.{{ s.row.tableName }}</template>
      </el-table-column>
      <el-table-column label="规则数" prop="ruleCount" width="80" align="center" />
      <el-table-column label="扫描上限" prop="limitRows" width="90" align="center" />
      <el-table-column label="Cron" width="150" align="center">
        <template slot-scope="s">
          <span>{{ s.row.cronExpression || '未设置' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="定时调度" width="100" align="center">
        <template slot-scope="s">
          <el-switch v-model="s.row.enabled" :disabled="!canEdit" @change="handleStatusChange(s.row)" />
        </template>
      </el-table-column>
      <el-table-column label="最近运行" width="170" align="center">
        <template slot-scope="s">
          <template v-if="s.row.lastRunStatus">
            <el-tag :type="runStatusType(s.row.lastRunStatus)" size="mini">{{ runStatusText(s.row.lastRunStatus) }}</el-tag>
            <div class="sub-text">{{ parseTime(s.row.lastRunAt) }}</div>
          </template>
          <span v-else class="sub-text">尚未运行</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" align="center" class-name="small-padding fixed-width">
        <template slot-scope="s">
          <el-button v-hasPermi="['dqservice:task:execute']" size="mini" type="text" icon="el-icon-video-play" @click="handleRun(s.row)">执行</el-button>
          <el-button v-hasPermi="['dqservice:task:run']" size="mini" type="text" icon="el-icon-time" @click="openRuns(s.row)">历史</el-button>
          <el-button v-hasPermi="['dqservice:task:edit']" size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(s.row)">修改</el-button>
          <el-button v-hasPermi="['dqservice:task:remove']" size="mini" type="text" icon="el-icon-delete" @click="handleDelete(s.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />

    <!-- 新增 / 修改任务 -->
    <el-dialog :title="form.taskId ? '修改质控任务' : '新增质控任务'" :visible.sync="open" width="720px" append-to-body :close-on-click-modal="false">
      <el-form ref="taskForm" :model="form" :rules="rules" label-width="100px" :disabled="saving">
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="form.taskName" maxlength="100" placeholder="例如：订单表每日空值检查" />
        </el-form-item>
        <el-form-item label="数据源" prop="sourceKey">
          <el-select v-model="form.sourceKey" style="width: 100%" @change="changeSource">
            <el-option label="内置本地数据源" value="local" />
            <el-option v-for="item in sourceList" :key="item.id" :label="item.name + ' / ' + item.databaseName" :value="String(item.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据表" prop="tableName">
          <el-select
            v-model="form.tableName"
            filterable
            remote
            clearable
            :remote-method="searchTables"
            :loading="tableLoading"
            placeholder="输入表名搜索"
            style="width: 100%"
            @change="changeTable"
          >
            <el-option v-for="item in tableOptions" :key="item.tableName" :label="item.tableName + (item.comment ? '（' + item.comment + '）' : '')" :value="item.tableName" />
          </el-select>
          <div class="sub-text">库名：{{ form.dbName || '选择数据表后自动带入' }}</div>
        </el-form-item>
        <el-form-item label="规则" prop="ruleIds">
          <el-select v-model="form.ruleIds" multiple filterable :loading="candidateLoading" placeholder="请选择同一数据源与表下的规则" style="width: 100%">
            <el-option v-for="item in candidates" :key="item.ruleId" :label="ruleLabel(item)" :value="item.ruleId" />
          </el-select>
          <div v-if="form.tableName && !candidateLoading && candidates.length === 0" class="sub-text">该表下暂无规则，请先在“规则制定”中创建。</div>
        </el-form-item>
        <el-form-item label="扫描上限" prop="limitRows">
          <el-input-number v-model="form.limitRows" :min="1" :max="10000" :step="100" />
          <span class="sub-text">每条规则单次最多扫描的行数，1～10000。</span>
        </el-form-item>
        <el-form-item label="启用调度" prop="enabled">
          <el-switch v-model="form.enabled" />
          <span class="sub-text">启用后由服务端按 Cron 触发，触发人为 system。</span>
        </el-form-item>
        <el-form-item label="Cron" prop="cronExpression">
          <el-input v-model="form.cronExpression" maxlength="64" placeholder="六段：秒 分 时 日 月 周，例如 0 0 2 * * ?" />
          <el-button type="text" icon="el-icon-time" @click="handleShowCron">生成表达式</el-button>
        </el-form-item>
        <el-form-item label="重叠策略" prop="misfirePolicy">
          <el-radio-group v-model="form.misfirePolicy">
            <el-radio label="SKIP">跳过本轮</el-radio>
            <el-radio label="FIRE_ONCE">本轮结束后补跑一次</el-radio>
          </el-radio-group>
          <div class="sub-text">同一任务已有批次运行时生效；补跑只在本轮结束后执行一次。</div>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button type="primary" :loading="saving" @click="submitForm">确 定</el-button>
        <el-button :disabled="saving" @click="open = false">取 消</el-button>
      </span>
    </el-dialog>

    <el-dialog title="Cron 表达式生成器" :visible.sync="openCron" append-to-body destroy-on-close class="scrollbar">
      <crontab @hide="openCron = false" @fill="crontabFill" :expression="cronDraft" :hide-component="['year']"></crontab>
    </el-dialog>

    <!-- 运行历史 -->
    <el-drawer :title="'运行历史 · ' + runsTaskName" :visible.sync="runsOpen" size="62%" @closed="closeRuns">
      <div class="drawer-body">
        <div class="drawer-toolbar">
          <el-select v-model="runQuery.status" size="small" clearable placeholder="全部状态" style="width: 140px" @change="searchRuns">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button size="small" icon="el-icon-refresh" @click="getRuns()">刷新</el-button>
          <span class="sub-text">批次状态汇总规则结果；通过率请在规则报告中查看。</span>
        </div>
        <el-table v-loading="runLoading" :data="runList" size="small">
          <el-table-column label="批次" prop="runId" width="70" align="center" />
          <el-table-column label="触发" width="90" align="center">
            <template slot-scope="s">{{ triggerText(s.row.triggerType) }}<div class="sub-text">{{ s.row.triggerBy || '—' }}</div></template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template slot-scope="s"><el-tag :type="runStatusType(s.row.status)" size="mini">{{ runStatusText(s.row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="规则结果" min-width="190">
            <template slot-scope="s">
              规则 {{ s.row.ruleTotal }} 条：成功 {{ s.row.ruleSuccess }}、部分 {{ s.row.rulePartial }}、无数据 {{ s.row.ruleNoData }}、失败 {{ s.row.ruleFailed }}
            </template>
          </el-table-column>
          <el-table-column label="违规条数" prop="violationCount" width="90" align="center" />
          <el-table-column label="无法核验" prop="unverifiableCount" width="90" align="center" />
          <el-table-column label="耗时" width="90" align="center">
            <template slot-scope="s">{{ s.row.costMs == null ? '—' : s.row.costMs + ' ms' }}</template>
          </el-table-column>
          <el-table-column label="开始时间" width="155" align="center">
            <template slot-scope="s">{{ parseTime(s.row.startedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="130" align="center">
            <template slot-scope="s">
              <el-button size="mini" type="text" icon="el-icon-view" @click="openRunDetail(s.row)">详情</el-button>
              <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDeleteRun(s.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="runTotal > 0" :total="runTotal" :page.sync="runQuery.pageNum" :limit.sync="runQuery.pageSize" @pagination="getRuns()" />
      </div>
    </el-drawer>

    <!-- 运行批次详情 -->
    <el-dialog :title="'运行批次 #' + (runDetail.runId || '')" :visible.sync="runDetailOpen" width="960px" append-to-body>
      <div v-loading="runDetailLoading">
        <div class="detail-meta">
          <span>任务：{{ runDetail.taskName }}</span>
          <span>触发：{{ triggerText(runDetail.triggerType) }} / {{ runDetail.triggerBy }}</span>
          <span>开始：{{ parseTime(runDetail.startedAt) }}</span>
          <span>结束：{{ runDetail.finishedAt ? parseTime(runDetail.finishedAt) : '—' }}</span>
        </div>
        <el-alert
          :title="runStatusText(runDetail.status)"
          :type="runStatusType(runDetail.status) === 'danger' ? 'error' : (runStatusType(runDetail.status) === 'warning' ? 'warning' : 'info')"
          :description="runDetail.message || '任务层只汇总规则状态与违规条数合计，不合成任务级通过率。'"
          :closable="false"
          show-icon
        />
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-label">规则总数</div>
            <div class="summary-value">{{ runDetail.ruleTotal }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">成功 / 部分</div>
            <div class="summary-value">{{ runDetail.ruleSuccess }} / {{ runDetail.rulePartial }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">无数据 / 失败</div>
            <div class="summary-value">{{ runDetail.ruleNoData }} / {{ runDetail.ruleFailed }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">违规条数合计</div>
            <div class="summary-value danger">{{ runDetail.violationCount }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">无法核验合计</div>
            <div class="summary-value">{{ runDetail.unverifiableCount }}</div>
          </div>
        </div>

        <el-table :data="runDetail.reports || []" size="mini" border max-height="420">
          <el-table-column label="规则名称" prop="ruleName" min-width="160" show-overflow-tooltip />
          <el-table-column label="评价状态" width="110" align="center">
            <template slot-scope="s"><el-tag :type="rateTagType(s.row)" size="mini">{{ evaluationText(s.row) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="扫描行数" prop="totalRows" width="90" align="center" />
          <el-table-column label="违规条数" prop="violationCount" width="90" align="center" />
          <el-table-column label="违规行数" prop="violationRows" width="90" align="center" />
          <el-table-column label="行通过率" width="120" align="center">
            <template slot-scope="s"><el-tag :type="rateTagType(s.row)" size="mini">{{ rateText(s.row) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="耗时" width="90" align="center">
            <template slot-scope="s">{{ s.row.costMs == null ? '—' : s.row.costMs + ' ms' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template slot-scope="s"><el-button size="mini" type="text" @click="openReport(s.row)">查看报告</el-button></template>
          </el-table-column>
        </el-table>
      </div>
      <div slot="footer">
        <el-button @click="runDetailOpen = false">关 闭</el-button>
      </div>
    </el-dialog>

    <!-- 单条规则报告 -->
    <el-dialog :title="'质量报告 #' + (report.executionId || '')" :visible.sync="reportOpen" width="960px" append-to-body>
      <div v-loading="reportLoading">
        <div class="detail-meta">
          <span>规则：{{ report.ruleName }}</span>
          <span>数据表：{{ report.dbName }}.{{ report.tableName }}</span>
          <span>执行人：{{ report.createBy }}</span>
          <span>执行时间：{{ parseTime(report.createTime) }}</span>
        </div>
        <EvaluationDetail v-if="!reportLoading" :record="report" />
        <el-table :data="report.violations || []" size="mini" border max-height="360">
          <el-table-column label="行号" prop="rowId" width="70" align="center" />
          <el-table-column label="记录ID" prop="recordId" width="90" align="center" />
          <el-table-column label="违规字段" prop="fieldName" width="150" />
          <el-table-column label="命中规则" prop="ruleName" show-overflow-tooltip />
          <el-table-column label="原因" prop="reason" min-width="140" />
          <el-table-column label="对比值"><template slot-scope="s">{{ fieldValueText(s.row.comparisonValue) }}</template></el-table-column>
          <el-table-column label="字段值" width="120" align="center">
            <template slot-scope="s">{{ fieldValueText(s.row.fieldValue) }}</template>
          </el-table-column>
        </el-table>
      </div>
      <div slot="footer">
        <el-button @click="reportOpen = false">关 闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listTask, getTask, candidateRules, addTask, updateTask, delTask, changeTaskStatus, runTask, listTaskRuns, getTaskRun, delTaskRun } from '@/api/dqservice/task'
import { sourceOptions, sourceTables } from '@/api/dqservice/dataSource'
import { getReport } from '@/api/dqservice/report'
import { checkPermi } from '@/utils/permission'
import { rateText, rateTagType, evaluationText, fieldValueText } from '@/utils/quality'
import Crontab from '@/components/Crontab'
import EvaluationDetail from '../report/EvaluationDetail'

const blank = () => ({
  taskId: null,
  taskName: '',
  sourceKey: 'local',
  dbName: '',
  tableName: '',
  limitRows: 1000,
  enabled: false,
  cronExpression: '',
  misfirePolicy: 'SKIP',
  remark: '',
  ruleIds: []
})

export default {
  name: 'QualityTask',
  components: { Crontab, EvaluationDetail },
  data() {
    return {
      loading: false,
      showSearch: true,
      taskList: [],
      total: 0,
      queryParams: { pageNum: 1, pageSize: 10, taskName: undefined, tableName: undefined, enabled: undefined },
      sourceList: [],
      open: false,
      saving: false,
      form: blank(),
      tableOptions: [],
      tableLoading: false,
      candidates: [],
      candidateLoading: false,
      openCron: false,
      cronDraft: '',
      runsOpen: false,
      runsTaskId: null,
      runsTaskName: '',
      runLoading: false,
      runList: [],
      runTotal: 0,
      runQuery: { pageNum: 1, pageSize: 10, taskId: null, status: undefined },
      pollTimer: null,
      runDetailOpen: false,
      runDetailLoading: false,
      runDetail: {},
      reportOpen: false,
      reportLoading: false,
      report: {},
      statusOptions: [
        { label: '运行中', value: 'RUNNING' },
        { label: '成功', value: 'SUCCESS' },
        { label: '部分完成', value: 'PARTIAL' },
        { label: '无数据', value: 'NO_DATA' },
        { label: '失败', value: 'FAILED' },
        { label: '已跳过', value: 'SKIPPED' }
      ],
      rules: {
        taskName: [{ required: true, message: '任务名称不能为空', trigger: 'blur' }],
        sourceKey: [{ required: true, message: '请选择数据源', trigger: 'change' }],
        tableName: [{ required: true, message: '请选择数据表', trigger: 'change' }],
        ruleIds: [{ required: true, type: 'array', min: 1, message: '请至少选择一条规则', trigger: 'change' }],
        limitRows: [{ required: true, message: '请填写扫描上限', trigger: 'blur' }],
        misfirePolicy: [{ required: true, message: '请选择重叠策略', trigger: 'change' }]
      }
    }
  },
  computed: {
    canEdit() {
      return checkPermi(['dqservice:task:edit'])
    }
  },
  created() {
    this.getList()
    this.loadSources()
  },
  beforeDestroy() {
    this.clearPoll()
  },
  methods: {
    evaluationText,
    rateText,
    rateTagType,
    fieldValueText,
    ruleLabel(item) {
      const target = item.columnName || '整行'
      const kind = item.typeName || item.templateCode || '规则'
      return item.ruleName + '（' + target + ' · ' + kind + '）'
    },
    runStatusText(status) {
      return ({ RUNNING: '运行中', SUCCESS: '成功', PARTIAL: '部分完成', NO_DATA: '无数据', FAILED: '失败', SKIPPED: '已跳过' })[status] || status || '—'
    },
    runStatusType(status) {
      return ({ RUNNING: 'warning', SUCCESS: 'success', PARTIAL: 'warning', NO_DATA: 'info', FAILED: 'danger', SKIPPED: 'info' })[status] || 'info'
    },
    triggerText(type) {
      return ({ MANUAL: '手动', CRON: '定时' })[type] || type || '—'
    },
    /** 查询任务列表 */
    getList() {
      this.loading = true
      listTask(this.queryParams).then(response => {
        this.taskList = response.rows
        this.total = Number(response.total)
      }).catch(() => {}).finally(() => { this.loading = false })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.queryParams.enabled = undefined
      this.handleQuery()
    },
    loadSources() {
      if (!checkPermi(['dqservice:dataSource:use'])) return
      sourceOptions().then(r => { this.sourceList = r.data || [] }).catch(() => {})
    },
    searchTables(search) {
      const sourceId = this.form.sourceKey === 'local' ? undefined : Number(this.form.sourceKey)
      this.tableLoading = true
      return sourceTables({ sourceId, pageNum: 1, pageSize: 50, search: search || '' }).then(r => {
        this.tableOptions = (r.data && r.data.rows) || []
        const databaseName = r.data && r.data.databaseName
        if (databaseName && !this.form.dbName) this.form.dbName = databaseName
        if (databaseName && this.form.sourceKey === 'local') this.form.dbName = databaseName
      }).catch(() => { this.tableOptions = [] }).finally(() => { this.tableLoading = false })
    },
    changeSource() {
      const hit = this.sourceList.find(item => String(item.id) === this.form.sourceKey)
      this.form.dbName = hit ? hit.databaseName : ''
      this.form.tableName = ''
      this.form.ruleIds = []
      this.candidates = []
      this.tableOptions = []
      this.searchTables('')
    },
    changeTable(tableName) {
      if (!tableName) {
        this.form.ruleIds = []
        this.candidates = []
        return
      }
      const hit = this.tableOptions.find(item => item.tableName === tableName)
      if (hit && hit.dbName) this.form.dbName = hit.dbName
      this.loadCandidates()
    },
    loadCandidates() {
      if (!this.form.tableName) return
      const sourceId = this.form.sourceKey === 'local' ? undefined : Number(this.form.sourceKey)
      this.candidateLoading = true
      candidateRules({ sourceId, tableName: this.form.tableName }).then(r => {
        this.candidates = r.data || []
        const ids = this.candidates.map(item => item.ruleId)
        this.form.ruleIds = (this.form.ruleIds || []).filter(id => ids.includes(id))
      }).catch(() => { this.candidates = [] }).finally(() => { this.candidateLoading = false })
    },
    /** 新增 */
    handleAdd() {
      this.form = blank()
      this.candidates = []
      this.tableOptions = []
      this.open = true
      this.$nextTick(() => {
        this.$refs.taskForm.clearValidate()
        this.searchTables('')
      })
    },
    /** 修改 */
    handleUpdate(row) {
      this.form = blank()
      this.candidates = []
      this.tableOptions = []
      getTask(row.taskId).then(r => {
        const task = r.data
        this.form = {
          taskId: task.taskId,
          taskName: task.taskName,
          sourceKey: task.sourceId == null ? 'local' : String(task.sourceId),
          dbName: task.dbName,
          tableName: task.tableName,
          limitRows: task.limitRows,
          enabled: !!task.enabled,
          cronExpression: task.cronExpression || '',
          misfirePolicy: task.misfirePolicy || 'SKIP',
          remark: task.remark || '',
          ruleIds: task.ruleIds || []
        }
        this.candidates = task.rules || []
        this.tableOptions = [{ tableName: task.tableName }]
        this.open = true
        this.$nextTick(() => this.$refs.taskForm.clearValidate())
      }).catch(() => {})
    },
    /** 提交任务 */
    submitForm() {
      this.$refs.taskForm.validate(valid => {
        if (!valid) return
        if (!this.form.ruleIds || this.form.ruleIds.length === 0) return this.$message.error('请至少选择一条规则')
        if (this.form.enabled && !this.form.cronExpression) return this.$message.error('启用定时调度前请填写 Cron 表达式')
        if (this.form.enabled) {
          const parts = this.form.cronExpression.trim().split(/\s+/)
          if (parts.length !== 6) return this.$message.error('Cron 表达式必须为六段：秒 分 时 日 月 周')
        }
        this.saving = true
        const save = this.form.taskId ? updateTask : addTask
        save(this.payload()).then(() => {
          this.$message.success(this.form.taskId ? '任务已修改' : '任务已创建')
          this.open = false
          this.getList()
        }).catch(() => {}).finally(() => { this.saving = false })
      })
    },
    /** 内置本地数据源以 null 提交，外部数据源提交数字ID */
    payload() {
      const payload = { ...this.form, sourceId: this.form.sourceKey === 'local' ? null : Number(this.form.sourceKey) }
      delete payload.sourceKey
      return payload
    },
    /** 启用 / 停用 */
    handleStatusChange(row) {
      if (row.enabled && !row.cronExpression) {
        row.enabled = false
        return this.$message.warning('请先修改任务并设置 Cron 表达式')
      }
      const enabled = row.enabled
      changeTaskStatus({ taskId: row.taskId, enabled, cronExpression: row.cronExpression }).then(() => {
        this.$message.success(enabled ? '已启用定时调度' : '已停用定时调度')
      }).catch(() => { row.enabled = !enabled })
    },
    /** 手动触发 */
    handleRun(row) {
      this.$confirm('立即执行任务“' + row.taskName + '”？执行在后台进行，可在运行历史查看结果。', '执行任务', { type: 'warning' })
        .then(() => runTask(row.taskId))
        .then(r => {
          const run = r.data || {}
          if (run.status === 'SKIPPED') {
            this.$message.warning('已有批次正在运行，本次触发已跳过（批次 #' + run.runId + '）')
          } else {
            this.$message.success('任务已提交，运行批次 #' + run.runId)
          }
          this.openRuns(row)
        }).catch(() => {})
    },
    /** 删除任务 */
    handleDelete(row) {
      this.$confirm('确认删除任务“' + row.taskName + '”？历史运行批次与已生成报告会保留。', '删除任务', { type: 'warning' })
        .then(() => delTask(row.taskId))
        .then(() => { this.getList(); this.$message.success('任务已删除') }).catch(() => {})
    },
    /** Cron 生成器 */
    handleShowCron() {
      this.cronDraft = this.form.cronExpression
      this.openCron = true
    },
    crontabFill(value) {
      const parts = (value || '').trim().split(/\s+/)
      if (parts.length === 7) {
        if (parts[6] !== '*') {
          return this.$message.warning('后端不支持按年份调度，请将年份设为 *')
        }
        this.form.cronExpression = parts.slice(0, 6).join(' ')
      } else {
        this.form.cronExpression = parts.join(' ')
      }
    },
    /** 打开运行历史 */
    openRuns(row) {
      this.runsTaskId = row.taskId
      this.runsTaskName = row.taskName
      this.runQuery = { pageNum: 1, pageSize: 10, taskId: row.taskId, status: undefined }
      this.runList = []
      this.runTotal = 0
      this.runsOpen = true
      this.getRuns()
    },
    searchRuns() {
      this.runQuery.pageNum = 1
      this.getRuns()
    },
    getRuns(silent) {
      if (!silent) this.runLoading = true
      return listTaskRuns(this.runQuery).then(r => {
        this.runList = r.rows || []
        this.runTotal = Number(r.total)
      }).catch(() => {}).finally(() => {
        if (!silent) this.runLoading = false
        this.schedulePoll()
      })
    },
    schedulePoll() {
      this.clearPoll()
      if (!this.runsOpen || !this.runList.some(item => item.status === 'RUNNING')) return
      this.pollTimer = setTimeout(() => { if (this.runsOpen) this.getRuns(true) }, 4000)
    },
    clearPoll() {
      if (this.pollTimer) {
        clearTimeout(this.pollTimer)
        this.pollTimer = null
      }
    },
    closeRuns() {
      this.clearPoll()
      this.runList = []
      this.getList()
    },
    openRunDetail(row) {
      this.runDetail = {}
      this.runDetailOpen = true
      this.runDetailLoading = true
      getTaskRun(row.runId).then(r => { this.runDetail = r.data || {} })
        .catch(() => {}).finally(() => { this.runDetailLoading = false })
    },
    handleDeleteRun(row) {
      this.$confirm('确认删除运行批次 #' + row.runId + '？已生成的规则报告不会被删除。', '删除运行批次', { type: 'warning' })
        .then(() => delTaskRun(row.runId))
        .then(() => { this.getRuns(); this.$message.success('运行批次已删除') }).catch(() => {})
    },
    openReport(row) {
      this.report = { executionId: row.executionId }
      this.reportOpen = true
      this.reportLoading = true
      getReport(row.executionId).then(r => { this.report = r.data || {} })
        .catch(() => {}).finally(() => { this.reportLoading = false })
    }
  }
}
</script>

<style scoped>
.task-note {
  margin-bottom: 12px;
}
.sub-text {
  color: #909399;
  font-size: 12px;
}
.drawer-body {
  padding: 0 20px 20px;
}
.drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.detail-meta {
  color: #606266;
  font-size: 13px;
  margin-bottom: 16px;
}
.detail-meta span {
  margin-right: 20px;
}
.summary-cards {
  display: flex;
  flex-wrap: wrap;
  margin: 12px 0;
}
.summary-card {
  flex: 1 1 18%;
  min-width: 120px;
  margin: 0 10px 10px 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  text-align: center;
}
.summary-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}
.summary-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.summary-value.danger {
  color: #f56c6c;
}
</style>
