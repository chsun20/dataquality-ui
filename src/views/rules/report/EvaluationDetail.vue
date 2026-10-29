<template>
  <section class="evaluation-detail">
    <el-alert :title="evaluationText(record)" :type="alertType" :description="record.errorMessage || statusNote" :closable="false" show-icon />
    <p>数据源：{{ record.sourceName || '历史未记录' }}　检测时刻：{{ record.detectedAt || '历史未记录' }}</p>
    <p>{{ record.scanNote || '扫描顺序与范围说明：历史未记录' }}</p>
    <el-collapse>
      <el-collapse-item title="配置快照与参考依据（不等于实际检查结果）" name="snapshot">
        <p v-if="!record.configSnapshot">历史未记录</p>
        <p v-else>配置版本：{{ snapshot.version }}；不提供跨数据库一致性快照。演示参考数据只用于验证机制，不代表真实权威数据。</p>
        <el-table :data="snapshot.checks || []" size="mini" border>
          <el-table-column prop="field" label="检测字段" width="140" />
          <el-table-column prop="template" label="模板编码" width="150" />
          <el-table-column label="参数与依据"><template slot-scope="s">{{ JSON.stringify(s.row.params) }}</template></el-table-column>
        </el-table>
        <el-table v-if="snapshot.references && snapshot.references.length" :data="snapshot.references" size="mini">
          <el-table-column prop="sourceName" label="参考数据源" />
          <el-table-column prop="table" label="参考表" />
          <el-table-column prop="configVersion" label="连接版本" width="85" />
          <el-table-column prop="basisName" label="依据名称" />
          <el-table-column prop="basisVersion" label="依据版本" />
          <el-table-column prop="readAt" label="参考读取时刻" min-width="180" />
        </el-table>
      </el-collapse-item>
      <el-collapse-item title="实际检查计数与无法核验明细" name="counts">
        <p>违规条数仅计 VIOLATION；无法核验另列，不计作正确或错误。有无法核验项时整体通过率不计算。全部跳过的检查不表示该维度已获验证。</p>
        <p v-if="!record.checkCounts">检查计数：{{ record.evaluationStatus === 'FAILED' ? '执行失败，未形成完整计数' : '历史未记录' }}</p>
        <el-table v-else :data="counts" size="mini" border>
          <el-table-column prop="field" label="字段" />
          <el-table-column prop="templateCode" label="模板编码" />
          <el-table-column label="配置维度"><template slot-scope="s">{{ dimensions[s.row.dimensionCode] || s.row.dimensionCode }}</template></el-table-column>
          <el-table-column prop="checked" label="已检查" width="75" />
          <el-table-column prop="skipped" label="跳过" width="75" />
          <el-table-column prop="violations" label="违规" width="75" />
          <el-table-column prop="unverifiable" label="无法核验" width="85" />
        </el-table>
        <h4>无法核验明细（{{ record.unverifiableCount || 0 }} 条）</h4>
        <el-table :data="record.unverifiable || []" size="mini" border max-height="300">
          <el-table-column prop="rowId" label="行号" width="60" />
          <el-table-column label="字段" width="130"><template slot-scope="s">{{ s.row.fieldName || s.row.field }}</template></el-table-column>
          <el-table-column prop="reason" label="原因" min-width="170" />
          <el-table-column label="源值"><template slot-scope="s">{{ fieldValueText(s.row.row ? s.row.row[s.row.field] : s.row.fieldValue) }}</template></el-table-column>
          <el-table-column label="参考值"><template slot-scope="s">{{ fieldValueText(s.row.comparisonValue) }}</template></el-table-column>
          <el-table-column label="涉及字段"><template slot-scope="s">{{ fieldsText(s.row.involvedFields) }}</template></el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </section>
</template>

<script>
import { evaluationText, fieldValueText, parseQualityJson } from '@/utils/quality'
export default {
  name: 'EvaluationDetail',
  props: { record: { type: Object, required: true } },
  data() {
    return { dimensions: { COMPLETENESS: '完整性', VALIDITY: '有效性', UNIQUENESS: '唯一性', CONSISTENCY: '一致性', TIMELINESS: '时效性', ACCURACY: '准确性' } }
  },
  computed: {
    snapshot() { return parseQualityJson(this.record.configSnapshot, {}) },
    counts() { return parseQualityJson(this.record.checkCounts, []) },
    alertType() { return this.record.evaluationStatus === 'FAILED' || this.record.evaluationStatus === 'REQUEST_ERROR' ? 'error' : this.record.evaluationStatus === 'PARTIAL' ? 'warning' : 'info' },
    statusNote() { return this.record.evaluationStatus === 'PARTIAL' ? '存在无法核验项，整体通过率为未评价；详情见下方实际检查计数。' : '配置维度仅说明所选规则；实际是否进行了检查请查看计数。' }
  },
  methods: {
    evaluationText, fieldValueText,
    fieldsText(value) {
      const fields = parseQualityJson(value, {})
      return Object.keys(fields).map(k => k + '=' + fieldValueText(fields[k])).join('；')
    }
  }
}
</script>
<style scoped>
.evaluation-detail { margin: 12px 0 20px; font-size: 13px; color: #606266; }
</style>
