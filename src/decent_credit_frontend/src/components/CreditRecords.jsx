// CreditRecords.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, FileText } from 'lucide-react';
import { getCreditRecords, createCreditRecord } from '../services/InstitutionCreditService';
import { Loader } from 'lucide-react';
const CreditRecords = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);


  const [searchForm, setSearchForm] = useState({
    
    institutionId: '',
  });

  const [newRecord, setNewRecord] = useState({
    institutionId: '',
    deductionPoints: '',
    reason: '',
    dataQualityIssue: ''
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await getCreditRecords(searchForm.institutionId);
      if (response.success) {
        setRecords(response.data);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
  
    try {
      const response = await createCreditRecord(newRecord);
      if (response.success) {
        await fetchRecords();
        setNewRecord({
          institutionId: '',
          deductionPoints: '',
          reason: '',
          dataQualityIssue: ''
        });
        setIsCreateDialogOpen(false);
      } else {
        setError(response.message || '创建记录失败');
      }
    } catch (error) {
      setError(error.message || '创建记录失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setIsDetailDialogOpen(true);
  };
  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setError('');
    setNewRecord({
      institutionId: '',
      deductionPoints: '',
      reason: '',
      dataQualityIssue: ''
    });
  };
  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">信用管理</h2>
        <p className="text-gray-600">管理机构的信用记录及数据质量问题</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 查询条件卡片 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-base font-medium mb-4 flex items-center">
            <Search className="w-4 h-4 mr-2" />
            查询条件
          </h3>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                机构ID
              </label>
              <input
                type="text"
                value={searchForm.institutionId}
                onChange={(e) => setSearchForm({...searchForm, institutionId: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="请输入机构ID"
              />
            </div>
            <div className="md:self-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <Search className="w-4 h-4 mr-2" />
                查询记录
              </button>
            </div>
          </form>
        </div>

        {/* 查询结果卡片 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              <span className="text-base font-medium">查询结果</span>
            </div>
            <button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 inline-flex items-center"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              创建扣分记录
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">暂无记录</div>
            </div>
          ) : (
            <div className="divide-y">
              {records.map((record) => (
                <div key={record.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-base font-medium text-gray-900">
                          {record.institutionName}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          扣分记录
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">记录ID: {record.recordId}</p>
                      <p className="mt-1 text-sm text-gray-500">机构ID: {record.institutionId}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        操作时间: {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        操作人: {record.operatorName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">数据质量问题</h4>
                    <p className="text-sm text-gray-900">{record.dataQualityIssue}</p>
                  </div>

                  <div className="mt-4 bg-red-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-red-700">处罚详情</h4>
                        <p className="mt-1 text-sm text-red-600">扣除分数: -{record.deductionPoints}</p>
                      </div>
                      <button 
                        className="px-3 py-1.5 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                        onClick={() => handleViewDetail(record)}
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建记录弹窗 */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">创建扣分记录</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">机构ID</label>
                <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                value={newRecord.institutionId}
                onChange={(e) => setNewRecord({...newRecord, institutionId: e.target.value})}
                disabled={submitLoading}
                required
              />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">数据质量问题描述</label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={newRecord.dataQualityIssue}
                  onChange={(e) => setNewRecord({...newRecord, dataQualityIssue: e.target.value})}
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">扣除分数</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={newRecord.deductionPoints}
                  onChange={(e) => setNewRecord({...newRecord, deductionPoints: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">扣分原因</label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={newRecord.reason}
                  onChange={(e) => setNewRecord({...newRecord, reason: e.target.value})}
                  rows="3"
                  required
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    '确认扣分'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {isDetailDialogOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">扣分记录详情</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">记录ID</label>
                <p className="mt-1 font-mono text-sm text-gray-900">{selectedRecord.recordId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">机构名称</label>
                <p className="mt-1 text-gray-900">{selectedRecord.institutionName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">机构ID</label>
                <p className="mt-1 font-mono text-sm text-gray-600">{selectedRecord.institutionId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">数据质量问题</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedRecord.dataQualityIssue}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">扣除分数</label>
                <p className="mt-1 text-red-600">-{selectedRecord.deductionPoints}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">扣分原因</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedRecord.reason}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">操作时间</label>
                <p className="mt-1 text-gray-900">
                  {new Date(selectedRecord.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">操作人</label>
                <p className="mt-1 text-gray-900">{selectedRecord.operatorName}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsDetailDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditRecords;