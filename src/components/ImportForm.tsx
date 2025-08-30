'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { parseFile } from '@/lib/file-parser'
import { LocalStorage } from '@/lib/storage'
import { Stock } from '@/types/stock'
import { ApiDataFetcher } from './ApiDataFetcher'
import { Upload, FileText, Check, Database, FileUp } from 'lucide-react'

interface ImportFormProps {
  onImportSuccess?: () => void
}

export function ImportForm({ onImportSuccess }: ImportFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<Stock[]>([])
  const [allStocks, setAllStocks] = useState<Stock[]>([]) // 存储所有解析的股票
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showAll, setShowAll] = useState(false) // 控制是否显示所有数据
  const [activeTab, setActiveTab] = useState<'file' | 'api'>('file') // 控制标签页
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const stocks = await parseFile(file)
      if (stocks.length === 0) {
        setError('文件中没有找到有效的股票数据')
      } else {
        setAllStocks(stocks) // 存储所有股票
        setPreview(stocks.slice(0, 10)) // 初始显示前10条
        setShowAll(false) // 重置显示状态
        console.log(`成功解析 ${stocks.length} 只股票`)
      }
    } catch (error) {
      setError(`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/octet-stream': ['.xls'] // 为了支持特殊的.xls文件
    },
    maxFiles: 1
  })
  
  const handleConfirmImport = async () => {
    if (allStocks.length === 0) return
    
    try {
      LocalStorage.addToStockPool(allStocks) // 导入到股票池
      setSuccess(`成功导入 ${allStocks.length} 只股票到股票池`)
      setPreview([])
      setAllStocks([])
      setShowAll(false)
      onImportSuccess?.()
    } catch (error) {
      setError('保存失败，请重试')
    }
  }
  
  const toggleShowAll = () => {
    setShowAll(!showAll)
    setPreview(showAll ? allStocks.slice(0, 10) : allStocks)
  }

  const handleApiDataFetched = (stocks: Stock[]) => {
    onImportSuccess?.()
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">导入股票数据</h2>
      
      {/* 标签页导航 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex items-center px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'file'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <FileUp className="h-4 w-4 mr-2" />
          文件导入
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'api'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Database className="h-4 w-4 mr-2" />
          API获取
        </button>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'file' ? (
        <div>
          {/* 文件上传区域 */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isLoading ? (
              <p className="text-gray-600">正在解析文件...</p>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? '释放文件到这里...' : '拖拽文件到这里，或点击选择文件'}
                </p>
                <p className="text-sm text-gray-500">
                  支持 CSV、Excel (.xlsx/.xls)、TSV 格式
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  文件应包含"股票代码"和"股票名称"列，支持GBK编码
                </p>
              </div>
            )}
          </div>
          
          {/* 错误信息 */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {/* 成功信息 */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">{success}</p>
            </div>
          )}
          
          {/* 预览数据 */}
          {preview.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  数据预览 {showAll ? `(全部 ${allStocks.length} 条)` : `(前 ${preview.length} 条，共 ${allStocks.length} 条)`}
                </h3>
                {allStocks.length > 10 && (
                  <button
                    onClick={toggleShowAll}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {showAll ? '显示前10条' : '显示全部'}
                  </button>
                )}
              </div>
              
              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">上海交易所 (SH)</div>
                  <div className="text-lg font-semibold text-blue-800">
                    {allStocks.filter(s => s.market === 'SH').length} 只
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">深圳交易所 (SZ)</div>
                  <div className="text-lg font-semibold text-green-800">
                    {allStocks.filter(s => s.market === 'SZ').length} 只
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">股票代码</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">股票名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">市场</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((stock, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">{stock.symbol}</td>
                        <td className="border border-gray-200 px-4 py-2">{stock.name}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            stock.market === 'SH' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {stock.market}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleConfirmImport}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  确认导入到股票池 {allStocks.length} 只股票
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ApiDataFetcher onDataFetched={handleApiDataFetched} />
      )}
    </div>
  )
}