// Dashboard.js
import React, { useState, useEffect } from 'react';
import { BarChart2, Database, Coins, Award, Activity } from 'lucide-react';
import { getDashboardData } from '../services/dashboardService';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const response = await getDashboardData();
        if (response.success) {
          setDashboardData(response.data);
        } else {
          console.error('获取概览数据失败:', response.message);
        }
      } catch (error) {
        console.error('获取概览数据异常:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部信息 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">系统概览</h1>
          <p className="mt-1 text-sm text-gray-600">
            机构名称: {dashboardData.basicInfo.name}
            <span className={`ml-4 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              dashboardData.basicInfo.status = 'bg-green-100 text-green-800'
               
            }`}>
              {dashboardData.basicInfo.status = '已接入'}
            </span>
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
          {/* 信用上传统计 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 bg-opacity-75">
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">信用上传统计</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {dashboardData.submissionStats.todaySubmissions.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    总记录: {dashboardData.submissionStats.totalSubmissions.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">今日提交</p>
                <p className="text-xl font-semibold text-gray-900">
                  {dashboardData.submissionStats.todaySubmissions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* API使用统计 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 bg-opacity-75">
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">信用查询统计</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {dashboardData.usageStats.todayQueries.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    额度: {dashboardData.usageStats.apiQuota.used}/{dashboardData.usageStats.apiQuota.total}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">今日调用</p>
                <p className="text-xl font-semibold text-gray-900">
                  {dashboardData.usageStats.todayQueries.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* 代币消耗 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 bg-opacity-75">
                  <Coins className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">代币消耗</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {dashboardData.tokenInfo.monthlySpent.toLocaleString()} DCC
                  </p>
                  <p className="text-sm text-gray-500">
                    剩余: {dashboardData.tokenInfo.balance.toLocaleString()} DCC
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">今日消耗</p>
                <p className="text-xl font-semibold text-gray-900">
                  {dashboardData.tokenInfo.monthlySpent.toLocaleString()} DCC
                </p>
              </div>
            </div>
          </div>

          {/* 奖励信息 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 bg-opacity-75">
                  <Award className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">获得奖励</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {dashboardData.rewardInfo.totalReward.toLocaleString()} DCC
                  </p>
                  <p className="text-sm text-gray-500">
                    今日: {dashboardData.rewardInfo.todayReward.toLocaleString()} DCC
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">累计奖励</p>
                <p className="text-xl font-semibold text-gray-900">
                  {dashboardData.rewardInfo.totalReward.toLocaleString()} DCC
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;