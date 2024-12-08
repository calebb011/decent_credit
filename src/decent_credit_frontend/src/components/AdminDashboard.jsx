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
          console.error('Failed to fetch overview data:', response.message);
        }
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin tip="Loading..." size="large" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Empty description={<span className="text-gray-400">No data available</span>} />
      </div>
    );
  }

  const mainCards = [
    {
      title: 'Institutions',
      icon: <Building className="h-8 w-8 text-blue-500" />,
      bgColor: 'from-blue-500/20 to-blue-600/20',
      mainValue: dashboardData.institutionStats.totalCount,
      subValue: `New today: +${dashboardData.institutionStats.todayNewCount}`
    },
    {
      title: 'Total Credit Data',
      icon: <Database className="h-8 w-8 text-green-500" />,
      bgColor: 'from-green-500/20 to-green-600/20',
      mainValue: dashboardData.dataStats.totalRecords.toLocaleString(),
      extra: {
        label: 'YoY Growth',
        value: `+${dashboardData.dataStats.growthRate}%`,
        color: 'text-green-500'
      }
    },
    {
      title: 'Credit Record Queries',
      icon: <Activity className="h-8 w-8 text-purple-500" />,
      bgColor: 'from-purple-500/20 to-purple-600/20',
      mainValue: dashboardData.apiStats.totalCalls.toLocaleString(),
      subValue: `Today's calls: ${dashboardData.apiStats.todayCalls.toLocaleString()}`
    }
  ];

  const tokenStats = [
    {
      title: 'Total Institution Balance',
      value: `${dashboardData.tokenStats.totalBalance.toLocaleString()} DCC`,
      textColor: 'text-green-500'
    },
    {
      title: 'Total Institution Rewards',
      value: `${dashboardData.tokenStats.totalRewards.toLocaleString()} DCC`,
      textColor: 'text-green-500'
    },
    {
      title: 'Total Institution Consumption',
      value: `${dashboardData.tokenStats.totalConsumption.toLocaleString()} DCC`,
      textColor: 'text-red-500'
    },
    {
      title: 'Platform Fee Revenue',
      value: `${(dashboardData.tokenStats.totalConsumption * 0.1).toLocaleString()} DCC`, // Assuming 10% fee
      textColor: 'text-blue-500',
      subValue: 'Fee rate: 10%'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header Title */}
      <div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">System Operation Overview</h2>
        <div className="text-gray-400">
          Platform currently has {dashboardData.institutionStats.totalCount} institutions
        </div>
      </div>

      {/* Main Status Cards */}
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

      {/* DCC Token Statistics */}
      <Card 
        title={<span className="text-gray-200">DCC Token Usage Statistics</span>}
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
              {stat.subValue && (
                <span className="text-xs text-gray-400 mt-1">
                  {stat.subValue}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;