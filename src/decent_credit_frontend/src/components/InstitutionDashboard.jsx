import React, { useState, useEffect } from 'react';
import { BarChart2, Database, Coins, Award, Activity } from 'lucide-react';
import { getDashboardData } from '../services/InstitutionDashboardService';
import { Card, Spin, Empty } from 'antd';

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

  const cards = [
    {
      title: '信用上传统计',
      icon: <Database className="h-8 w-8 text-blue-500" />,
      bgColor: 'from-blue-500/20 to-blue-600/20',
      mainValue: dashboardData.submissionStats.todaySubmissions.toLocaleString(),
      subValue: `总记录: ${dashboardData.submissionStats.totalSubmissions.toLocaleString()}`,
      todayLabel: '今日提交',
      todayValue: dashboardData.submissionStats.todaySubmissions.toLocaleString()
    },
    {
      title: '信用查询统计',
      icon: <Activity className="h-8 w-8 text-green-500" />,
      bgColor: 'from-green-500/20 to-green-600/20',
      mainValue: dashboardData.usageStats.todayQueries.toLocaleString(),
      subValue: `额度: ${dashboardData.usageStats.apiQuota.used}/${dashboardData.usageStats.apiQuota.total}`,
      todayLabel: '今日调用',
      todayValue: dashboardData.usageStats.todayQueries.toLocaleString()
    },
    {
      title: '代币消耗',
      icon: <Coins className="h-8 w-8 text-yellow-500" />,
      bgColor: 'from-yellow-500/20 to-yellow-600/20',
      mainValue: `${dashboardData.tokenInfo.monthlySpent.toLocaleString()} DCC`,
      subValue: `剩余: ${dashboardData.tokenInfo.balance.toLocaleString()} DCC`,
      todayLabel: '今日消耗',
      todayValue: `${dashboardData.tokenInfo.monthlySpent.toLocaleString()} DCC`
    },
    {
      title: '获得奖励',
      icon: <Award className="h-8 w-8 text-purple-500" />,
      bgColor: 'from-purple-500/20 to-purple-600/20',
      mainValue: `${dashboardData.rewardInfo.totalReward.toLocaleString()} DCC`,
      subValue: `今日: ${dashboardData.rewardInfo.todayReward.toLocaleString()} DCC`,
      todayLabel: '累计奖励',
      todayValue: `${dashboardData.rewardInfo.totalReward.toLocaleString()} DCC`
    }
  ];

  return (
    <div className="space-y-4">
      {/* 头部标题 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">系统概览</h2>
        <div className="flex items-center text-gray-400">
          <span>机构名称: {dashboardData.basicInfo.name}</span>
          <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
            已接入
          </span>
        </div>
      </div>

      {/* 状态卡片网格 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
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
              <div className="text-right">
                <p className="text-sm font-medium text-gray-400">{card.todayLabel}</p>
                <p className="text-lg font-semibold text-gray-200">{card.todayValue}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;