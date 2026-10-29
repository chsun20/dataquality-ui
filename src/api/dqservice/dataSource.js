import request from '@/utils/request'

export const sourceOptions = () => request({ url: '/dqservice/dataSource/options', method: 'get' })
export const sourceTables = params => request({ url: '/dqservice/dataSource/tables', method: 'get', params, timeout: 65000 })
export const sourceColumns = params => request({ url: '/dqservice/dataSource/columns', method: 'get', params, timeout: 65000 })
export const sourcePreview = params => request({ url: '/dqservice/dataSource/preview', method: 'get', params, timeout: 65000 })
export const testSource = data => request({ url: '/dqservice/dataSource/test', method: 'post', data, timeout: 65000 })
export const testSavedSource = id => request({ url: `/dqservice/dataSource/${id}/test`, method: 'post', timeout: 65000 })

// 查询dataSource列表
export function listDataSource(query) {
  return request({
    url: '/dqservice/dataSource/list',
    method: 'get',
    params: query
  })
}

// 查询dataSource详细
export function getDataSource(id) {
  return request({
    url: '/dqservice/dataSource/' + id,
    method: 'get'
  })
}

// 新增dataSource
export function addDataSource(data) {
  return request({
    url: '/dqservice/dataSource',
    method: 'post',
    data: data
  })
}

// 修改dataSource
export function updateDataSource(data) {
  return request({
    url: '/dqservice/dataSource',
    method: 'put',
    data: data
  })
}

// 删除dataSource
export function delDataSource(id) {
  return request({
    url: '/dqservice/dataSource/' + id,
    method: 'delete'
  })
}
