<template>
<div class="app-container">
  <el-container>
    <el-header>
      <el-steps :active="active" finish-status="success">
        <el-step title="选择数据源"/>
        <el-step title="选择规则"/>
        <el-step title="命名"/>
      </el-steps>
    </el-header>
    <el-main>
      <el-alert v-if="loadError" title="规则加载失败，未进入编辑。请返回规则列表重试。" type="error" :closable="false" />
      <el-card v-if="ready" :key="wizardKey" v-loading="submitting">
        <DataSelect v-show="showDataSelect" :droolsRule="droolsRule" @finish="finishDataSelect"/>
        <RuleSelect v-if="showRuleSelect" :droolsRule="droolsRule" @finish="finishRuleSelect" @back="backRuleSelect"/>
        <Configuration v-if="showConfiguration" :droolsRule="droolsRule" :submitting="submitting" @finish="commit" @back="backConfiguration"/>
      </el-card>
    </el-main>
  </el-container>
</div>
</template>

<script>
import DataSelect from '@/views/rules/accuracy/DataSelect'
import RuleSelect from '@/views/rules/accuracy/RuleSelect'
import Configuration from '@/views/rules/accuracy/Configuration'
import { addRule, updateRule, getRule } from '@/api/dqservice/rule'
export default {
  name: 'index',
  components: { RuleSelect, DataSelect, Configuration },
  data() {
    return {
      active: 0, ready: false, loadError: false, submitting: false, wizardKey: 0,
      droolsRule: {
        ruleName: '',
        userName: '',
        typeName: '',
        typeCode: 0,
        cols: [],
        dbName: '',
        tableName: '',
        sourceId: null,
        sourceName: '内置本地数据源',
        allColumns: []
      },
      showDataSelect: true,
      showRuleSelect: false,
      showConfiguration: false
    }
  },
  watch: {
    '$route.query.ruleId': { immediate: true, handler(id) { this.loadRule(id) } }
  },
  methods: {
    loadRule(id) {
      const key = ++this.wizardKey
      this.ready = false; this.loadError = false; this.active = 0
      this.showDataSelect = true; this.showRuleSelect = false; this.showConfiguration = false
      if (!id) {
        this.droolsRule = { ruleName: '', cols: [], allColumns: [], sourceId: null,
          sourceName: '内置本地数据源', dbName: '', tableName: '', typeName: '' }
        this.ready = true
        return
      }
      getRule(id).then(r => {
        if (key !== this.wizardKey) return
        this.droolsRule = { ...r.data, allColumns: [] }
        this.ready = true
      }).catch(() => { if (key === this.wizardKey) this.loadError = true })
    },
    finishDataSelect() {
      this.active = 1
      this.showDataSelect = false
      this.showRuleSelect = true
    },
    finishRuleSelect() {
      this.active = 2
      this.showRuleSelect = false
      this.showConfiguration = true
    },
    backRuleSelect() {
      this.active = 0
      this.showRuleSelect = false
      this.showDataSelect = true
    },
    backConfiguration() {
      if (this.submitting) return
      this.active = 1
      this.showConfiguration = false
      this.showRuleSelect = true
    },
    commit() {
      if (this.submitting) return
      this.submitting = true
      const payload = { ruleId: this.droolsRule.ruleId, ruleName: this.droolsRule.ruleName,
        sourceId: this.droolsRule.sourceId, dbName: this.droolsRule.dbName, tableName: this.droolsRule.tableName,
        cols: this.droolsRule.cols }
      const save = payload.ruleId ? updateRule : addRule
      save(payload).then(() => {
        this.active = 3
        this.$message.success('规则参数已保存')
        this.$router.push('/dq/rule')
      }).catch(() => {}).finally(() => { this.submitting = false })
    }
  }
}
</script>

<style scoped>

</style>
