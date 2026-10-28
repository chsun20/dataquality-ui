<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="表名" prop="tableName">
        <el-input
          v-model="queryParams.table"
          placeholder="请输入表名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="数据库名" prop="dbName">
        <el-input
          v-model="queryParams.db"
          placeholder="请输入数据库名称"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="hiveMetastoreList">
      <el-table-column type="expand">
        <template slot-scope="props">
          <el-table :data="props.row.sd.cols">
            <el-table-column label="Name" align="center" prop="name" />
            <el-table-column label="Type" align="center" prop="type" />
            <el-table-column label="Comment" align="center" prop="comment" :formatter="caseNullFormat"/>
          </el-table>
        </template>
      </el-table-column>
      <el-table-column label="Table Name" align="center" prop="tableName" />
      <el-table-column label="DB Name" align="center" prop="dbName" />
      <el-table-column label="Owner" align="center" prop="owner" />
      <el-table-column label="Creation Time" align="center" prop="createTime" :formatter="formatDate"/>
      <el-table-column label="Location" align="center" prop="sd.location" width="180">
      </el-table-column>
    </el-table>

    <pagination
      v-show="total>0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

  </div>
</template>

<script>
import { listHiveMetastore, queryHiveMetastore } from '@/api/dqservice/hiveMetastore'

export default {
  name: "DataSource",
  data() {
    return {
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
      // 数据源表格数据
      hiveMetastoreList: [],
      // 弹出层标题
      title: "",
      // 是否显示弹出层
      open: false,
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        db: '',
        table: ''
      },
      // 表单参数
      form: {},
      // 表单校验
      rules: {
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
    /** 获取数据源列表 */
    getList() {
      this.loading = true;
      listHiveMetastore().then(response => {
        this.hiveMetastoreList = []
        for(let value in response) {
          if (response.hasOwnProperty(value)) {
            for(let item of response[value]){
              this.hiveMetastoreList.push(item)
              this.total = this.total + item.length
            }
          }
        }
        this.loading = false;
      });
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1;
      if((this.queryParams.db == null || this.queryParams.db.length === 0) &&
        (this.queryParams.table == null || this.queryParams.table.length === 0)) {
        this.getList();
        return;
      }
      this.loading = true;
      queryHiveMetastore(this.queryParams).then(response => {
        this.hiveMetastoreList = [];
        this.hiveMetastoreList.push(response);
        this.total = response ? 1 : 0;
        this.loading = false;
      });
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        db: '',
        table: ''
      }
      this.resetForm("queryForm");
      this.handleQuery();
    },
    formatDate(row, column) {
      let date = new Date(parseInt(row.createTime) * 1000);
      let Y = date.getFullYear() + '-';
      let M = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) + '-' : date.getMonth() + 1 + '-';
      let D = date.getDate() < 10 ? '0' + date.getDate() + ' ' : date.getDate() + ' ';
      let h = date.getHours() < 10 ? '0' + date.getHours() + ':' : date.getHours() + ':';
      let m = date.getMinutes() < 10 ? '0' + date.getMinutes() + ':' : date.getMinutes() + ':';
      let s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
      return Y + M + D + h + m + s;
    },
    caseNullFormat(row) {
      let showProp = null;
      showProp = row.comment ? row.comment : 'N/A';
      return showProp;
    }
  }
};
</script>
