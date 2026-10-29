import request from '@/utils/request'

// 查询质控任务列表
export function listTask(query) {
  return request({
    url: '/dqservice/task/list',
    method: 'get',
    params: query
  })
}

// 查询质控任务详情（含已绑定规则）
export function getTask(taskId) {
  return request({
    url: '/dqservice/task/' + taskId,
    method: 'get'
  })
}

// 查询指定数据源与表下可绑定的规则
export function candidateRules(params) {
  return request({
    url: '/dqservice/task/candidates',
    method: 'get',
    params
  })
}

// 新增质控任务
export function addTask(data) {
  return request({
    url: '/dqservice/task',
    method: 'post',
    data: data
  })
}

// 修改质控任务
export function updateTask(data) {
  return request({
    url: '/dqservice/task',
    method: 'put',
    data: data
  })
}

// 删除质控任务（历史运行批次保留）
export function delTask(taskIds) {
  return request({
    url: '/dqservice/task/' + taskIds,
    method: 'delete'
  })
}

// 启用或停用定时调度
export function changeTaskStatus(data) {
  return request({
    url: '/dqservice/task/changeStatus',
    method: 'put',
    data: data
  })
}

// 手动触发一次任务，异步执行并立即返回运行批次
export function runTask(taskId) {
  return request({
    url: '/dqservice/task/' + taskId + '/run',
    method: 'post'
  })
}

// 查询任务运行批次列表
export function listTaskRuns(query) {
  return request({
    url: '/dqservice/task/runs',
    method: 'get',
    params: query
  })
}

// 查询运行批次详情（含各规则的执行报告）
export function getTaskRun(runId) {
  return request({
    url: '/dqservice/task/run/' + runId,
    method: 'get'
  })
}

// 删除运行批次记录（不删除已生成的规则报告）
export function delTaskRun(runIds) {
  return request({
    url: '/dqservice/task/run/' + runIds,
    method: 'delete'
  })
}
