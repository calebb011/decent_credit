import { createActor } from './institutionService';
import { Principal } from '@dfinity/principal';

// 模拟数据
const MOCK_DATA = {
  success: true,
  data: {
    institutionStats: {
      totalCount: 125,
      activeCount: 98,
      todayNewCount: 3,
    },
    dataStats: {
      totalRecords: 1234567,
      todayRecords: 15678,
      growthRate: 23.5,
    },
    apiStats: {
      totalCalls: 987654,
      todayCalls: 45678,
      successRate: 99.8,
    },
    tokenStats: {
      totalRewards: 1500000,    // 历史总奖励
      totalConsumption: 850000, // 历史总消耗
      todayRewards: 25000,      // 今日奖励
      todayConsumption: 15000,  // 今日消耗
    }
  }
};

/**
 * 获取管理员看板数据
 * @param {boolean} useMock 是否使用模拟数据
 * @returns {Promise<AdminDashboardData>} 管理员看板数据
 */
export async function getAdminDashboardData(useMock =false) {
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_DATA);
      }, 0);
    });
  }

  const actor = await createActor();
  try {
    // 获取所有机构数据
    const institutions = await actor.get_all_institutions();
    const formattedInstitutions = institutions.map(formatInstitution);
    
    // 统计活跃和非活跃机构
    const activeInstitutions = formattedInstitutions.filter(inst => inst.status === 'active');
    
    // 计算今日新增机构数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const newInstitutions = formattedInstitutions.filter(inst => {
      const joinTime = new Date(inst.join_time).getTime();
      return joinTime >= todayTime;
    });

    // 统计API调用和数据上传
    const apiStats = calculateApiStats(formattedInstitutions);
    const dataStats = calculateDataStats(formattedInstitutions);
    const tokenStats = calculateTokenStats(formattedInstitutions);

    return {
      success: true,
      data: {
        institutionStats: {
          totalCount: institutions.length,
          activeCount: activeInstitutions.length,
          todayNewCount: newInstitutions.length,
        },
        dataStats,
        apiStats,
        tokenStats,
      }
    };
  } catch (error) {
    console.error('获取管理员看板数据失败:', error);
    return {
      success: false,
      message: error.message || '获取数据失败'
    };
  }
}

/**
 * 格式化机构数据
 */
function formatInstitution(raw) {
  if (!raw) return null;

  const nsToMs = (ns) => {
    if (!ns) return 0;
    return Math.floor(Number(ns.toString()) / 1_000_000);
  };

  return {
    id: raw.id.toText(),
    name: raw.name || '',
    status: raw.status?.Active ? 'active' : 'inactive',
    join_time: raw.join_time ? new Date(nsToMs(raw.join_time)).toISOString() : null,
    api_calls: Number(raw.api_calls || 0),
    dcc_consumed: Number(raw.dcc_consumed || 0),
    data_uploads: Number(raw.data_uploads || 0),
    token_trading: {
      bought: Number(raw.token_trading?.bought || 0),
      sold: Number(raw.token_trading?.sold || 0)
    }
  };
}

/**
 * 计算API统计数据
 */
function calculateApiStats(institutions) {
  const totalCalls = institutions.reduce((sum, inst) => sum + inst.api_calls, 0);
  const todayCalls = institutions.reduce((sum, inst) => {
    // 这里需要后端提供今日调用数据
    return sum + 0;
  }, 0);

  return {
    totalCalls,
    todayCalls,
    successRate: 99.9 // 需要后端提供实际成功率
  };
}

/**
 * 计算数据统计信息
 */
function calculateDataStats(institutions) {
  const totalRecords = institutions.reduce((sum, inst) => sum + inst.data_uploads, 0);
  const todayRecords = institutions.reduce((sum, inst) => {
    // 这里需要后端提供今日上传数据
    return sum + 0;
  }, 0);

  return {
    totalRecords,
    todayRecords,
    growthRate: calculateGrowthRate(totalRecords, todayRecords)
  };
}

/**
 * 计算DCC代币统计信息
 */
function calculateTokenStats(institutions) {
  // 计算历史总奖励 (bought)
  const totalRewards = institutions.reduce((sum, inst) => sum + inst.token_trading.bought, 0);
  
  // 计算历史总消耗 (dcc_consumed)
  const totalConsumption = institutions.reduce((sum, inst) => sum + inst.dcc_consumed, 0);
  
  // 获取今日时间戳
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  
  // 计算今日奖励
  const todayRewards = institutions.reduce((sum, inst) => {
    // 这里需要后端提供今日奖励数据
    return sum + 0;
  }, 0);
  
  // 计算今日消耗
  const todayConsumption = institutions.reduce((sum, inst) => {
    // 这里需要后端提供今日消耗数据
    return sum + 0;
  }, 0);

  return {
    totalRewards,
    totalConsumption,
    todayRewards,
    todayConsumption
  };
}

/**
 * 计算增长率
 */
function calculateGrowthRate(total, today) {
  if (total === 0) return 0;
  return Number(((today / total) * 100).toFixed(1));
}

export default {
  getAdminDashboardData
};