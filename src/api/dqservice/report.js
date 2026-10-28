import request from '@/utils/request'

// 查询质量报告列表
export function listReport(query) {
  return request({
    url: '/dqservice/report/list',
    method: 'get',
    params: query
  })
}

// 查询质量报告详情（含违规明细）
export function getReport(executionId) {
  return request({
    url: '/dqservice/report/' + executionId,
    method: 'get'
  })
}
