import request from '@/utils/request'

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
