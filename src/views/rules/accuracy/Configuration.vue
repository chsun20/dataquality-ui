<template>
<div>
  <el-form :model="droolsRule" :rules="rules" :label-position="'right'">
    <el-form-item label="规则名称" prop="ruleName">
      <el-col :span="8">
        <el-input v-model="droolsRule.ruleName" placeholder="只支持英文与数字"/>
      </el-col>
    </el-form-item>
    <el-form-item label="规则描述">
      <el-col :span="8">
        <el-input v-model="droolsRule.ruleDescription" placeholder="请输入规则描述"/>
      </el-col>
    </el-form-item>
    <el-form-item label="规则类型">
      <el-col :span="8">
        <el-select v-model="droolsRule.typeName" :disabled="true">
          <el-option
            v-for="item in ruleTypes"
            :key="item.value"
            :label="item.label"
            :value="item.value">
          </el-option>
        </el-select>
      </el-col>
    </el-form-item>
    <el-form-item label="数据源">
      <el-col :span="8">
        <el-input v-model="droolsRule.tableName" :disabled="true"/>
      </el-col>
    </el-form-item>
    <el-form-item label="创建者">
      <el-col :span="8">
        <el-input v-model="droolsRule.userName" :disabled="true"/>
      </el-col>
    </el-form-item>
    <el-form-item>
      <el-button @click="back">上一步</el-button>
      <el-button type="primary" @click="commitConfiguration">提交</el-button>
    </el-form-item>
  </el-form>
</div>
</template>

<script>
export default {
  name: 'Configuration',
  props: {
    droolsRule: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      ruleTypes: [{
        value: 'profiling',
        label: '单表规则'
      }],
      rules: {ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }]}
    }
  },
  created() {
    this.droolsRule.userName = this.$store.state.user.name
    this.droolsRule.typeName = '单表规则'
    this.droolsRule.typeCode = '1'
  },
  methods: {
    commitConfiguration() {
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
