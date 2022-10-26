<template>
<div class="app-container">
  <el-form>
    <el-table :data="droolsRule.cols">
      <el-table-column label="列名" prop="name"/>
      <el-table-column label="数据类型" prop="type"/>
      <el-table-column label="规则选择">
        <template slot-scope="scope">
          <el-select v-model="droolsRule.cols[scope.$index]['rules']" multiple placeholder="请选择">
            <el-option
              v-for="item in options"
              :key="item.value"
              :label="item.label"
              :value="item.value">
            </el-option>
          </el-select>
        </template>
      </el-table-column>
    </el-table>
    <el-row style="margin-top: 80px">
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
      options: [{
        value: 'nullCount',
        label: '空值检测'
      }, {
        value: 'distinctCount',
        label: '重复值校验'
      }],
      value1: [],
      data: []
    }
  },
  created() {
  },
  methods: {
    commitRuleSelect() {
      for(let col of this.droolsRule.cols) {
        if(col.rules.length < 1) {
          this.$message.error('请为每个字段至少选择一个规则')
          return
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

</style>
