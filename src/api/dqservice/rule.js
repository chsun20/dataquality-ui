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
    method: 'post',
    data: data
  })
}

// 修改规则
export function updateRule(data) {
  return request({
    url: '/dqservice/rule',
    method: 'put',
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
