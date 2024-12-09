// dashboardService.js
import { getActor } from './IDL';
import { Principal } from '@dfinity/principal';

// 添加工具函数来安全地转换 BigInt
const convertBigIntToNumber = (value) => {
  if (typeof value === 'bigint') {
    // 将 BigInt 转换为普通数字
    return Number(value);
  }
  return value;
};

// 递归处理对象中的所有 BigInt 值
const processBigIntValues = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return convertBigIntToNumber(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(processBigIntValues);
  }

  const result = {};
  for (const key in obj) {
    result[key] = processBigIntValues(obj[key]);
  }
  return result;
};

/**
 * 格式化机构状态
 * @param {Object} status 
 * @returns {string}
 */
const formatInstitutionStatus = (status) => {
  if (status?.Active) return 'active';
  if (status?.Inactive) return 'inactive';
  if (status?.Suspended) return 'suspended';
  if (status?.Pending) return 'pending';
  return 'unknown';
};


/**
 * 获取机构仪表板数据
 * @param {string} institutionId 机构ID
 * @returns {Promise<InstitutionDashboardData>}
 */
export const getInstitutionDashboardData = async (institutionId) => {
  try {
    const actor = await getActor();
    const response = await actor.get_institution_dashboard_data(Principal.fromText(institutionId));
    
    if (!response.Ok) {
      throw new Error(response.Err || '获取数据失败');
    }

    // 处理所有的 BigInt 值
    const processedData = processBigIntValues(response.Ok);
    
    return {
      success: true,
      data: {
        basicInfo: {
          name: processedData.basic_info.name,
          id: processedData.basic_info.id,
          status: formatInstitutionStatus(processedData.basic_info.status),
          joinTime: processedData.basic_info.join_time,
          creditLevel: processedData.basic_info.credit_level,
          creditScore: processedData.basic_info.credit_score
        },
        submissionStats: {
          todaySubmissions: processedData.submission_stats.today_submissions,
          totalSubmissions: processedData.submission_stats.total_submissions,
          submissionDistribution: {
            loanRecords: processedData.submission_stats.submission_distribution.loan_records,
            repaymentRecords: processedData.submission_stats.submission_distribution.repayment_records,
            notificationRecords: processedData.submission_stats.submission_distribution.notification_records
          }
        },
        usageStats: {
          queryOthers: processedData.usage_stats.query_others,
          queriedByOthers: processedData.usage_stats.queried_by_others,
          todayQueryOthers: processedData.usage_stats.today_query_others,
          todayQueriedByOthers: processedData.usage_stats.today_queried_by_others,
          totalQueries: processedData.usage_stats.total_queries,
          apiQuota: {
            used: processedData.usage_stats.api_quota.used,
            total: processedData.usage_stats.api_quota.total
          }
        },
        tokenInfo: {
          balance: processedData.token_info.balance,
          recharge: processedData.token_info.recharge,
          withdraw: processedData.token_info.withdraw,
          rewards: processedData.token_info.rewards,
          consumption: processedData.token_info.consumption,
        },
        creditInfo: {
          creditScore: processedData.credit_info.credit_score,
          creditLevel: processedData.credit_info.credit_level,
          dataQualityScore: processedData.credit_info.data_quality_score
        },
        systemStatus: {
          apiHealth: processedData.system_status.api_health,
          hasAnnouncement: processedData.system_status.has_announcement,
          lastUpdateTime: processedData.system_status.last_update_time,
          systemVersion: processedData.system_status.system_version
        }
      }
    };
  } catch (error) {
    console.error('Failed to fetch institution dashboard data:', error);
    return {
      success: false,
      message: error.message || '获取机构仪表板数据失败'
    };
  }
};

// 导出为默认对象
export default {
  getInstitutionDashboardData
};