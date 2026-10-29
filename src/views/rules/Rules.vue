<template>
  <div class="app-container rule-page">
    <!-- 页头：标题 + 主操作 -->
    <div class="page-head">
      <div class="page-head__info">
        <div class="page-head__title">质量规则</div>
        <div class="page-head__desc">按质量维度管理字段级校验，支持模板向导与自定义 DRL</div>
      </div>
      <div class="page-head__actions">
        <el-button
          size="small"
          icon="el-icon-download"
          @click="handleExport"
          v-hasPermi="['dqservice:rule:export']"
        >导出</el-button>
        <el-dropdown
          v-if="checkPermi(['dqservice:rule:add'])"
          trigger="click"
          @command="handleCreateCommand"
        >
          <el-button type="primary" size="small" icon="el-icon-plus">
            新建规则<i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="template" icon="el-icon-magic-stick">从规则模板创建</el-dropdown-item>
            <el-dropdown-item
              command="custom"
              icon="el-icon-edit-outline"
              v-if="checkPermi(['dqservice:rule:custom'])"
            >自定义 DRL 规则</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card v-show="showSearch" shadow="never" class="dq-card filter-card">
      <el-form ref="queryForm" :model="queryParams" size="small" label-width="72px" class="filter-form">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="规则名称" prop="ruleName">
              <el-input
                v-model="queryParams.ruleName"
                placeholder="支持模糊匹配"
                clearable
                @keyup.enter.native="handleQuery"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="数据库名" prop="dbName">
              <el-input
                v-model="queryParams.dbName"
                placeholder="如 dq_reference"
                clearable
                @keyup.enter.native="handleQuery"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="表名" prop="tableName">
              <el-input
                v-model="queryParams.tableName"
                placeholder="支持模糊匹配"
                clearable
                @keyup.enter.native="handleQuery"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="字段名" prop="columnName">
              <el-input
                v-model="queryParams.columnName"
                placeholder="支持模糊匹配"
                clearable
                @keyup.enter.native="handleQuery"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="创建人" prop="userName">
              <el-input
                v-model="queryParams.userName"
                placeholder="支持模糊匹配"
                clearable
                @keyup.enter.native="handleQuery"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label-width="0" class="filter-form__actions">
              <el-button type="primary" icon="el-icon-search" @click="handleQuery">查询</el-button>
              <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 规则列表 -->
    <el-card shadow="never" class="dq-card table-card">
      <div class="table-toolbar">
        <div class="table-toolbar__left">
          <el-button
            size="mini"
            plain
            icon="el-icon-edit"
            :disabled="single"
            @click="handleUpdate()"
            v-hasPermi="['dqservice:rule:edit']"
          >批量修改</el-button>
          <el-button
            size="mini"
            type="danger"
            plain
            icon="el-icon-delete"
            :disabled="multiple"
            @click="handleDelete()"
            v-hasPermi="['dqservice:rule:remove']"
          >批量删除</el-button>
          <span v-if="ids.length" class="table-toolbar__hint">已选 {{ ids.length }} 项</span>
        </div>
        <div class="table-toolbar__right">
          <span class="table-toolbar__total">共 {{ total }} 条</span>
          <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="ruleList"
        row-key="ruleId"
        stripe
        class="rule-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="规则" min-width="180">
          <template slot-scope="scope">
            <div class="rule-name">{{ scope.row.ruleName || '未命名规则' }}</div>
            <div class="rule-sub">
              <el-tag size="mini" type="info" effect="plain">{{ scope.row.typeName || '自定义规则' }}</el-tag>
              <span class="rule-id">#{{ scope.row.ruleId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="检测对象" min-width="210">
          <template slot-scope="scope">
            <div class="cell-line">
              <span class="cell-strong">{{ (scope.row.dbName || '-') + '.' + (scope.row.tableName || '-') }}</span>
              <el-tooltip
                :content="scope.row.sourceName || (scope.row.sourceId ? '外部连接 #' + scope.row.sourceId : '内置本地数据源')"
                placement="top"
              >
                <el-tag
                  size="mini"
                  effect="plain"
                  :type="scope.row.sourceId ? 'warning' : 'info'"
                >{{ scope.row.sourceId ? '外部' : '本地' }}</el-tag>
              </el-tooltip>
            </div>
            <div class="cell-sub">字段：{{ scope.row.columnName || '多字段' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="质量维度" min-width="160">
          <template slot-scope="scope">
            <template v-if="dimensionList(scope.row.qualityDimensions).length">
              <el-tag
                v-for="dimension in dimensionList(scope.row.qualityDimensions).slice(0, 2)"
                :key="dimension"
                size="mini"
                class="dim-tag"
              >{{ dimension }}</el-tag>
              <el-tooltip
                v-if="dimensionList(scope.row.qualityDimensions).length > 2"
                :content="dimensionList(scope.row.qualityDimensions).join('、')"
              >
                <el-tag size="mini" type="info">+{{ dimensionList(scope.row.qualityDimensions).length - 2 }}</el-tag>
              </el-tooltip>
            </template>
            <span v-else class="cell-sub">未分类</span>
          </template>
        </el-table-column>
        <el-table-column v-if="showOwner" label="创建人" width="100" show-overflow-tooltip>
          <template slot-scope="scope">
            <span class="cell-strong">{{ scope.row.userName || '-' }}</span>
            <span v-if="scope.row.userId" class="rule-id"> #{{ scope.row.userId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="165" fixed="right" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="text"
              icon="el-icon-video-play"
              v-hasPermi="['dqservice:rule:execute']"
              @click="handleExecute(scope.row)"
            >执行</el-button>
            <el-button size="mini" type="text" icon="el-icon-document" @click="handleDetail(scope.row)">详情</el-button>
            <el-dropdown trigger="click" class="op-more" @command="command => handleRowCommand(command, scope.row)">
              <span class="op-more__trigger">更多<i class="el-icon-arrow-down"></i></span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="edit" v-if="checkPermi(['dqservice:rule:edit'])">{{ scope.row.templateParams ? '编辑参数' : '修改 DRL' }}</el-dropdown-item>
                <el-dropdown-item command="delete" divided v-if="checkPermi(['dqservice:rule:remove'])">删除</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
        <template slot="empty">
          <div class="rule-empty">
            <i class="el-icon-folder-opened rule-empty__icon"></i>
            <p class="rule-empty__title">{{ hasFilter ? '没有符合条件的规则' : '还没有创建任何规则' }}</p>
            <p class="rule-empty__desc">{{ hasFilter ? '试试更换筛选条件，或重置后重新查询' : '可以从规则模板快速创建，也支持手写 DRL' }}</p>
            <el-button
              v-if="!hasFilter"
              size="small"
              type="primary"
              plain
              @click="handleAdd2"
              v-hasPermi="['dqservice:rule:add']"
            >从规则模板创建</el-button>
          </div>
        </template>
      </el-table>

      <pagination
        v-show="total>0"
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getList"
      />
    </el-card>

    <!-- 新增自定义规则：手写 DRL 主体，保存前做语法检查 -->
    <el-dialog title="新增自定义规则" :visible.sync="openDIY" width="820px" append-to-body>
      <div class="dialog-tip">
        <i class="el-icon-info"></i>
        只需编写 rule ... end 主体，package / import / global 由系统自动补全；then 中通过 violations.add(...) 写出违规记录。
      </div>
      <el-form ref="customForm" :model="customForm" :rules="customRules" label-width="90px">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="customForm.ruleName" placeholder="请输入规则名称" />
        </el-form-item>
        <el-row :gutter="16">
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
          <div class="form-tip">违规记录的 rowId 必须取自当前数据行的 __rowId 字段；自定义规则不自动归入质量维度。</div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button :loading="checkLoading" icon="el-icon-check" @click="handleCheckDrl(customForm.ruleBody)">语法检查</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitCustomForm">确 定</el-button>
        <el-button @click="openDIY = false">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 修改规则：只编辑 DRL 主体，改过内容即转为自定义规则 -->
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

    <!-- 规则详情：只读展示配置与 DRL 主体 -->
    <el-dialog title="规则详情" :visible.sync="detailOpen" width="880px" append-to-body>
      <el-descriptions :column="2" border size="small" class="detail-desc">
        <el-descriptions-item label="规则编号">{{ detailRule.ruleId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规则名称">{{ detailRule.ruleName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规则类型">{{ detailRule.typeName || '自定义规则' }}</el-descriptions-item>
        <el-descriptions-item label="数据源">{{ detailRule.sourceName || (detailRule.sourceId ? '外部连接 #' + detailRule.sourceId : '内置本地数据源') }}</el-descriptions-item>
        <el-descriptions-item label="检测对象" :span="2">
          {{ (detailRule.dbName || '-') + ' . ' + (detailRule.tableName || '-') }}
          <span class="form-text form-text-sub">字段：{{ detailRule.columnName || '多字段' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="质量维度" :span="2">
          <template v-if="dimensionList(detailRule.qualityDimensions).length">
            <el-tag v-for="dimension in dimensionList(detailRule.qualityDimensions)" :key="dimension" size="mini" class="dim-tag">{{ dimension }}</el-tag>
          </template>
          <span v-else class="cell-sub">未分类</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailRule.createTime ? parseTime(detailRule.createTime, '{y}-{m}-{d} {h}:{i}') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ detailRule.updateTime ? parseTime(detailRule.updateTime, '{y}-{m}-{d} {h}:{i}') : '-' }}</el-descriptions-item>
      </el-descriptions>

      <template v-if="detailRule.templateParams">
        <div class="section-title">模板参数</div>
        <el-table :data="parseQualityJson(detailRule.templateParams, [])" size="mini" border>
          <el-table-column prop="field" label="字段" />
          <el-table-column prop="template" label="模板编码" />
          <el-table-column label="参数与参考依据"><template slot-scope="s">{{ JSON.stringify(s.row.params) }}</template></el-table-column>
        </el-table>
      </template>

      <div class="section-title">规则内容（只读 DRL 预览）</div>
      <pre class="drl-pre">{{ detailRule.ruleBody }}</pre>
      <div class="form-tip">质量维度由模板配置识别；自定义或无法识别的规则显示「未分类」，不代表没有违规。</div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailOpen = false">关 闭</el-button>
      </div>
    </el-dialog>

    <!-- 规则执行结果 -->
    <el-dialog title="质量检测结果" :visible.sync="execOpen" width="960px" append-to-body>
      <div v-loading="execLoading" element-loading-text="规则执行中...">
        <div class="exec-meta">
          <div class="exec-meta__item">
            <span class="exec-meta__label">规则</span>
            <span class="exec-meta__value">{{ execResult.ruleName || '-' }}</span>
          </div>
          <div class="exec-meta__item">
            <span class="exec-meta__label">数据表</span>
            <span class="exec-meta__value">{{ (execResult.dbName ? execResult.dbName + '.' : '') + (execResult.tableName || '-') }}</span>
          </div>
          <div class="exec-meta__item">
            <span class="exec-meta__label">最多扫描</span>
            <el-select v-model="execLimit" :disabled="execLoading" size="mini" style="width: 112px" @change="runExecute">
              <el-option :value="100" label="100 行" />
              <el-option :value="1000" label="1000 行" />
              <el-option :value="5000" label="5000 行" />
              <el-option :value="10000" label="10000 行" />
            </el-select>
          </div>
        </div>

        <div class="exec-summary">
          <div class="exec-card">
            <div class="exec-card__label"><i class="el-icon-view"></i>实际扫描行数</div>
            <div class="exec-card__value">{{ execResult.totalRows || 0 }}</div>
          </div>
          <div class="exec-card exec-card--danger">
            <div class="exec-card__label"><i class="el-icon-warning-outline"></i>违规条数</div>
            <div class="exec-card__value">{{ execResult.violationCount || 0 }}</div>
          </div>
          <div class="exec-card exec-card--warning">
            <div class="exec-card__label"><i class="el-icon-position"></i>违规行数</div>
            <div class="exec-card__value">{{ execResult.violationRows || 0 }}</div>
          </div>
          <div class="exec-card exec-card--rate">
            <div class="exec-card__label"><i class="el-icon-data-line"></i>行通过率</div>
            <div class="exec-card__value">
              <el-tag :type="passRateTagType" size="medium">{{ passRateText }}</el-tag>
            </div>
          </div>
        </div>

        <el-alert title="统计口径" :description="statisticsNote" type="info" :closable="false" show-icon class="statistics-note" />

        <EvaluationDetail v-if="!execLoading" :record="execResult" />

        <div class="exec-section">
          <span class="section-title section-title--inline">字段违规分布（按条数）</span>
          <el-tag
            v-for="item in execResult.fieldStats"
            :key="item.field"
            type="danger"
            size="small"
            class="exec-field-tag"
          >{{ item.field }} · {{ item.count }} 条</el-tag>
          <span v-if="!execResult.fieldStats || execResult.fieldStats.length === 0" class="exec-empty">{{ emptyViolationText(execResult) }}</span>
        </div>

        <div class="section-title">违规明细（{{ execResult.violationCount || 0 }} 条）</div>
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
      // 视口宽度：窄屏下隐藏次要列，避免表格必须横向滚动才能看到操作
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
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
      // 查询参数：与 RuleMapper 的过滤字段保持一致，避免出现无效筛选项
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        ruleName: null,
        dbName: null,
        tableName: null,
        columnName: null,
        userName: null
      }
    };
  },
  computed: {
    passRateText() {
      return rateText(this.execResult)
    },
    passRateTagType() {
      return rateTagType(this.execResult)
    },
    hasFilter() {
      return ['ruleName', 'dbName', 'tableName', 'columnName', 'userName']
        .some(key => !!this.queryParams[key])
    },
    showOwner() {
      return this.screenWidth >= 1200
    }
  },
  created() {
    this.getList();
  },
  mounted() {
    if (typeof window !== 'undefined') window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    checkPermi,
    parseQualityJson,
    fieldValueText,
    dimensionsText,
    emptyViolationText,
    /** 把「完整性、唯一性」拆成标签数组；未分类返回空数组 */
    dimensionList(dimensions) {
      const text = this.dimensionsText(dimensions)
      return text === '未分类' ? [] : text.split('、')
    },
    /** 窄屏收起次要列 */
    handleResize() {
      this.screenWidth = window.innerWidth;
    },
    /** 查询规则列表 */
    getList() {
      this.loading = true;
      listRule(this.queryParams).then(response => {
        this.ruleList = response.rows;
        this.total = response.total;
        this.loading = false;
      }).catch(() => {
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
    /** 页头「新建规则」下拉：模板向导 / 自定义 DRL */
    handleCreateCommand(command) {
      if (command === 'custom') this.handleAdd()
      else this.handleAdd2()
    },
    /** 行内「更多」下拉 */
    handleRowCommand(command, row) {
      if (command === 'edit') this.handleUpdate(row)
      else if (command === 'delete') this.handleDelete(row)
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
    /** 删除规则：行内传对象，工具栏无参时取选中项 */
    handleDelete(row) {
      const ruleIds = (row && row.ruleId) ? row.ruleId : this.ids;
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
/* 统一使用语义化变量，避免散落的十六进制色值 */
.rule-page {
  --dq-primary: #409eff;
  --dq-danger: #f56c6c;
  --dq-warning: #e6a23c;
  --dq-text: #303133;
  --dq-text-2: #606266;
  --dq-text-3: #909399;
  --dq-border: #ebeef5;
  --dq-bg-soft: #f5f7fa;
  --dq-radius: 8px;
}

/* 页头 */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-head__title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--dq-text);
}
.page-head__desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--dq-text-3);
}
.page-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 卡片容器 */
.dq-card {
  border: 1px solid var(--dq-border);
  border-radius: var(--dq-radius);
}
.dq-card + .dq-card {
  margin-top: 12px;
}
.dq-card >>> .el-card__body {
  padding: 16px 18px;
}

/* 筛选区 */
.filter-form >>> .el-form-item {
  margin-bottom: 12px;
}
.filter-form__actions >>> .el-form-item__content {
  display: flex;
  gap: 8px;
}

/* 工具条 */
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.table-toolbar__left,
.table-toolbar__right {
  display: flex;
  align-items: center;
}
.table-toolbar__hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--dq-text-3);
}
.table-toolbar__total {
  margin-right: 10px;
  font-size: 12px;
  color: var(--dq-text-3);
}

/* 表格 */
.rule-table >>> th.el-table__cell {
  background: #fafbfc;
  color: var(--dq-text-2);
  font-weight: 600;
}
.rule-table >>> td.el-table__cell {
  padding: 10px 0;
}
.rule-name {
  font-weight: 600;
  color: var(--dq-text);
}
.rule-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.rule-id {
  font-size: 12px;
  color: var(--dq-text-3);
}
.cell-strong {
  color: var(--dq-text);
}
.cell-sub {
  font-size: 12px;
  line-height: 18px;
  color: var(--dq-text-3);
}
.cell-sub--flex {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cell-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.cell-line .cell-strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dim-tag {
  margin-right: 6px;
}
.op-more {
  display: inline-block;
  margin-left: 8px;
}
.op-more__trigger {
  font-size: 12px;
  color: var(--dq-primary);
  cursor: pointer;
}

/* 空状态 */
.rule-empty {
  padding: 36px 0;
  text-align: center;
}
.rule-empty__icon {
  font-size: 42px;
  color: #c0c4cc;
}
.rule-empty__title {
  margin: 12px 0 4px;
  font-size: 14px;
  color: var(--dq-text-2);
}
.rule-empty__desc {
  margin-bottom: 16px;
  font-size: 12px;
  color: var(--dq-text-3);
}

/* 弹窗通用 */
.dialog-tip {
  margin-bottom: 16px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dq-text-2);
  background: var(--dq-bg-soft);
  border-left: 3px solid var(--dq-primary);
  border-radius: 4px;
}
.dialog-tip i {
  margin-right: 4px;
  color: var(--dq-primary);
}
.section-title {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dq-text);
}
.section-title--inline {
  display: inline-block;
  margin: 0 8px 0 0;
}
.form-tip {
  font-size: 12px;
  line-height: 18px;
  color: var(--dq-text-3);
}
.form-text {
  font-size: 13px;
  color: var(--dq-text-2);
}
.form-text-sub {
  margin-left: 16px;
  color: var(--dq-text-3);
}

