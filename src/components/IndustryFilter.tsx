'use client'

import { extractUniqueIndustries, filterStocksByIndustry } from '@/lib/industry-utils'
import { Stock } from '@/types/stock'
import { BarChart3, Filter, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'

interface IndustryFilterProps {
    stocks: Stock[]
    selectedIndustry: string | null
    onIndustryChange: (industry: string | null) => void
    showStats?: boolean
}

export function IndustryFilter({
    stocks,
    selectedIndustry,
    onIndustryChange,
    showStats = true
}: IndustryFilterProps) {
    // 获取所有行业列表
    const industries = useMemo(() => extractUniqueIndustries(stocks), [stocks])

    // 计算筛选结果统计
    const filteredCount = useMemo(() => {
        if (!selectedIndustry || selectedIndustry === '全部行业') {
            return stocks.length
        }
        return filterStocksByIndustry(stocks, selectedIndustry).length
    }, [stocks, selectedIndustry])

    // 计算行业统计
    const industryStats = useMemo(() => {
        const stats = new Map<string, number>()
        stocks.forEach(stock => {
            const industry = stock.所属行业?.trim()
            if (industry) {
                stats.set(industry, (stats.get(industry) || 0) + 1)
            } else {
                stats.set('未分类', (stats.get('未分类') || 0) + 1)
            }
        })
        return stats
    }, [stocks])

    return (
        <div className="space-y-3">
            {/* 筛选控制 */}
            <div className="flex items-center space-x-3">
                <div className="flex items-center text-sm text-gray-600">
                    <Filter className="h-4 w-4 mr-2" />
                    行业筛选
                </div>

                <select
                    value={selectedIndustry || '全部行业'}
                    onChange={(e) => onIndustryChange(e.target.value === '全部行业' ? null : e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="全部行业">全部行业 ({stocks.length})</option>
                    {industries.map(industry => (
                        <option key={industry} value={industry}>
                            {industry} ({industryStats.get(industry) || 0})
                        </option>
                    ))}
                    {industryStats.has('未分类') && (
                        <option value="未分类">
                            未分类 ({industryStats.get('未分类')})
                        </option>
                    )}
                </select>

                {/* 统计信息 */}
                {showStats && (
                    <div className="text-sm text-gray-500">
                        筛选结果: {filteredCount} 只股票
                    </div>
                )}
            </div>

            {/* 热门行业快捷按钮 */}
            {industries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <div className="text-xs text-gray-500 flex items-center">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        热门行业:
                    </div>
                    {industries.slice(0, 8).map(industry => {
                        const count = industryStats.get(industry) || 0
                        const isSelected = selectedIndustry === industry

                        return (
                            <button
                                key={industry}
                                onClick={() => onIndustryChange(isSelected ? null : industry)}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    isSelected
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                }`}
                                title={`${industry} (${count}只股票)`}
                            >
                                {industry} ({count})
                            </button>
                        )
                    })}
                </div>
            )}

            {/* 当前筛选状态提示 */}
            {selectedIndustry && selectedIndustry !== '全部行业' && (
                <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    当前筛选: <strong>{selectedIndustry}</strong>
                    <button
                        onClick={() => onIndustryChange(null)}
                        className="ml-2 text-blue-500 hover:text-blue-700 underline text-xs"
                    >
                        清除筛选
                    </button>
                </div>
            )}
        </div>
    )
}