// dashboardService.js
import { getActor } from './IDL';
import { Principal } from '@dfinity/principal';

/**
 * 获取管理员看板数据
 * @returns {Promise<AdminDashboardData>}
 */
export const getAdminDashboardData = async () => {
  try {
    const actor = await getActor();
    const data = await actor.get_admin_dashboard_data();
    
    return {
      success: true,
      data: {
        institutionStats: {
          totalCount: data.institution_stats.total_count,
          activeCount: data.institution_stats.active_count,
          todayNewCount: data.institution_stats.today_new_count,
          monthlyNewCount: data.institution_stats.monthly_new_count,
          institutionGrowthRate: data.institution_stats.institution_growth_rate
        },
        dataStats: {
          totalRecords: data.data_stats.total_records,
          todayRecords: data.data_stats.today_records,
          monthlyRecords: data.data_stats.monthly_records,
          growthRate: data.data_stats.growth_rate,
          dataDistribution: {
            loanRecords: data.data_stats.data_distribution.loan_records,
            repaymentRecords: data.data_stats.data_distribution.repayment_records,
            notificationRecords: data.data_stats.data_distribution.notification_records
          }
        },
        apiStats: {
          totalCalls: data.api_stats.total_calls,
          todayCalls: data.api_stats.today_calls,
          monthlyCalls: data.api_stats.monthly_calls,
          successRate: data.api_stats.success_rate,
          queryStats: {
            totalQueries: data.api_stats.query_stats.total_queries,
            todayQueries: data.api_stats.query_stats.today_queries,
            outboundQueries: data.api_stats.query_stats.outbound_queries,
            inboundQueries: data.api_stats.query_stats.inbound_queries
          }
        },
        tokenStats: {
          totalRewards: data.token_stats.total_rewards,
          totalConsumption: data.token_stats.total_consumption,
          todayRewards: data.token_stats.today_rewards,
          todayConsumption: data.token_stats.today_consumption,
          monthlyRewards: data.token_stats.monthly_rewards,
          monthlyConsumption: data.token_stats.monthly_consumption,
          totalCirculation: data.token_stats.total_circulation,
          averageDailyConsumption: data.token_stats.average_daily_consumption
        },
        creditStats: {
          averageScore: data.credit_stats.average_score,
          levelDistribution: {
            aaaCount: data.credit_stats.level_distribution.aaa_count,
            aaCount: data.credit_stats.level_distribution.aa_count,
            aCount: data.credit_stats.level_distribution.a_count,
            bbbCount: data.credit_stats.level_distribution.bbb_count,
            bbCount: data.credit_stats.level_distribution.bb_count,
            otherCount: data.credit_stats.level_distribution.other_count
          },
          scoreTrends: data.credit_stats.score_trends.map(trend => ({
            date: trend.date,
            score: trend.score
          }))
        },
        systemStatus: data.system_status
      }
    };
  } catch (error) {
    console.error('Failed to fetch admin dashboard data:', error);
    return {
      success: false,
      message: error.message || '获取管理员看板数据失败'
    };
  }
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
    // 检查是否是 Ok 结果
    if (!response.Ok) {
      throw new Error(response.Err || '获取数据失败');
    }

    const data = response.Ok;  
    return {
      success: true,
      data: {
        basicInfo: {
          name: data.basic_info.name,
          id: data.basic_info.id,
          status: formatInstitutionStatus(data.basic_info.status),
          joinTime: data.basic_info.join_time,
          creditLevel: data.basic_info.credit_level,
          creditScore: data.basic_info.credit_score
        },
        submissionStats: {
          todaySubmissions: data.submission_stats.today_submissions,
          monthlySubmissions: data.submission_stats.monthly_submissions,
          totalSubmissions: data.submission_stats.total_submissions,
          submissionDistribution: {
            loanRecords: data.submission_stats.submission_distribution.loan_records,
            repaymentRecords: data.submission_stats.submission_distribution.repayment_records,
            notificationRecords: data.submission_stats.submission_distribution.notification_records
          }
        },
        usageStats: {
          queryOthers: data.usage_stats.query_others,
          queriedByOthers: data.usage_stats.queried_by_others,
          todayQueryOthers: data.usage_stats.today_query_others,
          todayQueriedByOthers: data.usage_stats.today_queried_by_others,
          monthlyQueries: data.usage_stats.monthly_queries,
          totalQueries: data.usage_stats.total_queries,
          apiQuota: {
            used: data.usage_stats.api_quota.used,
            total: data.usage_stats.api_quota.total
          }
        },
        tokenInfo: {
          balance: data.token_info.balance,
          totalSpent: data.token_info.total_spent,
          todaySpent: data.token_info.today_spent,
          totalReward: data.token_info.total_reward,
          todayReward: data.token_info.today_reward,
          monthlyEarned: data.token_info.monthly_earned,
          monthlySpent: data.token_info.monthly_spent
        },
        creditInfo: {
          creditScore: data.credit_info.credit_score,
          creditLevel: data.credit_info.credit_level,
          scoreHistory: data.credit_info.score_history.map(history => ({
            date: history.date,
            score: history.score
          })),
          dataQualityScore: data.credit_info.data_quality_score
        },
        systemStatus: {
          apiHealth: data.system_status.api_health,
          hasAnnouncement: data.system_status.has_announcement,
          lastUpdateTime: data.system_status.last_update_time,
          systemVersion: data.system_status.system_version
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

/**
 * 格式化机构状态
 * @param {Object} status 
 * @returns {string}
 */
function formatInstitutionStatus(status) {
  if (status?.Active) return 'active';
  if (status?.Inactive) return 'inactive';
  if (status?.Suspended) return 'suspended';
  if (status?.Pending) return 'pending';
  return 'unknown';
}

export default {
  getAdminDashboardData,
  getInstitutionDashboardData
};