/* DRL 编辑器与只读预览 */
.drl-editor >>> .el-textarea__inner {
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 12px;
  line-height: 18px;
}
.drl-pre {
  max-height: 360px;
  overflow: auto;
  margin: 0;
  padding: 14px 16px;
  white-space: pre;
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 12px;
  line-height: 20px;
  color: #e6edf3;
  background: #1e2430;
  border-radius: var(--dq-radius);
}

/* 执行结果 */
.exec-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--dq-bg-soft);
  border-radius: var(--dq-radius);
}
.exec-meta__item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.exec-meta__label {
  font-size: 12px;
  color: var(--dq-text-3);
}
.exec-meta__value {
  font-size: 13px;
  font-weight: 500;
  color: var(--dq-text);
}
.exec-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.exec-card {
  position: relative;
  flex: 1 1 150px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid var(--dq-border);
  border-radius: var(--dq-radius);
}
.exec-card::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--dq-primary);
  border-radius: 3px 0 0 3px;
  content: "";
}
.exec-card--danger::before {
  background: var(--dq-danger);
}
.exec-card--warning::before {
  background: var(--dq-warning);
}
.exec-card__label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--dq-text-3);
}
.exec-card__value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--dq-text);
}
.exec-card--danger .exec-card__value {
  color: var(--dq-danger);
}
.exec-card--warning .exec-card__value {
  color: var(--dq-warning);
}
.statistics-note {
  margin-bottom: 16px;
}
.exec-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 4px;
}
.exec-field-tag {
  margin: 0 8px 6px 0;
}
.exec-empty {
  font-size: 12px;
  color: var(--dq-text-3);
}
.exec-row-detail {
  padding: 0 16px;
}
.exec-row-detail .el-form-item {
  margin-right: 16px;
  margin-bottom: 0;
}

/* 窄屏适配 */
@media (max-width: 768px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .exec-card {
    flex: 1 1 45%;
  }
}
</style>
