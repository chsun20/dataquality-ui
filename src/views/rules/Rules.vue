<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="规则id" prop="ruleId">
        <el-input
          v-model="queryParams.ruleId"
          placeholder="请输入规则id"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="用户id" prop="userId">
        <el-input
          v-model="queryParams.userId"
          placeholder="请输入用户id"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="kie_base_name" prop="kieBaseName">
        <el-input
          v-model="queryParams.kieBaseName"
          placeholder="请输入kie_base_name"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="kie_package_name" prop="kiePackageName">
        <el-input
          v-model="queryParams.kiePackageName"
          placeholder="请输入kie_package_name"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="数据库名" prop="dbName">
        <el-input
          v-model="queryParams.dbName"
          placeholder="请输入数据库名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="表名" prop="tableName">
        <el-input
          v-model="queryParams.tableName"
          placeholder="请输入表名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="字段名" prop="columnName">
        <el-input
          v-model="queryParams.columnName"
          placeholder="请输入字段名"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker clearable
                        v-model="queryParams.createTime"
                        type="date"
                        value-format="yyyy-MM-dd"
                        placeholder="请选择创建时间">
        </el-date-picker>
      </el-form-item>
      <el-form-item label="更新时间" prop="updateTime">
        <el-date-picker clearable
                        v-model="queryParams.updateTime"
                        type="date"
                        value-format="yyyy-MM-dd"
                        placeholder="请选择更新时间">
        </el-date-picker>
      </el-form-item>
      <el-form-item label="删除位" prop="del">
        <el-input
          v-model="queryParams.del"
          placeholder="请输入删除位"
          clearable
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="el-icon-plus"
          size="mini"
          @click="handleAdd"
          v-hasPermi="['dqservice:rule:add']"
        >新增自定义规则</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="el-icon-plus"
          size="mini"
          @click="handleAdd2"
          v-hasPermi="['dqservice:rule:add']"
        >从规则模板中创建</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="el-icon-edit"
          size="mini"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['dqservice:rule:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="el-icon-delete"
          size="mini"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['dqservice:rule:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="el-icon-download"
          size="mini"
          @click="handleExport"
          v-hasPermi="['dqservice:rule:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="ruleList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="规则id" align="center" prop="ruleId" />
      <el-table-column label="用户id" align="center" prop="userId" />
      <el-table-column label="kie_base_name" align="center" prop="kieBaseName" />
      <el-table-column label="kie_package_name" align="center" prop="kiePackageName" />
      <el-table-column label="规则内容" align="center" prop="ruleContext" />
      <el-table-column label="数据库名" align="center" prop="dbName" />
      <el-table-column label="表名" align="center" prop="tableName" />
      <el-table-column label="字段名" align="center" prop="columnName" />
      <el-table-column label="规则类型" align="center" prop="type" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" align="center" prop="updateTime" width="180">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.updateTime, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="删除位" align="center" prop="del" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button
            size="mini"
            type="text"
            icon="el-icon-edit"
            @click="handleUpdate(scope.row)"
            v-hasPermi="['dqservice:rule:edit']"
          >修改</el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['dqservice:rule:remove']"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total>0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加自定义规则对话框 -->
    <el-dialog :title="title" :visible.sync="openDIY" width="500px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="kieBase" prop="kieBaseName">
          <el-input v-model="form.kieBaseName" placeholder="请输入kie_base_name" />
        </el-form-item>
        <el-form-item label="kiePackage" prop="kiePackageName">
          <el-input v-model="form.kiePackageName" placeholder="请输入kie_package_name" />
        </el-form-item>
        <el-form-item label="规则地址" prop="ruleContext">
          <el-input v-model="form.ruleContext" type="textarea" placeholder="请输入地址" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitDIYForm">确 定</el-button>
        <el-button @click="openDIY = false">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 添加或修改规则对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="500px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户id" prop="userId">
          <el-input v-model="form.userId" placeholder="请输入用户id" />
        </el-form-item>
        <el-form-item label="kie_base_name" prop="kieBaseName">
          <el-input v-model="form.kieBaseName" placeholder="请输入kie_base_name" />
        </el-form-item>
        <el-form-item label="kie_package_name" prop="kiePackageName">
          <el-input v-model="form.kiePackageName" placeholder="请输入kie_package_name" />
        </el-form-item>
        <el-form-item label="规则内容" prop="ruleContext">
          <el-input v-model="form.ruleContext" type="textarea" placeholder="请输入内容" />
        </el-form-item>
        <el-form-item label="数据库名" prop="dbName">
          <el-input v-model="form.dbName" placeholder="请输入数据库名" />
        </el-form-item>
        <el-form-item label="表名" prop="tableName">
          <el-input v-model="form.tableName" placeholder="请输入表名" />
        </el-form-item>
        <el-form-item label="字段名" prop="columnName">
          <el-input v-model="form.columnName" placeholder="请输入字段名" />
        </el-form-item>
        <el-form-item label="删除位" prop="del">
          <el-input v-model="form.del" placeholder="请输入删除位" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listRule, getRule, delRule, addRule, updateRule } from "@/api/dqservice/rule";

export default {
  name: "Rule",
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
      // 规则表格数据
      ruleList: [],
      // 弹出层标题
      title: "",
      // 是否显示弹出层
      openDIY: false,
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        ruleId: null,
        userId: null,
        kieBaseName: null,
        kiePackageName: null,
        ruleContext: null,
        dbName: null,
        tableName: null,
        columnName: null,
        type: null,
        createTime: null,
        updateTime: null,
        del: null
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
    /** 查询规则列表 */
    getList() {
      this.loading = true;
      listRule(this.queryParams).then(response => {
        this.ruleList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    // 取消按钮
    cancel() {
      this.open = false;
      this.reset();
    },
    // 表单重置
    reset() {
      this.form = {
        ruleId: null,
        userId: null,
        kieBaseName: null,
        kiePackageName: null,
        ruleContext: null,
        dbName: null,
        tableName: null,
        columnName: null,
        type: null,
        createTime: null,
        updateTime: null,
        del: null
      };
      this.resetForm("form");
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm("queryForm");
      this.handleQuery();
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.ruleId)
      this.single = selection.length!==1
      this.multiple = !selection.length
    },
    /** 新增按钮操作 */
    handleAdd() {
      this.reset();
      this.openDIY = true;
      this.title = "添加自定义规则";
    },
    /** 新增按钮操作 */
    handleAdd2() {
      this.reset();
      this.open2 = true;
      this.title = "添加规则";
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset();
      const ruleId = row.ruleId || this.ids
      getRule(ruleId).then(response => {
        this.form = response.data;
        this.open = true;
        this.title = "修改规则";
      });
    },
    /** 提交按钮 */
    submitForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.ruleId != null) {
            updateRule(this.form).then(response => {
              this.$modal.msgSuccess("修改成功");
              this.open = false;
              this.getList();
            });
          } else {
            addRule(this.form).then(response => {
              this.$modal.msgSuccess("新增成功");
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** 提交按钮 */
    submitDIYForm() {
      this.form.type = 1;
      this.$refs["form"].validate(valid => {
        if (valid) {
          addRule(this.form).then(response => {
            this.$modal.msgSuccess("新增成功");
            this.open = false;
            this.getList();
          });
        }
      });
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const ruleIds = row.ruleId || this.ids;
      this.$modal.confirm('是否确认删除规则编号为"' + ruleIds + '"的数据项？').then(function() {
        return delRule(ruleIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("删除成功");
      }).catch(() => {});
    },
    /** 导出按钮操作 */
    handleExport() {
      this.download('dqservice/rule/export', {
        ...this.queryParams
      }, `rule_${new Date().getTime()}.xlsx`)
    }
  }
};
</script>
