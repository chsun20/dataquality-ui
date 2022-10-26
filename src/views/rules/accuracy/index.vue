<template>
<div class="app-container">
  <el-container>
    <el-header>
      <el-steps :active="active" finish-status="success">
        <el-step title="选择数据源"/>
        <el-step title="选择规则"/>
        <el-step title="选择分区"/>
        <el-step title="命名"/>
      </el-steps>
    </el-header>
    <el-main>
      <el-card>
        <DataSelect v-show="showDataSelect" :droolsRule="droolsRule" @finish="finishDataSelect"/>
        <RuleSelect v-if="showRuleSelect" :droolsRule="droolsRule" @finish="finishRuleSelect" @back="backRuleSelect"/>
        <PartitionConfiguration v-if="showPartitionConfiguration" :droolsRule="droolsRule"
                                @finish="finishPartitionConfiguration" @back="backPartitionConfiguration"/>
        <Configuration v-if="showConfiguration" :droolsRule="droolsRule" @finish="commit" @back="backConfiguration"/>
      </el-card>
    </el-main>
  </el-container>
</div>
</template>

<script>
import DataSelect from '@/views/rules/accuracy/DataSelect'
import RuleSelect from '@/views/rules/accuracy/RuleSelect'
import PartitionConfiguration from '@/views/rules/accuracy/PartitionConfiguration'
import Configuration from '@/views/rules/accuracy/Configuration'
import { addRule } from '@/api/dqservice/rule'
export default {
  name: 'index',
  components: { RuleSelect, DataSelect, PartitionConfiguration, Configuration},
  data() {
    return {
      active: 0,
      droolsRule: {
        ruleName: '',
        ruleDescription: '',
        userName: '',
        userId: 0,
        ruleType: '',
        ruleTypeCode: 0,
        cols: [],
        db: '',
        table: '',
        sourceWhere: '',
        sourcePartitionNumber: '',
        sourcePartitionUnit: '',
        sourceTimeZone: ''
      },
      showDataSelect: true,
      showRuleSelect: false,
      showPartitionConfiguration: false,
      showConfiguration: false
    }
  },
  methods: {
    finishDataSelect() {
      this.active = 1
      this.showDataSelect = false
      this.showRuleSelect = true
      console.log('完成第一步：数据源选择')
      console.log(this.droolsRule)
    },
    finishRuleSelect() {
      this.active = 2
      this.showRuleSelect = false
      this.showPartitionConfiguration = true
      console.log('完成第二步：规则选择')
      console.log(this.droolsRule)
    },
    backRuleSelect() {
      this.active = 1
      this.showRuleSelect = false
      this.showDataSelect = true
    },
    finishPartitionConfiguration() {
      this.active = 3
      this.showPartitionConfiguration = false
      this.showConfiguration = true
      console.log('完成第三步：分区配置')
      console.log(this.droolsRule)
    },
    backPartitionConfiguration() {
      this.active = 2
      this.showPartitionConfiguration = false
      this.showRuleSelect = true
    },
    backConfiguration() {
      this.active = 3
      this.showConfiguration = false
      this.showPartitionConfiguration = true
    },
    commit() {
      this.active = 4
      console.log('完成第四步：规则配置')
      console.log(this.droolsRule)
      addRule(this.droolsRule)
    }
  }
}
</script>

<style scoped>

</style>
