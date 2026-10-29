import request from '@/utils/request'

// 查询规则列表
export function listRule(query) {
  return request({
    url: '/dqservice/rule/list',
    method: 'get',
    params: query
  })
}

// 查询规则详细
export function getRule(ruleId) {
  return request({
    url: '/dqservice/rule/' + ruleId,
    method: 'get'
  })
}

// 新增规则
export function addRule(data) {
  return request({
    url: '/dqservice/rule',
    timeout: 75000,
    method: 'post',
    data: data
  })
}

// 修改规则
export function updateRule(data) {
  return request({
    url: '/dqservice/rule',
    timeout: 75000,
    method: 'put',
    data: data
  })
}

// 校验手写 DRL 语法（只传 rule ... end 主体，后端补全头部后编译）
export function validateRule(data) {
  return request({
    url: '/dqservice/rule/validate',
    method: 'post',
    data: data
  })
}

// 删除规则
export function delRule(ruleId) {
  return request({
    url: '/dqservice/rule/' + ruleId,
    method: 'delete'
  })
}

// 执行规则，返回违规明细与通过率
export function executeRule(ruleId, params) {
  return request({
    url: '/dqservice/execute/' + ruleId,
    timeout: 90000,
    method: 'post',
    params: params
  })
}
