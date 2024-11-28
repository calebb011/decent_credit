// dashboardService.js
import { createActor } from './institutionService';
import { Principal } from '@dfinity/principal';

// 模拟数据
const MOCK_DATA = {
  success: true,
  data: {
    basicInfo: {
      name: "测试金融机构",
      id: "bkyz2-fmaaa-aaaaa-qaaaq-cai",
      status: "active",
      joinTime: "2024-01-15T08:00:00.000Z",
    },
    submissionStats: {
      todaySubmissions: 156,
      monthlySubmissions: 3478,
      totalSubmissions: 12567,
    },
    usageStats: {
      todayQueries: 892,
      monthlyQueries: 15234,
      totalQueries: 45678,
      apiQuota: {
        used: 15234,
        total: 20000,
      },
    },
    tokenInfo: {
      balance: 25678,
      monthlyEarned: 4567,
      monthlySpent: 2345,
    },
    rewardInfo: {
      todayReward: 234,
      totalReward: 12456,
    },
    systemStatus: {
      apiHealth: true,
      hasAnnouncement: true,
    }
  }
};

/**
 * 获取机构概览页面数据
 * @param {boolean} useMock 是否使用模拟数据
 * @returns {Promise<DashboardData>} 机构概览数据
 */
export async function getDashboardData(useMock =false) {
    if (useMock) {
        // 返回模拟数据
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_DATA);
            }, 0); // 添加500ms延迟模拟网络请求
        });
    }

    const actor = await createActor();
    try {
        // 获取当前机构ID
        const institutionId = localStorage.getItem('institutionId');
        if (!institutionId) {
            throw new Error('未找到机构ID');
        }

        // 获取机构详细信息
        const institutionData = await actor.get_institution(Principal.fromText(institutionId));
        if (!institutionData || institutionData.length === 0) {
            throw new Error('未找到机构信息');
        }

        // 格式化数据
        const institution = formatInstitutionForDashboard(institutionData[0]);

        return {
            success: true,
            data: {
                basicInfo: {
                    name: institution.name,
                    id: institution.id,
                    status: institution.status,
                    joinTime: institution.join_time,
                },
                submissionStats: {
                    todaySubmissions: institution.data_uploads,
                    monthlySubmissions: institution.data_uploads,
                    totalSubmissions: institution.data_uploads,
                },
                usageStats: {
                    todayQueries: institution.api_calls,
                    monthlyQueries: institution.api_calls,
                    totalQueries: institution.api_calls,
                    apiQuota: {
                        used: institution.api_calls,
                        total: 10000,
                    },
                },
                tokenInfo: {
                    balance: institution.token_trading.bought - institution.token_trading.sold,
                    monthlyEarned: institution.token_trading.bought,
                    monthlySpent: institution.token_trading.sold,
                },
                rewardInfo: {
                    todayReward: 0,
                    totalReward: institution.token_trading.bought,
                },
                systemStatus: {
                    apiHealth: true,
                    hasAnnouncement: false,
                }
            },
        };
    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        return {
            success: false,
            message: error.message || '获取概览数据失败',
        };
    }
}

/**
 * 格式化机构数据用于仪表板显示
 */
function formatInstitutionForDashboard(raw) {
    if (!raw) return null;

    const nsToMs = (ns) => {
        if (!ns) return 0;
        return Math.floor(Number(ns.toString()) / 1_000_000);
    };

    return {
        id: raw.id.toText(),
        name: raw.name,
        status: raw.status?.Active ? 'active' : 'inactive',
        join_time: raw.join_time ? new Date(nsToMs(raw.join_time)).toISOString() : null,
        api_calls: Number(raw.api_calls || 0),
        data_uploads: Number(raw.data_uploads || 0),
        token_trading: {
            bought: Number(raw.token_trading?.bought || 0),
            sold: Number(raw.token_trading?.sold || 0),
        },
    };
}

export default {
    getDashboardData,
};