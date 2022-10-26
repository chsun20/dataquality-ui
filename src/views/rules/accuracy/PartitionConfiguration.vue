<template>
<div>
  <el-form :model="droolsRule" label-width="80px">
    <el-form-item label="起始分区">
      <el-col :span="8">
        <el-input v-model="droolsRule.sourceWhere" placeholder="dt=#yyyyMMdd# AND hour=#HH#"/>
      </el-col>
    </el-form-item>
    <el-form-item label="分区大小">
      <el-col :span="4">
        <el-input v-model="droolsRule.sourcePartitionNumber"/>
      </el-col>
      <el-col :span="4">
        <el-select v-model="droolsRule.sourcePartitionUnit" placeholder="请选择分区大小">
          <el-option
            v-for="item in partitionSizeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value">
          </el-option>
        </el-select>
      </el-col>
    </el-form-item>
    <el-form-item label="时区">
      <el-col :span="8">
        <el-select v-model="droolsRule.sourceTimeZone" placeholder="请选择时区">
          <el-option
            v-for="item in timeZoneOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value">
          </el-option>
        </el-select>
      </el-col>
    </el-form-item>
    <el-form-item>
      <el-button @click="back">上一步</el-button>
      <el-button type="primary" @click="commitPartitionConfiguration">下一步</el-button>
    </el-form-item>
  </el-form>
</div>
</template>

<script>
export default {
  name: 'PartitionConfiguration',
  props: {
    droolsRule: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      partitionSizeOptions: [{
        value: 'day',
        label: '天'
      }, {
        value: 'hour',
        label: '小时'
      },{
        value: 'minute',
        label: '分钟'
      }],
      timeZoneOptions: [{ value: 'UTC-12', label: 'UTC-12(IDL)' }, { value: 'UTC-11', label: 'UTC-11(MIT)' },
        { value: 'UTC-10', label: 'UTC-10(HST)' }, { value: 'UTC-9:30', label: 'UTC-9:30(MSIT)' },
        { value: 'UTC-9', label: 'UTC-9(AKST)' }, { value: 'UTC-8', label: 'UTC-8(PST)' }, { value: 'UTC-7', label: 'UTC-7(MST)' },
        { value: 'UTC-6', label: 'UTC-6(CST)' }, { value: 'UTC-5', label: 'UTC-5(EST)' }, { value: 'UTC-4', label: 'UTC-4(AST)' },
        { value: 'UTC-3:30', label: 'UTC-3:30(NST)' }, { value: 'UTC-3', label: 'UTC-3(SAT)' }, { value: 'UTC-2', label: 'UTC-2(BRT)' },
        { value: 'UTC-1', label: 'UTC-1(CVT)' }, { value: 'UTC', label: 'UTC(WET,GMT)' }, { value: 'UTC+1', label: 'UTC+1(CET)' },
        { value: 'UTC+2', label: 'UTC+2(EET)' }, { value: 'UTC+3', label: 'UTC+3(MSK)' }, { value: 'UTC+3:30', label: 'UTC+3:30(IRT)' },
        { value: 'UTC+4', label: 'UTC+4(META)' }, { value: 'UTC+5', label: 'UTC+5(METB)' }, { value: 'UTC+5:30', label: 'UTC+5:30(IDT)' },
        { value: 'UTC+5:45', label: 'UTC+5:45(NPT)' }, { value: 'UTC+6', label: 'UTC+6(BHT)' }, { value: 'UTC+6:30', label: 'UTC+6:30(MRT)' },
        { value: 'UTC+7', label: 'UTC+7(IST)' }, { value: 'UTC+8', label: 'UTC+8(EAT)' }, { value: 'UTC+8:30', label: 'UTC+8:30(KRT)' },
        { value: 'UTC+9', label: 'UTC+9(FET)' }, { value: 'UTC+9:30', label: 'UTC+9:30(ACST)' }, { value: 'UTC+10', label: 'UTC+10(AEST)' },
        { value: 'UTC+10:30', label: 'UTC+10:30(FAST)' }, { value: 'UTC+11', label: 'UTC+11(VTT)' }, { value: 'UTC+11:30', label: 'UTC+11:30(NFT)' },
        { value: 'UTC+12', label: 'UTC+12(PSTB)' }, { value: 'UTC+12:45', label: 'UTC+12:45(CIT)' },
        { value: 'UTC+13', label: 'UTC+13(PSTC)' }, { value: 'UTC+14', label: 'UTC+14(PSTD)' }],
    }
  },
  methods: {
    commitPartitionConfiguration() {
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
