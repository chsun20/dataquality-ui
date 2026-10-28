import request from '@/utils/request'

// 查询规则模板清单（含参数定义）
export function listRuleTemplate() {
  return request({
    url: '/dqservice/rule/template/list',
    method: 'get'
  })
}

// 预览所选字段与模板生成的 DRL，不落库
export function previewRuleTemplate(data) {
  return request({
    url: '/dqservice/rule/template/preview',
    method: 'post',
    data: data
  })
}
