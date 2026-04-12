// IP 地理位置定位工具
// 使用免费公共 API 根据用户 IP 获取省份信息
// 获取失败时静默忽略，不影响主流程

interface GeoResult {
  province: string
  regionCode: string
}

// IP 定位 API 列表（按优先级排序，失败自动切换下一个）
const GEO_API_LIST = [
  {
    name: 'ip-api',
    url: 'http://ip-api.com/json/?lang=zh-CN',
    parse: (data: any): GeoResult | null => {
      if (data.status === 'success' && data.regionName) {
        return { province: data.regionName, regionCode: data.region || '' }
      }
      return null
    }
  },
  {
    name: 'ipuser',
    url: 'https://ipuser.in/api/geo',
    parse: (data: any): GeoResult | null => {
      if (data.province) {
        return { province: data.province, regionCode: data.province_code || '' }
      }
      return null
    }
  }
]

// 省份名称到 region code 的映射（支持带后缀的名称）
const PROVINCE_TO_REGION: Record<string, string> = {
  '北京': 'beijing', '北京市': 'beijing',
  '天津': 'tianjin', '天津市': 'tianjin',
  '上海': 'shanghai', '上海市': 'shanghai',
  '重庆': 'chongqing', '重庆市': 'chongqing',
  '河北': 'hebei', '河北省': 'hebei',
  '山西': 'shanxi', '山西省': 'shanxi',
  '辽宁': 'liaoning', '辽宁省': 'liaoning',
  '吉林': 'jilin', '吉林省': 'jilin',
  '黑龙江': 'heilongjiang', '黑龙江省': 'heilongjiang',
  '江苏': 'jiangsu', '江苏省': 'jiangsu',
  '浙江': 'zhejiang', '浙江省': 'zhejiang',
  '安徽': 'anhui', '安徽省': 'anhui',
  '福建': 'fujian', '福建省': 'fujian',
  '江西': 'jiangxi', '江西省': 'jiangxi',
  '山东': 'shandong', '山东省': 'shandong',
  '河南': 'henan', '河南省': 'henan',
  '湖北': 'hubei', '湖北省': 'hubei',
  '湖南': 'hunan', '湖南省': 'hunan',
  '广东': 'guangdong', '广东省': 'guangdong',
  '海南': 'hainan', '海南省': 'hainan',
  '四川': 'sichuan', '四川省': 'sichuan',
  '贵州': 'guizhou', '贵州省': 'guizhou',
  '云南': 'yunnan', '云南省': 'yunnan',
  '陕西': 'shaanxi', '陕西省': 'shaanxi',
  '甘肃': 'gansu', '甘肃省': 'gansu',
  '青海': 'qinghai', '青海省': 'qinghai',
  '广西': 'guangxi', '广西壮族自治区': 'guangxi',
  '西藏': 'xizang', '西藏自治区': 'xizang',
  '内蒙古': 'neimenggu', '内蒙古自治区': 'neimenggu',
  '宁夏': 'ningxia', '宁夏回族自治区': 'ningxia',
  '新疆': 'xinjiang', '新疆维吾尔自治区': 'xinjiang',
  '台湾': 'taiwan', '台湾省': 'taiwan',
  '香港': 'hongkong', '香港特别行政区': 'hongkong',
  '澳门': 'macao', '澳门特别行政区': 'macao'
}

// 缓存结果，避免重复请求
let cachedResult: GeoResult | null = null
let fetchPromise: Promise<GeoResult | null> | null = null

/**
 * 根据用户 IP 自动获取地区信息
 * @returns 地区 regionCode（如 'beijing'），获取失败返回 null
 */
export async function detectUserRegion(): Promise<string | null> {
  // 有缓存直接返回
  if (cachedResult) return cachedResult.regionCode || null

  // 避免并发重复请求
  if (fetchPromise) return fetchPromise.then(r => r?.regionCode || null)

  fetchPromise = (async () => {
    for (const api of GEO_API_LIST) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 3000) // 3秒超时

        const response = await fetch(api.url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        clearTimeout(timeout)

        if (!response.ok) continue

        const data = await response.json()
        const result = api.parse(data)

        if (result) {
          // 尝试映射到 regionCode
          const regionCode = PROVINCE_TO_REGION[result.province] || result.regionCode || null
          cachedResult = { ...result, regionCode: regionCode || '' }
          console.log(`[Geo] 检测到用户地区: ${result.province} (${regionCode})`)
          return cachedResult
        }
      } catch (error) {
        // 静默失败，尝试下一个 API
        console.warn(`[Geo] ${api.name} 定位失败:`, error instanceof Error ? error.message : error)
      }
    }

    console.log('[Geo] 所有定位 API 均失败，忽略地区字段')
    return null
  })()

  const result = await fetchPromise
  fetchPromise = null
  return result?.regionCode || null
}

/**
 * 获取省份名称
 */
export async function detectUserProvince(): Promise<string | null> {
  if (cachedResult) return cachedResult.province || null
  await detectUserRegion()
  return cachedResult?.province || null
}
