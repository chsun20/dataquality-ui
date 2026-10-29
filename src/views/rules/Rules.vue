<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="规则名称" prop="ruleName">
        <el-input
          v-model="queryParams.ruleName"
          placeholder="请输入规则名称"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="用户名" prop="userName">
        <el-input
          v-model="queryParams.userName"
          placeholder="请输入用户名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="数据库名" prop="dbName">
        <el-input
          v-model="queryParams.dbName"
          placeholder="请输入数据库名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="表名" prop="tableName">
        <el-input
          v-model="queryParams.tableName"
          placeholder="请输入表名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="字段名" prop="columnName">
        <el-input
          v-model="queryParams.columnName"
          placeholder="请输入字段名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker clearable
                        v-model="queryParams.createTime"
                        type="date"
                        value-format="yyyy-MM-dd"
                        placeholder="请选择创建时间">
        </el-date-picker>
      </el-form-item>
      <el-form-item label="更新时间" prop="updateTime">
        <el-date-picker clearable
                        v-model="queryParams.updateTime"
                        type="date"
                        value-format="yyyy-MM-dd"
                        placeholder="请选择更新时间">
        </el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="el-icon-plus"
          size="mini"
          @click="handleAdd"
          v-if="checkPermi(['dqservice:rule:custom'])"
          v-hasPermi="['dqservice:rule:add']"
        >新增自定义规则</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="el-icon-plus"
          size="mini"
          @click="handleAdd2"
          v-hasPermi="['dqservice:rule:add']"
        >从规则模板中创建</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="el-icon-edit"
          size="mini"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['dqservice:rule:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="el-icon-delete"
          size="mini"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['dqservice:rule:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="el-icon-download"
          size="mini"
          @click="handleExport"
          v-hasPermi="['dqservice:rule:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="ruleList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="规则id" align="center" prop="ruleId" width="60" />
      <el-table-column label="规则名称" align="center" prop="ruleName" min-width="150" show-overflow-tooltip />
      <el-table-column label="规则类型" align="center" prop="typeName" width="110" />
      <el-table-column label="数据源" min-width="140" show-overflow-tooltip><template slot-scope="s">{{ s.row.sourceName || (s.row.sourceId ? '外部连接 #' + s.row.sourceId : '内置本地数据源') }}</template></el-table-column>
      <el-table-column label="配置维度" align="center" min-width="170" show-overflow-tooltip>
        <template slot-scope="scope">{{ dimensionsText(scope.row.qualityDimensions) }}</template>
      </el-table-column>
      <el-table-column label="用户id" align="center" prop="userId" width="80" />
      <el-table-column label="用户名" align="center" prop="userName" width="110" show-overflow-tooltip />
      <el-table-column label="创建时间" align="center" prop="createTime" width="100">
        <template slot-scope="scope">
          <span>{{ scope.row.createTime ? parseTime(scope.row.createTime, '{y}-{m}-{d}') : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" align="center" prop="updateTime" width="145">
        <template slot-scope="scope">
          <span>{{ scope.row.updateTime ? parseTime(scope.row.updateTime, '{y}-{m}-{d} {h}:{i}') : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="240" fixed="right">
        <template slot-scope="scope">
          <el-button
            size="mini"
            type="text"
            icon="el-icon-video-play"
            v-hasPermi="['dqservice:rule:execute']"
            @click="handleExecute(scope.row)"
          >执行</el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-document"
            @click="handleDetail(scope.row)"
          >详情</el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-edit"
            @click="handleUpdate(scope.row)"
            v-hasPermi="['dqservice:rule:edit']"
          >{{ scope.row.templateParams ? '编辑参数' : '修改 DRL' }}</el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['dqservice:rule:remove']"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total>0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 新增自定义规则对话框：手写 DRL 主体，保存前做语法检查 -->
    <el-dialog :title="customTitle" :visible.sync="openDIY" width="820px" append-to-body>
      <el-form ref="customForm" :model="customForm" :rules="customRules" label-width="90px">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="customForm.ruleName" placeholder="请输入规则名称" />
        </el-form-item>
        <el-row>
          <el-col :span="12">
            <el-form-item label="数据库名" prop="dbName">
              <el-input v-model="customForm.dbName" placeholder="请输入数据库名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="表名" prop="tableName">
              <el-input v-model="customForm.tableName" placeholder="请输入数据表名" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="规则内容" prop="ruleBody">
          <el-input v-model="customForm.ruleBody" type="textarea" :rows="16" class="drl-editor"
                    placeholder="请输入 rule ... end 主体部分" />
          <div class="form-tip">只需编写 rule ... end 主体，package / import / global 由系统自动补全；then 中需通过 violations.add(...) 写出违规记录。</div>
          <div class="form-tip">违规记录的 rowId 必须取自当前数据行的 __rowId 字段；自定义规则不自动归入质量维度。</div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button :loading="checkLoading" icon="el-icon-check" @click="handleCheckDrl(customForm.ruleBody)">语法检查</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitCustomForm">确 定</el-button>
        <el-button @click="openDIY = false">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 修改规则对话框：只编辑 DRL 主体，改过内容即转为自定义规则 -->
    <el-dialog title="修改规则" :visible.sync="open" width="820px" append-to-body>
      <el-form ref="editForm" :model="editForm" :rules="editRules" label-width="90px">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="editForm.ruleName" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="所属数据表">
          <span class="form-text">{{ (editForm.dbName || '-') + ' . ' + (editForm.tableName || '-') }}</span>
          <span class="form-text form-text-sub">检测字段：{{ editForm.columnName || '-' }}</span>
        </el-form-item>
        <el-form-item label="规则内容" prop="ruleBody">
          <el-input v-model="editForm.ruleBody" type="textarea" :rows="16" class="drl-editor" />
          <div class="form-tip">仅编辑 rule ... end 主体；内容一旦改动，规则类型将变更为「自定义规则」。</div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button :loading="checkLoading" icon="el-icon-check" @click="handleCheckDrl(editForm.ruleBody)">语法检查</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitEditForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 规则详情对话框：只读展示 DRL 主体 -->
    <el-dialog title="规则详情" :visible.sync="detailOpen" width="880px" append-to-body>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="规则id">{{ detailRule.ruleId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规则名称">{{ detailRule.ruleName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规则类型">{{ detailRule.typeName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数据源">{{ detailRule.sourceName || '内置本地数据源' }}</el-descriptions-item>
        <el-descriptions-item label="配置维度">{{ dimensionsText(detailRule.qualityDimensions) }}</el-descriptions-item>
        <el-descriptions-item label="检测字段">{{ detailRule.columnName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数据库名">{{ detailRule.dbName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="表名">{{ detailRule.tableName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ parseTime(detailRule.createTime, '{y}-{m}-{d} {h}:{i}') }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ parseTime(detailRule.updateTime, '{y}-{m}-{d} {h}:{i}') }}</el-descriptions-item>
      </el-descriptions>
      <div class="form-tip">质量维度由模板配置识别；自定义或无法识别的规则显示“未分类”，不代表没有违规。</div>
      <el-table v-if="detailRule.templateParams" :data="parseQualityJson(detailRule.templateParams, [])" size="mini" border>
        <el-table-column prop="field" label="字段" /><el-table-column prop="template" label="模板编码" />
        <el-table-column label="参数与参考依据"><template slot-scope="s">{{ JSON.stringify(s.row.params) }}</template></el-table-column>
      </el-table>
      <div class="drl-detail-title">规则内容（只读 DRL 预览）</div>
      <pre class="drl-pre">{{ detailRule.ruleBody }}</pre>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailOpen = false">关 闭</el-button>
      </div>
    </el-dialog>

    <!-- 规则执行结果对话框 -->
    <el-dialog title="质量检测结果" :visible.sync="execOpen" width="960px" append-to-body>
      <div v-loading="execLoading" element-loading-text="规则执行中...">
        <div class="exec-meta">
          <span>规则：{{ execResult.ruleName }}</span>
          <span>数据表：{{ (execResult.dbName ? execResult.dbName + '.' : '') + (execResult.tableName || '-') }}</span>
          <span class="exec-limit">
            最多扫描：
            <el-select v-model="execLimit" :disabled="execLoading" size="mini" style="width: 110px" @change="runExecute">
              <el-option :value="100" label="100 行" />
              <el-option :value="1000" label="1000 行" />
              <el-option :value="5000" label="5000 行" />
              <el-option :value="10000" label="10000 行" />
            </el-select>
          </span>
        </div>

        <EvaluationDetail v-if="!execLoading" :record="execResult" />
        <div class="exec-summary">
          <div class="exec-card">
            <div class="exec-label">实际扫描行数</div>
            <div class="exec-value">{{ execResult.totalRows || 0 }}</div>
          </div>
          <div class="exec-card">
            <div class="exec-label">违规条数</div>
            <div class="exec-value exec-danger">{{ execResult.violationCount || 0 }}</div>
          </div>
          <div class="exec-card">
            <div class="exec-label">违规行数</div>
            <div class="exec-value">{{ execResult.violationRows || 0 }}</div>
          </div>
          <div class="exec-card">
            <div class="exec-label">行通过率</div>
            <div class="exec-value">
              <el-tag :type="passRateTagType" size="medium">{{ passRateText }}</el-tag>
            </div>
          </div>
        </div>

        <el-alert title="统计口径" :description="statisticsNote" type="info" :closable="false" show-icon class="statistics-note" />

        <div class="exec-section">
          <span class="exec-section-title">字段违规分布（按条数）：</span>
          <el-tag
            v-for="item in execResult.fieldStats"
            :key="item.field"
            type="danger"
            size="small"
            class="exec-field-tag"
          >{{ item.field }} · {{ item.count }} 条</el-tag>
          <span v-if="!execResult.fieldStats || execResult.fieldStats.length === 0" class="exec-empty">{{ emptyViolationText(execResult) }}</span>
        </div>

        <div class="exec-section-title exec-detail-title">违规明细（{{ execResult.violationCount || 0 }} 条）</div>
        <el-table :data="execResult.violations" size="mini" border max-height="380">
          <el-table-column type="expand">
            <template slot-scope="props">
              <el-form label-position="left" inline class="exec-row-detail">
                <el-form-item v-for="(value, key) in props.row.row" :key="key" :label="key">
                  <span>{{ fieldValueText(value) }}</span>
                </el-form-item>
              </el-form>
            </template>
          </el-table-column>
          <el-table-column label="行号" prop="rowId" width="70" align="center" />
          <el-table-column label="记录ID" width="90" align="center">
            <template slot-scope="scope">{{ scope.row.row ? scope.row.row.id : '-' }}</template>
          </el-table-column>
          <el-table-column label="违规字段" prop="field" width="160" align="center" />
          <el-table-column label="命中规则" prop="rule" align="center" />
          <el-table-column label="原因" prop="reason" min-width="150" />
          <el-table-column label="对比值" min-width="100"><template slot-scope="s">{{ fieldValueText(s.row.comparisonValue) }}</template></el-table-column>
          <el-table-column label="字段值" width="110" align="center">
            <template slot-scope="scope">
              <span>{{ fieldValueText(scope.row.row ? scope.row.row[scope.row.field] : undefined) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="execOpen = false">关 闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listRule, getRule, delRule, addRule, updateRule, executeRule, validateRule } from "@/api/dqservice/rule";
import { QUALITY_STATISTICS_NOTE, rateText, rateTagType, fieldValueText, dimensionsText, emptyViolationText, parseQualityJson } from '@/utils/quality'
import EvaluationDetail from './report/EvaluationDetail'
import { checkPermi } from '@/utils/permission'

export default {
  name: "Rule",
  components: { EvaluationDetail },
  activated() { this.getList() },
  data() {
    return {
      // 遮罩层
      loading: true,
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 规则表格数据
      ruleList: [],
      // 新增自定义规则弹窗
      openDIY: false,
      customTitle: "",
      customForm: { ruleName: null, dbName: null, tableName: null, ruleBody: "" },
      customRules: {
        ruleName: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
        tableName: [{ required: true, message: "请输入数据表名", trigger: "blur" }],
        ruleBody: [{ required: true, message: "请输入规则内容", trigger: "blur" }]
      },
      // 修改规则弹窗
      open: false,
      editForm: { ruleId: null, ruleName: null, dbName: null, tableName: null, columnName: null, ruleBody: "" },
      editRules: {
        ruleName: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
        ruleBody: [{ required: true, message: "请输入规则内容", trigger: "blur" }]
      },
      // 规则详情弹窗
      detailOpen: false,
      detailRule: {},
      // 提交与语法检查状态
      submitLoading: false,
      checkLoading: false,
      // 执行结果弹窗
      execOpen: false,
      execLoading: false,
      // 当前执行的规则与扫描行数（切换行数后重新执行会新增一条执行记录）
      execRuleId: null,
      execLimit: 1000,
      execResult: { violations: [], fieldStats: [] },
      statisticsNote: QUALITY_STATISTICS_NOTE,
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        ruleName: null,
        userName: null,
        createTime: null,
        updateTime: null
      }
    };
  },
  computed: {
    passRateText() {
      return rateText(this.execResult)
    },
    passRateTagType() {
      return rateTagType(this.execResult)
    }
  },
  created() {
    this.getList();
  },
  methods: {
    checkPermi,
    parseQualityJson,
    fieldValueText,
    dimensionsText,
    emptyViolationText,
    /** 查询规则列表 */
    getList() {
      this.loading = true;
      listRule(this.queryParams).then(response => {
        this.ruleList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    // 取消按钮
    cancel() {
      this.open = false;
      this.editForm = { ruleId: null, ruleName: null, dbName: null, tableName: null, columnName: null, ruleBody: "" };
    },
    /** 取 DRL 主体（rule ... end），去掉 package / import / global 头部 */
    drlBody(drl) {
      if (!drl) return "";
      const match = /(^|\n)[ \t]*rule[ \t]+"/.exec(drl);
      return (match ? drl.slice(match.index) : drl).trim();
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm("queryForm");
      this.handleQuery();
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.ruleId)
      this.single = selection.length!==1
      this.multiple = !selection.length
    },
    /** 执行规则并展示质量检测结果 */
    handleExecute(row) {
      this.execRuleId = row.ruleId
      this.execResult = {
        ruleName: row.ruleName,
        dbName: row.dbName,
        tableName: row.tableName,
        violations: [],
        fieldStats: []
      }
      this.execOpen = true
      this.runExecute()
    },
    /** 按当前扫描行数执行（切换行数时也会重跑） */
    runExecute() {
      if (!this.execRuleId || this.execLoading) return
      this.execLoading = true
      executeRule(this.execRuleId, { limit: this.execLimit }).then(response => {
        this.execResult = response.data
        this.execLoading = false
      }).catch(() => {
        this.execResult = { evaluationStatus: 'REQUEST_ERROR', errorMessage: '执行请求未成功返回，请在历史报告确认是否已生成批次后再重试。', violations: [], fieldStats: [] }
        this.execLoading = false
      })
    },
    /** 新增自定义规则：打开 DRL 编辑弹窗 */
    handleAdd() {
      this.customForm = { ruleName: null, dbName: null, tableName: null, ruleBody: "" };
      this.customTitle = "新增自定义规则";
      this.openDIY = true;
      this.$nextTick(() => this.$refs.customForm && this.$refs.customForm.clearValidate());
    },
    /** 从规则模板中创建：跳转到规则制作向导，由向导完成选表、选模板、填参数 */
    handleAdd2() {
      this.$router.push({ path: '/dq/ruleMaking' })
    },
    /** 修改：只回显 DRL 主体，不重建规则 */
    handleUpdate(row) {
      const ruleId = (row && row.ruleId) || this.ids[0]
      getRule(ruleId).then(response => {
        const rule = response.data || {};
        if (rule.templateParams && rule.templateCode !== 'custom') {
          this.$router.push({ path: '/dq/ruleMaking', query: { ruleId: rule.ruleId } })
          return
        }
        if (!checkPermi(['dqservice:rule:custom'])) return this.$message.error('自定义 DRL 仅允许可信管理员编辑')
        this.editForm = {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          dbName: rule.dbName,
          tableName: rule.tableName,
          columnName: rule.columnName,
          ruleBody: this.drlBody(rule.ruleContext)
        };
        this.open = true;
        this.$nextTick(() => this.$refs.editForm && this.$refs.editForm.clearValidate());
      });
    },
    /** 详情：只读展示 DRL 主体 */
    handleDetail(row) {
      this.detailRule = Object.assign({}, row, { ruleBody: this.drlBody(row.ruleContext) });
      this.detailOpen = true;
    },
    /** 语法检查：主体交给后端补全头部后编译 */
    handleCheckDrl(body) {
      if (!body || !body.trim()) {
        this.$modal.msgWarning("请先输入规则内容");
        return Promise.resolve(false);
      }
      this.checkLoading = true;
      return validateRule({ ruleContext: body })
        .then(() => {
          this.$modal.msgSuccess("语法检查通过，规则可正常编译");
          return true;
        })
        .catch(() => false)
        .finally(() => {
          this.checkLoading = false;
        });
    },
    /** 提交修改：内容改动后由后端将规则类型改为自定义规则 */
    submitEditForm() {
      this.$refs["editForm"].validate(valid => {
        if (!valid) return;
        this.submitLoading = true;
        updateRule({
          ruleId: this.editForm.ruleId,
          ruleName: this.editForm.ruleName,
          ruleContext: this.editForm.ruleBody
        }).then(() => {
          this.$modal.msgSuccess("修改成功");
          this.open = false;
          this.getList();
        }).catch(() => {}).finally(() => {
          this.submitLoading = false;
        });
      });
    },
    /** 提交自定义规则：先做语法检查，通过后再保存 */
    submitCustomForm() {
      this.$refs["customForm"].validate(valid => {
        if (!valid) return;
        this.submitLoading = true;
        validateRule({ ruleContext: this.customForm.ruleBody })
          .then(() => addRule({
            ruleName: this.customForm.ruleName,
            dbName: this.customForm.dbName,
            tableName: this.customForm.tableName,
            ruleContext: this.customForm.ruleBody,
            templateCode: "custom"
          }))
          .then(() => {
            this.$modal.msgSuccess("新增成功");
            this.openDIY = false;
            this.getList();
          })
          .catch(() => {})
          .finally(() => {
            this.submitLoading = false;
          });
      });
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const ruleIds = row.ruleId || this.ids;
      this.$modal.confirm('是否确认删除规则编号为"' + ruleIds + '"的数据项？').then(function() {
        return delRule(ruleIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("删除成功");
      }).catch(() => {});
    },
    /** 导出按钮操作 */
    handleExport() {
      this.download('dqservice/rule/export', {
        ...this.queryParams
      }, `rule_${new Date().getTime()}.xlsx`)
    }
  }
};
</script>

<style scoped>
.statistics-note {
  margin-bottom: 16px;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 18px;
}
.form-text {
  font-size: 13px;
  color: #606266;
}
.form-text-sub {
  margin-left: 24px;
}
/* 规则详情中的 DRL 主体 */
.drl-editor >>> .el-textarea__inner {
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 12px;
  line-height: 18px;
}
.drl-detail-title {
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.drl-pre {
  max-height: 380px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  white-space: pre;
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 12px;
  line-height: 18px;
  color: #303133;
}
.exec-meta {
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}
.exec-meta span + span {
  margin-left: 24px;
}
.exec-limit {
  display: inline-flex;
  align-items: center;
}
.exec-summary {
  display: flex;
  margin-bottom: 16px;
}
.exec-card {
  flex: 1;
  margin-right: 12px;
  padding: 12px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  text-align: center;
}
.exec-card:last-child {
  margin-right: 0;
}
.exec-label {
  font-size: 12px;
  color: #909399;
}
.exec-value {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.exec-danger {
  color: #f56c6c;
}
.exec-section {
  margin-bottom: 12px;
}
.exec-section-title {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.exec-detail-title {
  display: block;
  margin-bottom: 8px;
}
.exec-field-tag {
  margin-right: 8px;
  margin-left: 4px;
  margin-bottom: 6px;
}
.exec-empty {
  font-size: 12px;
  color: #909399;
}
.exec-row-detail {
  padding: 0 16px;
}
.exec-row-detail .el-form-item {
  margin-bottom: 0;
  margin-right: 16px;
}
</style>
