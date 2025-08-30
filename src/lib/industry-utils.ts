/**
 * 行业相关工具函数
 * 提供行业数据的提取、统计和处理功能
 */

import { Stock } from '@/types/stock'

export interface IndustryStats {
    name: string
    count: number
    totalMarketCap?: number
    avgPrice?: number
}

/**
 * 从股票列表中提取唯一行业列表
 */
export function extractUniqueIndustries(stocks: Stock[]): string[] {
    const industries = stocks
        .map(stock => stock.所属行业)
        .filter((industry): industry is string =>
            industry !== null && industry !== undefined && industry.trim() !== ''
        )
        .map(industry => industry.trim())

    // 去重并排序
    return Array.from(new Set(industries)).sort()
}

/**
 * 获取热门行业（按股票数量排序）
 */
export function getPopularIndustries(stocks: Stock[], limit: number = 10): IndustryStats[] {
    const industryMap = new Map<string, Stock[]>()

    // 按行业分组
    stocks.forEach(stock => {
        const industry = stock.所属行业?.trim()
        if (industry) {
            if (!industryMap.has(industry)) {
                industryMap.set(industry, [])
            }
            industryMap.get(industry)!.push(stock)
        }
    })

    // 计算统计信息并排序
    const industryStats: IndustryStats[] = Array.from(industryMap.entries()).map(([name, stocks]) => {
        const validPrices = stocks.map(s => s.现价).filter(p => p && p > 0)
        const validMarketCaps = stocks.map(s => s.总市值).filter(m => m && m > 0)

        return {
            name,
            count: stocks.length,
            totalMarketCap: validMarketCaps.length > 0 ? validMarketCaps.reduce((total: number, cap: number) => total + cap, 0) : undefined,
            avgPrice: validPrices.length > 0 ? validPrices.reduce((total: number, price: number) => total + price, 0) / validPrices.length : undefined
        }
    })

    // 按股票数量降序排序
    return industryStats
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
}

/**
 * 按行业过滤股票
 */
export function filterStocksByIndustry(stocks: Stock[], industry: string | null): Stock[] {
    if (!industry || industry === '全部行业') {
        return stocks
    }

    return stocks.filter(stock =>
        stock.所属行业?.trim() === industry.trim()
    )
}

/**
 * 获取行业分布统计
 */
export function getIndustryDistribution(stocks: Stock[]): IndustryStats[] {
    const industryMap = new Map<string, Stock[]>()

    // 按行业分组
    stocks.forEach(stock => {
        const industry = stock.所属行业?.trim()
        if (industry) {
            if (!industryMap.has(industry)) {
                industryMap.set(industry, [])
            }
            industryMap.get(industry)!.push(stock)
        } else {
            // 未分类的股票
            const unknownKey = '未分类'
            if (!industryMap.has(unknownKey)) {
                industryMap.set(unknownKey, [])
            }
            industryMap.get(unknownKey)!.push(stock)
        }
    })

    // 计算统计信息
    const industryStats: IndustryStats[] = Array.from(industryMap.entries()).map(([name, stocks]) => {
        const validPrices = stocks.map(s => s.现价).filter((p): p is number => p !== undefined && p > 0)
        const validMarketCaps = stocks.map(s => s.总市值).filter((m): m is number => m !== undefined && m > 0)

        return {
            name,
            count: stocks.length,
            totalMarketCap: validMarketCaps.length > 0 ? validMarketCaps.reduce((total, cap) => total + cap, 0) : undefined,
            avgPrice: validPrices.length > 0 ? validPrices.reduce((total, price) => total + price, 0) / validPrices.length : undefined
        }
    })

    // 按股票数量降序排序
    return industryStats.sort((a, b) => b.count - a.count)
}

/**
 * 格式化市值显示
 */
export function formatMarketCap(marketCap?: number): string {
    if (!marketCap) return '--'

    if (marketCap >= 100000000) {
        return `${(marketCap / 100000000).toFixed(2)}亿`
    } else if (marketCap >= 10000) {
        return `${(marketCap / 10000).toFixed(2)}万`
    }

    return marketCap.toString()
}

/**
 * 格式化价格显示
 */
export function formatPrice(price?: number): string {
    if (!price) return '--'
    return `¥${price.toFixed(2)}`
}