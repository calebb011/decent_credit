import React, { useState, useEffect } from 'react';
import { BarChart2, Database, Coins, Users, Activity, Building } from 'lucide-react';
import { Card, Spin, Empty } from 'antd';
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin tip="加载中..." size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Empty description={<span className="text-gray-400">暂无数据</span>} />
      </div>
    );
  }

  const mainCards = [
    {
      title: '机构数据',
      icon: <Building className="h-8 w-8 text-blue-500" />,
      bgColor: 'from-blue-500/20 to-blue-600/20',
      mainValue: dashboardData.institutionStats.totalCount,
      subValue: `今日新增: +${dashboardData.institutionStats.todayNewCount}`
    },
    {
      title: '信用数据总量',
      icon: <Database className="h-8 w-8 text-green-500" />,
      bgColor: 'from-green-500/20 to-green-600/20',
      mainValue: dashboardData.dataStats.totalRecords.toLocaleString(),
      subValue: `今日上传: ${dashboardData.dataStats.todayRecords.toLocaleString()}`,
      extra: {
        label: '同比增长',
        value: `+${dashboardData.dataStats.growthRate}%`,
        color: 'text-green-500'
      }
    },
    {
      title: '信用记录查询次数',
      icon: <Activity className="h-8 w-8 text-purple-500" />,
      bgColor: 'from-purple-500/20 to-purple-600/20',
      mainValue: dashboardData.apiStats.totalCalls.toLocaleString(),
      subValue: `今日调用: ${dashboardData.apiStats.todayCalls.toLocaleString()}`
    }
  ];

  const tokenStats = [
    {
      title: '历史总奖励',
      value: `${dashboardData.tokenStats.totalRewards.toLocaleString()} DCC`,
      textColor: 'text-green-500'
    },
    {
      title: '历史总消耗',
      value: `${dashboardData.tokenStats.totalConsumption.toLocaleString()} DCC`,
      textColor: 'text-red-500'
    },
    {
      title: '今日奖励',
      value: `${dashboardData.tokenStats.todayRewards.toLocaleString()} DCC`,
      textColor: 'text-green-500',
      percentage: `+${((dashboardData.tokenStats.todayRewards / dashboardData.tokenStats.totalRewards) * 100).toFixed(1)}%`
    },
    {
      title: '今日消耗',
      value: `${dashboardData.tokenStats.todayConsumption.toLocaleString()} DCC`,
      textColor: 'text-red-500',
      percentage: `+${((dashboardData.tokenStats.todayConsumption / dashboardData.tokenStats.totalConsumption) * 100).toFixed(1)}%`
    }
  ];

  return (
    <div className="space-y-4">
      {/* 头部标题 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">系统运营概览</h2>
        <div className="text-gray-400">
          平台当前共有 {dashboardData.institutionStats.totalCount} 家机构
        </div>
      </div>

      {/* 主要状态卡片 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {mainCards.map((card, index) => (
          <Card key={index} className="bg-black/20 border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${card.bgColor}`}>
                  {card.icon}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">{card.title}</p>
                  <p className="text-xl font-semibold text-gray-200">{card.mainValue}</p>
                  <p className="text-sm text-gray-500">{card.subValue}</p>
                </div>
              </div>
              {card.extra && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">{card.extra.label}</p>
                  <p className={`text-lg font-semibold ${card.extra.color}`}>
                    {card.extra.value}
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* DCC代币统计 */}
      <Card 
        title={<span className="text-gray-200">DCC代币使用统计</span>}
        className="bg-black/20 border-gray-700"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {tokenStats.map((stat, index) => (
            <div key={index} className="p-3 border border-gray-700 rounded-lg bg-black/30">
              <p className="text-sm text-gray-400">{stat.title}</p>
              <div className="flex items-center">
                <p className={`text-xl font-semibold ${stat.textColor}`}>
                  {stat.value}
                </p>
                {stat.percentage && (
                  <span className={`ml-2 text-sm ${stat.textColor}`}>
                    {stat.percentage}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;