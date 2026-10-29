<template>
<div>
  <el-form ref="configuration" :model="droolsRule" :rules="rules" :label-position="'right'">
    <el-form-item label="规则名称" prop="ruleName">
      <el-col :span="8">
        <el-input v-model="droolsRule.ruleName" maxlength="100" placeholder="请输入规则名称"/>
      </el-col>
    </el-form-item>
    <el-form-item label="规则类型">
      <el-col :span="8">
        <el-input :value="droolsRule.typeName" :disabled="true" placeholder="由所选规则模板决定"/>
      </el-col>
    </el-form-item>
    <el-form-item label="数据源">
      <el-col :span="8">
        <span>{{ droolsRule.sourceName || '内置本地数据源' }} / {{ droolsRule.dbName }}.{{ droolsRule.tableName }}</span>
      </el-col>
    </el-form-item>
    <el-form-item label="创建者">
      <el-col :span="8">
        <el-input v-model="droolsRule.userName" :disabled="true"/>
      </el-col>
    </el-form-item>
    <el-form-item>
      <el-button :disabled="submitting" @click="back">上一步</el-button>
      <el-button :loading="drlLoading" :disabled="submitting" @click="previewDrl">预览 DRL</el-button>
      <el-button type="primary" :loading="submitting" :disabled="drlLoading" @click="commitConfiguration">提交</el-button>
    </el-form-item>
  </el-form>

  <el-dialog title="规则预览（执行前不落库）" :visible.sync="drlVisible" width="760px">
    <pre class="drl-preview">{{ drlContent }}</pre>
  </el-dialog>
</div>
</template>

<script>
import { listRuleTemplate, previewRuleTemplate } from '@/api/dqservice/ruleTemplate'

export default {
  name: 'Configuration',
  props: {
    submitting: { type: Boolean, default: false },
    droolsRule: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      // DRL 预览弹窗
      drlVisible: false,
      drlLoading: false,
      drlContent: '',
      rules: {ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }]}
    }
  },
  created() {
    this.droolsRule.userName = this.$store.state.user.name
    // 规则类型名称与规则模板保持一致：单模板取模板名称，多模板为组合规则
    this.resolveTypeName()
  },
  methods: {
    resolveTypeName() {
      listRuleTemplate().then(res => {
        const nameMap = {}
        ;(res.data || []).forEach(item => { nameMap[item.code] = item.name })
        const used = {}
        ;(this.droolsRule.cols || []).forEach(col => {
          ;(col.rules || []).forEach(code => { used[code] = true })
        })
        const codes = Object.keys(used)
        if (codes.length === 1 && nameMap[codes[0]]) {
          this.droolsRule.typeCode = codes[0]
          this.droolsRule.typeName = nameMap[codes[0]]
        } else if (codes.length > 1) {
          this.droolsRule.typeCode = 'mixed'
          this.droolsRule.typeName = '组合规则'
        } else {
          this.droolsRule.typeName = ''
        }
      }).catch(() => {
        this.droolsRule.typeName = ''
      })
    },
    previewDrl() {
      if (!this.droolsRule.ruleName) {
        this.$message.warning('请先填写规则名称，预览将按该名称生成规则')
        return
      }
      this.drlLoading = true
      previewRuleTemplate(this.droolsRule).then(res => {
        this.drlContent = (res.data && res.data.drl) || '未生成规则'
        this.drlVisible = true
      }).finally(() => {
        this.drlLoading = false
      })
    },
    commitConfiguration() {
      if (this.submitting) return
      this.$refs.configuration.validate(valid => { if (valid) this.$emit('finish') })
    },
    back() {
      this.$emit('back')
    }
  }
}
</script>

<style scoped>
.drl-preview {
  margin: 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.7;
  max-height: 520px;
  overflow: auto;
}
</style>
