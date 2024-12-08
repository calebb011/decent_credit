import { Principal } from '@dfinity/principal';
import { getActor } from './IDL';

// Query failed records for an institution
export async function queryFailedRecordsList(institutionId, status = '') {
  try {
    // 首先确保我们有有效的 institutionId
    if (!institutionId) {
      throw new Error('Institution ID is required');
    }

    // 使用 Principal.fromText() 创建 Principal 对象
    let principalId;
    try {
      principalId = Principal.fromText(institutionId);
    } catch (error) {
      console.error('Error creating Principal:', error);
      throw new Error('Invalid institution ID format');
    }

    const actor = await getActor();
    const result = await actor.query_institution_records_failed_list(principalId);
    console.log('Raw result:', result);

    if ('Err' in result) {
      return {
        success: false,
        message: result.Err
      };
    }

    // 格式化并根据状态筛选记录
    const formattedResponse = formatInstitutionRecordResponse(result.Ok);
    if (status && formattedResponse?.records) {
      formattedResponse.records = formattedResponse.records.filter(record => 
        // 处理空状态（显示所有）或匹配指定状态
        !status || record.status.toLowerCase() === status.toLowerCase()
      );
    }

    return {
      success: true,
      data: formattedResponse
    };
  } catch (error) {
    console.error('Query failed records error:', error);
    return {
      success: false,
      message: error.message || '查询失败记录失败'
    };
  }
}

// Format the institution record response
function formatInstitutionRecordResponse(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    return {
      institutionId: raw.institution_id?.toText() || '',
      institutionName: raw.institution_name || '',
      userDid: raw.user_did || '',
      records: (raw.records || []).map(formatCreditRecord).filter(Boolean)
    };
  } catch (error) {
    console.error('Error formatting institution record response:', error);
    return null;
  }
}

// Format individual credit record
function formatCreditRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    const nsToMs = (ns) => {
      if (!ns) return 0;
      return Math.floor(Number(ns.toString()) / 1_000_000);
    };

    const getContentDetails = (content) => {
      if ('Loan' in content) {
        return {
          type: 'Loan',
          amount: content.Loan.amount,
          loanId: content.Loan.loan_id,
          termMonths: content.Loan.term_months,
          interestRate: content.Loan.interest_rate
        };
      } else if ('Repayment' in content) {
        return {
          type: 'Repayment',
          amount: content.Repayment.amount,
          loanId: content.Repayment.loan_id,
          repaymentDate: content.Repayment.repayment_date
        };
      } else if ('Overdue' in content) {
        return {
          type: 'Overdue',
          amount: content.Overdue.amount,
          overdueDays: content.Overdue.overdueDays,
          periodAmount: content.Overdue.period_amount
        };
      }
      return null;
    };

    const record = {
      id: raw.id || '',
      institutionId: raw.institution_id?.toText() || '',
      institutionName: raw.institution_name || '',
      institutionFullName: raw.institution_full_name || '',
      recordType: Object.keys(raw.record_type || {})[0] || '',
      userDid: raw.user_did || '',
      eventDate: raw.event_date || '',
      content: getContentDetails(raw.content) || {},
      canisterId: raw.canister_id || '',
      timestamp: raw.timestamp ? new Date(nsToMs(raw.timestamp)).toISOString() : '',
      status: Object.keys(raw.status || {})[0]?.toLowerCase() || '',
      rewardAmount: raw.reward_amount?.[0] || null
    };

    // 添加调试日志
    console.log('Formatted record:', record);
    
    return record;
  } catch (error) {
    console.error('Error formatting credit record:', error);
    return null;
  }
}

export default {
  queryFailedRecordsList
};