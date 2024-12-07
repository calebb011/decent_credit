import React, { useState, useEffect } from 'react';
import { PieChart as LucidePieChart, Database, Coins, Award, Activity, Star, Search } from 'lucide-react';
import { Card, Spin, Empty, Progress } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getInstitutionDashboardData  } from '../services/InstitutionDashboardService';

const getCreditLevelColor = (level) => {
  const colors = {
    'AAA': 'text-green-500',
    'AA': 'text-green-400',
    'A': 'text-blue-500',
    'BBB': 'text-yellow-500',
    'BB': 'text-orange-500'
  };
  return colors[level] || 'text-gray-500';
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 获取登录用户的 Principal
        const userPrincipal = localStorage.getItem('userPrincipal');
        
        // 改用新的方法名
        const response = await getInstitutionDashboardData(userPrincipal);
        console.log(response)
        if (response.success) {
          setDashboardData(response.data);
          // analyticsData 相关的数据现在在 response.data.creditInfo 中
          setAnalyticsData({
            creditScore: response.data.creditInfo.creditScore,
            creditLevel: response.data.creditInfo.creditLevel,
            dataDistribution: response.data.submissionStats.submissionDistribution
          });
        }
      } catch (error) {
        console.error('获取数据异常:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin tip="加载中..." size="large" />
      </div>
    );
  }

  if (!dashboardData || !analyticsData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Empty description={<span className="text-gray-400">暂无数据</span>} />
      </div>
    );
  }

  const baseCards = [
    {
      title: '信用上传数据量',
      icon: <Database className="h-8 w-8 text-blue-500" />,
      bgColor: 'from-blue-500/20 to-blue-600/20',
      mainValue: dashboardData.submissionStats.totalSubmissions.toLocaleString(),
      subTitle: '今日上传',
      subValue: dashboardData.submissionStats.todaySubmissions.toLocaleString()
    },
    {
      title: '查询其他机构数据量',
      icon: <Search className="h-8 w-8 text-green-500" />,
      bgColor: 'from-green-500/20 to-green-600/20',
      mainValue: dashboardData.usageStats.queryOthers.toLocaleString()
    },
    {
      title: '被其他机构查询数据量',
      icon: <Activity className="h-8 w-8 text-orange-500" />,
      bgColor: 'from-orange-500/20 to-orange-600/20',
      mainValue: dashboardData.usageStats.queriedByOthers.toLocaleString()
    }
  ];
  
  const tokenCards = [
    {
      title: '查询消耗DCC',
      icon: <Coins className="h-8 w-8 text-yellow-500" />,
      bgColor: 'from-yellow-500/20 to-yellow-600/20',
      mainValue: dashboardData.tokenInfo.totalSpent.toLocaleString(),
      subTitle: '今日消耗',
      subValue: dashboardData.tokenInfo.todaySpent.toLocaleString()
    },
    {
      title: '查询奖励DCC',
      icon: <Award className="h-8 w-8 text-purple-500" />,
      bgColor: 'from-purple-500/20 to-purple-600/20',
      mainValue: dashboardData.tokenInfo.totalReward.toLocaleString(),
      subTitle: '今日奖励',
      subValue: dashboardData.tokenInfo.todayReward.toLocaleString()
    }
  ];
  const StatsCard = ({ data }) => (
    <Card className="bg-black/20 border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${data.bgColor}`}>
          {data.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-400 mb-2">{data.title}</h3>
          <p className="text-2xl font-semibold text-gray-200 mb-1">
            {data.mainValue}
            {data.title.includes('DCC') && ' DCC'}
          </p>
          {data.subTitle && (
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-2">{data.subTitle}:</span>
              <span className="font-medium text-gray-400">
                {data.subValue}
                {data.title.includes('DCC') && ' DCC'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const creditScoreCard = (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-500 mb-1">
            {analyticsData.creditScore}
          </div>
          <div className="text-sm text-gray-400">综合评分</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold mb-1 ${getCreditLevelColor(analyticsData.creditLevel)}`}>
            {analyticsData.creditLevel}
          </div>
          <div className="text-sm text-gray-400">信用等级</div>
        </div>
      </div>
      <LucidePieChart className="h-16 w-16 text-blue-500 opacity-20" />
    </div>
  );

  const dataDistributionCard = (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-300 mb-4">数据分布</h3>
      <div className="flex items-center justify-between">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: '贷款记录', value: analyticsData.dataDistribution.loanRecords },
                  { name: '还款记录', value: analyticsData.dataDistribution.repaymentRecords },
                  { name: '通知记录', value: analyticsData.dataDistribution.notificationRecords }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#3B82F6" /> {/* 蓝色 */}
                <Cell fill="#10B981" /> {/* 绿色 */}
                <Cell fill="#F59E0B" /> {/* 橙色 */}
              </Pie>
              <Tooltip 
                formatter={(value) => `${value}%`}
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid #4B5563'
                }}
                labelStyle={{ color: '#E5E7EB' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 ml-6">
          <div className="space-y-3">
            {[
              { name: '贷款记录', value: analyticsData.dataDistribution.loanRecords, color: '#3B82F6' },
              { name: '还款记录', value: analyticsData.dataDistribution.repaymentRecords, color: '#10B981' },
              { name: '通知记录', value: analyticsData.dataDistribution.notificationRecords, color: '#F59E0B' }
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-400">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-300">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-black/20 p-4 rounded-lg border border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-200 mb-2">系统概览</h2>
          <div className="flex items-center text-gray-400">
            <span>机构名称: {dashboardData.basicInfo.name}</span>
            <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
              已接入
            </span>
          </div>
        </div>
        <div className="flex items-center px-4 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <Coins className="h-5 w-5 text-yellow-500 mr-2" />
          <div>
            <span className="text-sm text-gray-400">代币余额</span>
            <p className="text-lg font-semibold text-yellow-500">
              {dashboardData.tokenInfo.balance.toLocaleString()} DCC
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black/20 border-gray-700 hover:border-gray-600">
          <div className="flex items-center justify-between mb-2 px-4 pt-4">
            <h3 className="text-lg font-medium text-gray-300">信用评分</h3>
            <Star className="h-5 w-5 text-yellow-500" />
          </div>
          {creditScoreCard}
        </Card>
        <Card className="bg-black/20 border-gray-700 hover:border-gray-600">
          {dataDistributionCard}
        </Card>
      </div>

      {/* 基础统计卡片和Token相关卡片部分保持不变 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {baseCards.map((card, index) => (
          <StatsCard key={index} data={card} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tokenCards.map((card, index) => (
          <StatsCard key={index} data={card} />
        ))}
      </div>

      <style jsx global>{`
        .custom-progress .ant-progress-text {
          color: #e5e7eb !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;