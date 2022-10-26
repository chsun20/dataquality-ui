<template>
  <div class="app-container">
    <el-container>

      <el-form>
        <el-container>
          <el-aside>
            <el-tree ref="tableTree" :data="data" @node-click="handleNodeClick"
                             :highlight-current="true"/>
          </el-aside>

          <el-main>
            <el-table v-loading="loading" :data="hiveMetastoreList" @selection-change="handleSelectionChange">
              <el-table-column type="selection"/>
              <el-table-column label="字段名" prop="name"/>
              <el-table-column label="类型" prop="type"/>
              <el-table-column label="comment" prop="comment"/>
            </el-table>
          </el-main>
        </el-container>
      </el-form>

      <el-footer style="margin-top: 80px">
        <el-col :span="10" :offset="10">
          <el-button @click="commitDataSelect" type="primary">下一步</el-button>
        </el-col>
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import { listHiveMetastore, queryHiveMetastore } from '@/api/dqservice/hiveMetastore'

export default {
  name: "DataSelect",
  props: {
    droolsRule: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      // 遮罩层
      loading: true,
      // showDataSelect: true,
      // 数据源表格数据
      hiveMetastoreList: [],
      // 弹出层标题
      title: "",
      dbs: [],
      tables: [],
      data: [],
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        db: '',
        table: ''
      },
      // 当前树形组件选择节点
      currentTreeItem: null,
      // 当前表格多选行列表,存的是列名
      multipleSelection: [],
    };
  },
  created() {
    this.getList();
  },
  methods: {
    // 获取数据源列表：数据库与表名，初始化树形组件
    getList() {
      this.loading = true;
      listHiveMetastore().then(response => {
        this.data = []
        for(let value in response) {
          if (response.hasOwnProperty(value)) {
            let tmp = {label: value, children: []}
            for(let item of response[value]){
              tmp.children.push({ label: item.tableName })
            }
            this.data.push(tmp)
          }
        }
        this.loading = false;
      });
    },
    // 树形组件点击事件：1.重复点击无效 2.1级节点点击更新父组件的db属性 3.叶节点点击获取对应db.table的元数据并更新父组件的table属性
    handleNodeClick(item, node) {
      if(this.currentTreeItem === item) return
      this.currentTreeItem = item
      if(node.isLeaf) {
        this.droolsRule.table = node.label
        this.droolsRule.cols = []
        this.queryParams.db = node.parent.label
        this.queryParams.table = node.label
        this.hiveMetastoreList = []
        this.loading = true;
        queryHiveMetastore(this.queryParams).then(response => {
          this.hiveMetastoreList = response.sd.cols
          this.loading = false;
        });
      }else {
        this.droolsRule.db = node.label
      }
    },
    // 多选表格选择事件，更新父组件cols属性
    handleSelectionChange(val) {
      this.multipleSelection = []
      val.forEach(item => this.multipleSelection.push(item))
    },
    // 下一步按钮，提交当前页面数据
    commitDataSelect() {
      if(this.multipleSelection.length === 0) {
        this.$message.error('请至少选择一个字段')
        return
      }
      this.droolsRule.cols = this.multipleSelection
      this.$emit('finish')
    }
  }
};
</script>
