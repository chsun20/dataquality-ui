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
      <el-form-item label="数据表" prop="tableName">
        <el-input
          v-model="queryParams.tableName"
          placeholder="请输入数据表名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-alert title="统计口径" :description="statisticsNote" type="info" :closable="false" show-icon class="statistics-note" />

    <el-table v-loading="loading" :data="reportList">
      <el-table-column label="批次" prop="executionId" width="70" align="center" />
      <el-table-column label="规则名称" prop="ruleName" :show-overflow-tooltip="true" />
      <el-table-column label="数据源" prop="sourceName" min-width="120" show-overflow-tooltip />
      <el-table-column label="评价状态" width="130"><template slot-scope="s">{{ evaluationText(s.row) }}</template></el-table-column>
      <el-table-column label="数据表" prop="tableName" width="130" align="center" />
      <el-table-column label="实际扫描行数" prop="totalRows" width="110" align="center" />
      <el-table-column label="违规条数" prop="violationCount" width="90" align="center" />
      <el-table-column label="违规行数" prop="violationRows" width="90" align="center" />
      <el-table-column label="行通过率" width="140" align="center">
        <template slot-scope="scope">
          <el-tag :type="rateTagType(scope.row)" size="small">{{ rateText(scope.row) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="耗时" width="90" align="center">
        <template slot-scope="scope">{{ scope.row.costMs }} ms</template>
      </el-table-column>
      <el-table-column label="执行人" prop="createBy" width="90" align="center" />
      <el-table-column label="执行时间" width="155" align="center">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 报告详情 -->
    <el-dialog :title="'质量报告 #' + detail.executionId" :visible.sync="detailOpen" width="960px" append-to-body>
      <div v-loading="detailLoading" element-loading-text="加载报告详情...">
        <div class="detail-meta">
          <span>规则：{{ detail.ruleName }}</span>
          <span>数据表：{{ detail.dbName }}.{{ detail.tableName }}</span>
          <span>执行人：{{ detail.createBy }}</span>
          <span>执行时间：{{ parseTime(detail.createTime) }}</span>
        </div>

        <EvaluationDetail v-if="!detailLoading" :record="detail" />
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-label">实际扫描行数</div>
            <div class="summary-value">{{ detail.totalRows }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">违规条数</div>
            <div class="summary-value danger">{{ detail.violationCount }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">违规行数</div>
            <div class="summary-value danger">{{ detail.violationRows }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">行通过率</div>
            <div class="summary-value">
              <el-tag :type="rateTagType(detail)" size="medium">{{ rateText(detail) }}</el-tag>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-label">执行耗时</div>
            <div class="summary-value">{{ detail.costMs }}<span class="unit"> ms</span></div>
          </div>
        </div>

        <el-alert title="统计口径" :description="statisticsNote" type="info" :closable="false" show-icon class="statistics-note" />

        <div class="detail-section">
          <span class="detail-section-title">字段违规分布（按条数）：</span>
          <el-tag
            v-for="item in detail.fieldStats"
            :key="item.field"
            type="danger"
            size="small"
            class="field-tag"
          >
            {{ item.field }} · {{ item.count }} 条
          </el-tag>
          <span v-if="!detail.fieldStats || detail.fieldStats.length === 0" class="empty-tip">{{ emptyViolationText(detail) }}</span>
        </div>

        <el-table :data="detail.violations" size="mini" border max-height="380">
          <el-table-column label="行号" prop="rowId" width="70" align="center" />
          <el-table-column label="记录ID" prop="recordId" width="90" align="center" />
          <el-table-column label="违规字段" prop="fieldName" width="150" />
          <el-table-column label="命中规则" prop="ruleName" :show-overflow-tooltip="true" />
          <el-table-column label="原因" prop="reason" min-width="140" />
          <el-table-column label="对比值"><template slot-scope="s">{{ fieldValueText(s.row.comparisonValue) }}</template></el-table-column>
          <el-table-column label="涉及字段"><template slot-scope="s">{{ s.row.involvedFields || '历史未记录' }}</template></el-table-column>
          <el-table-column label="字段值" width="120" align="center">
            <template slot-scope="scope">
              <span>{{ fieldValueText(scope.row.fieldValue) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="detailOpen = false">关 闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listReport, getReport } from '@/api/dqservice/report'
import { QUALITY_STATISTICS_NOTE, rateText, rateTagType, fieldValueText, emptyViolationText, evaluationText } from '@/utils/quality'
import EvaluationDetail from './EvaluationDetail'

export default {
  name: 'QualityReport',
  components: { EvaluationDetail },
  activated() { this.getList() },
  data() {
    return {
      // 遮罩层
      loading: true,
      // 显示搜索条件
      showSearch: true,
      // 表格数据
      reportList: [],
      // 总条数
      total: 0,
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        ruleName: undefined,
        tableName: undefined
      },
      // 详情弹窗
      detailOpen: false,
      detailLoading: false,
      detail: { violations: [], fieldStats: [] },
      statisticsNote: QUALITY_STATISTICS_NOTE
    }
  },
  created() {
    this.getList()
  },
  methods: {
    evaluationText,
    rateText,
    rateTagType,
    fieldValueText,
    emptyViolationText,
    /** 查询质量报告列表 */
    getList() {
      this.loading = true
      listReport(this.queryParams).then(response => {
        this.reportList = response.rows
        this.total = response.total
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    /** 查看报告详情 */
    handleView(row) {
      this.detail = { executionId: row.executionId, violations: [], fieldStats: [] }
      this.detailOpen = true
      this.detailLoading = true
      getReport(row.executionId).then(response => {
        this.detail = response.data
        this.detailLoading = false
      }).catch(() => {
        this.detailLoading = false
      })
    }
  }
}
</script>

<style scoped>
.statistics-note {
  margin-bottom: 16px;
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
  margin-bottom: 8px;
}
.summary-card {
  flex: 1 1 18%;
  min-width: 130px;
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
.summary-value .unit {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}
.detail-section {
  margin-bottom: 12px;
}
.detail-section-title {
  font-size: 13px;
  color: #606266;
}
.field-tag {
  margin-right: 6px;
}
.empty-tip {
  font-size: 13px;
  color: #909399;
}
</style>
