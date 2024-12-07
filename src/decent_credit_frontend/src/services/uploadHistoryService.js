import { Principal } from '@dfinity/principal';
import { getActor } from './IDL';

// Query failed records for an institution
export async function queryFailedRecordsList(institutionId) {
 

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
    console.log(result)
    if ('Err' in result) {
      return {
        success: false,
        message: result.Err
      };
    }

    return {
      success: true,
      data: formatInstitutionRecordResponse(result.Ok)
    };
  } catch (error) {
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
      } else if ('Notification' in content) {
        return {
          type: 'Notification',
          amount: content.Notification.amount,
          days: content.Notification.days,
          periodAmount: content.Notification.period_amount
        };
      }
      return null;
    };

    return {
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
      status: Object.keys(raw.status || {})[0] || '',
      rewardAmount: raw.reward_amount?.[0] || null
    };
  } catch (error) {
    console.error('Error formatting credit record:', error);
    return null;
  }
}

export default {
  queryFailedRecordsList
};