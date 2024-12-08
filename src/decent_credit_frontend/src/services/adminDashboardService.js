import { getActor } from './IDL';
import { Principal } from '@dfinity/principal';

/**
 * 获取管理员看板数据
 */
export async function getAdminDashboardData() {
    const actor = await getActor();
    try {
        const dashboardData = await actor.get_admin_dashboard_data();
        return formatResponse(dashboardData);
    } catch (error) {
        console.error('Failed to fetch admin dashboard data:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch data'
        };
    }
}

/**
 * 格式化响应数据
 */
function formatResponse(raw) {
    if (!raw) return { success: false, message: 'No data' };

    try {
        const institutionStats = {
            totalCount: Number(raw.institution_stats.total_count),
            activeCount: Number(raw.institution_stats.active_count),
            todayNewCount: Number(raw.institution_stats.today_new_count)
        };

        const dataStats = {
            totalRecords: Number(raw.data_stats.total_records),
            todayRecords: Number(raw.data_stats.today_records),
            growthRate: Number(raw.data_stats.growth_rate),
            dataDistribution: {
                loanRecords: Number(raw.data_stats.data_distribution.loan_records),
                repaymentRecords: Number(raw.data_stats.data_distribution.repayment_records),
                notificationRecords: Number(raw.data_stats.data_distribution.notification_records)
            }
        };

        const apiStats = {
            totalCalls: Number(raw.api_stats.total_calls),
            todayCalls: Number(raw.api_stats.today_calls),
            successRate: Number(raw.api_stats.success_rate),
            queryStats: {
                totalQueries: Number(raw.api_stats.query_stats.total_queries),
                todayQueries: Number(raw.api_stats.query_stats.today_queries),
                outboundQueries: Number(raw.api_stats.query_stats.outbound_queries),
                inboundQueries: Number(raw.api_stats.query_stats.inbound_queries)
            }
        };

        const tokenStats = {
            totalRewards: Number(raw.token_stats.total_rewards),
            totalConsumption: Number(raw.token_stats.total_consumption),
            totalBalance: Number(raw.token_stats.total_balance),
            todayRewards: Number(raw.token_stats.today_rewards),
            todayConsumption: Number(raw.token_stats.today_consumption),
            totalCirculation: Number(raw.token_stats.total_circulation),
            averageDailyConsumption: Number(raw.token_stats.average_daily_consumption)
        };

        const creditStats = {
            averageScore: Number(raw.credit_stats.average_score),
            levelDistribution: {
                aaaCount: Number(raw.credit_stats.level_distribution.aaa_count),
                aaCount: Number(raw.credit_stats.level_distribution.aa_count),
                aCount: Number(raw.credit_stats.level_distribution.a_count),
                bbbCount: Number(raw.credit_stats.level_distribution.bbb_count),
                bbCount: Number(raw.credit_stats.level_distribution.bb_count),
                otherCount: Number(raw.credit_stats.level_distribution.other_count)
            }
        };

        const systemStatus = {
            apiHealth: raw.system_status.api_health,
            hasAnnouncement: raw.system_status.has_announcement,
            lastUpdateTime: Number(raw.system_status.last_update_time),
            systemVersion: raw.system_status.system_version
        };

        return {
            success: true,
            data: {
                institutionStats,
                dataStats,
                apiStats,
                tokenStats,
                creditStats,
                systemStatus
            }
        };
    } catch (error) {
        console.error('Error formatting dashboard data:', error);
        return {
            success: false,
            message: 'Error formatting data'
        };
    }
}

/**
 * 辅助函数：格式化日期时间
 */
function formatTimestamp(ns) {
    if (!ns) return null;
    return new Date(Number(ns) / 1_000_000).toISOString();
}

/**
 * 辅助函数：确保数字类型
 */
function ensureNumber(value) {
    if (typeof value === 'undefined' || value === null) return 0;
    return Number(value);
}

export default {
    getAdminDashboardData
};