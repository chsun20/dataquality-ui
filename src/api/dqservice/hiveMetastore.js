import request from '@/utils/request'

// 获取hiveMetastore列表
export function listHiveMetastore() {
  return request({
    url: '/dqservice/api/v1/metadata/hive/dbs/tables',
    method: 'get'
  })
}

// 查询hiveMetastore列表
export function queryHiveMetastore(query) {
  return request({
    url: '/dqservice/api/v1/metadata/hive/table',
    method: 'get',
    params: query
  })
}
