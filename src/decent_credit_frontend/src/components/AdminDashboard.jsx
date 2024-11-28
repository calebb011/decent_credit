import React, { useState, useEffect } from 'react';
import { BarChart2, Database, Coins, Users, Activity, Building } from 'lucide-react';
import { getAdminDashboardData } from '../services/adminDashboardService';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const response = await getAdminDashboardData();
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
          <h1 className="text-2xl font-bold text-gray-900">系统运营概览</h1>
          <p className="mt-1 text-sm text-gray-600">
            平台当前共有 {dashboardData.institutionStats.totalCount} 家机构
           
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
          {/* 机构统计 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 bg-opacity-75">
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">机构数据</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {dashboardData.institutionStats.totalCount}
                  </p>
                  <p className="text-sm text-gray-500">
                    今日新增: +{dashboardData.institutionStats.todayNewCount}
                  </p>
                </div>
              </div>
              
            </div>
          </div>

          {/* 数据统计 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 bg-opacity-75">
                  <Database className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">数据总量</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {dashboardData.dataStats.totalRecords.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    今日上传: {dashboardData.dataStats.todayRecords.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">同比增长</p>
                <p className="text-lg font-semibold text-green-600">
                  +{dashboardData.dataStats.growthRate}%
                </p>
              </div>
            </div>
          </div>

          {/* API调用统计 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 bg-opacity-75">
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">API调用</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {dashboardData.apiStats.totalCalls.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    今日调用: {dashboardData.apiStats.todayCalls.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DCC代币统计 */}
<div className="bg-white rounded-lg shadow mb-6">
  <div className="p-4">
    <h2 className="text-lg font-medium text-gray-900 mb-4">DCC代币使用统计</h2>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="p-3 border rounded-lg">
        <p className="text-sm text-gray-500">历史总奖励</p>
        <p className="text-xl font-semibold text-green-600">
          {dashboardData.tokenStats.totalRewards.toLocaleString()} DCC
        </p>
      </div>
      <div className="p-3 border rounded-lg">
        <p className="text-sm text-gray-500">历史总消耗</p>
        <p className="text-xl font-semibold text-red-600">
          {dashboardData.tokenStats.totalConsumption.toLocaleString()} DCC
        </p>
      </div>
      <div className="p-3 border rounded-lg">
        <p className="text-sm text-gray-500">今日奖励</p>
        <div className="flex items-center">
          <p className="text-xl font-semibold text-green-600">
            {dashboardData.tokenStats.todayRewards.toLocaleString()} DCC
          </p>
          <span className="ml-2 text-sm text-green-500">
            +{((dashboardData.tokenStats.todayRewards / dashboardData.tokenStats.totalRewards) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="p-3 border rounded-lg">
        <p className="text-sm text-gray-500">今日消耗</p>
        <div className="flex items-center">
          <p className="text-xl font-semibold text-red-600">
            {dashboardData.tokenStats.todayConsumption.toLocaleString()} DCC
          </p>
          <span className="ml-2 text-sm text-red-500">
            +{((dashboardData.tokenStats.todayConsumption / dashboardData.tokenStats.totalConsumption) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  </div>
</div>
      
      </div>
    </div>
  );
};

export default AdminDashboard;