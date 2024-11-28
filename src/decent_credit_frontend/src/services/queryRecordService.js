import { Principal } from '@dfinity/principal';
import { createActor } from './IDL';

export const queryRecordsByUserDid = async (userDid) => {
  if (!userDid?.trim()) {
    return {
      success: false,
      message: '用户DID不能为空'
    };
  }

  try {
    const actor = await createActor();
    const records = await actor.query_records_by_user_did(userDid);

    const formattedRecords = records.map(record => ({
      id: record.id,
      institution_id: record.institution_id.toText(),
      user_did: record.user_did,
      event_date: record.event_date,
      record_type: formatRecordType(record.record_type),
      content: formatRecordContent(record.content),
      timestamp: Number(record.timestamp),
      status: formatStatus(record.status),
      reward_amount: record.reward_amount ? Number(record.reward_amount) : null,
      canister_id: record.canister_id
    }));

    return {
      success: true,
      data: formattedRecords
    };
  } catch (error) {
    console.error('查询记录失败:', error);
    return {
      success: false,
      message: error.message || '查询记录失败'
    };
  }
};

export const queryRecordDetails = async (institutionId, userDid) => {
  try {
    const actor = await createActor();
    
    // 将字符串转换为 Principal 类型
    const principal = Principal.fromText(institutionId);
    
    // 1. 扣除代币
    const deductResult = await actor.deduct_query_token(
      principal, // 使用转换后的 Principal
      userDid
    );
    
    if ('Err' in deductResult) {
      throw new Error(deductResult.Err);
    }

    // 2. 查询机构记录详情
    const detailsResult = await actor.query_institution_records(
      principal, // 使用转换后的 Principal
      userDid
    );

    if ('Err' in detailsResult) {
      throw new Error(detailsResult.Err);
    }

    return 'Ok' in detailsResult ? {
      institution_id: detailsResult.Ok.institution_id.toText(),
      institution_name: detailsResult.Ok.institution_name,
      user_did: detailsResult.Ok.user_did,
      records: detailsResult.Ok.records.map(record => ({
        id: record.id,
        record_type: formatRecordType(record.record_type),
        event_date: record.event_date,
        content: formatRecordContent(record.content),
        timestamp: Number(record.timestamp),
        status: formatStatus(record.status)
      }))
    } : null;

  } catch (error) {
    throw new Error(error.message || '查询详情失败');
  }
};

export const getRiskAssessment = async (userDid) => {
  try {
    const actor = await createActor();
    const result = await actor.get_risk_assessment(userDid);
    
    if ('Err' in result) {
      throw new Error(result.Err);
    }
    
    return 'Ok' in result ? {
      creditScore: Number(result.Ok.credit_score),
      riskLevel: result.Ok.risk_level,
      assessmentDetails: result.Ok.assessment_details,
      suggestions: result.Ok.suggestions
    } : null;
  } catch (error) {
    throw new Error(error.message || '获取风险评估失败');
  }
};

// 辅助格式化函数
function formatRecordType(type) {
  if ('LoanRecord' in type) return 'loan';
  if ('RepaymentRecord' in type) return 'repayment';
  if ('NotificationRecord' in type) return 'notification';
  return 'unknown';
}

function formatStatus(status) {
  if ('Pending' in status) return 'pending';
  if ('Confirmed' in status) return 'confirmed';
  if ('Rejected' in status) return 'rejected';
  return 'unknown';
}

function formatRecordContent(content) {
  if ('Loan' in content) {
    const loan = content.Loan;
    return {
      type: 'loan',
      amount: Number(loan.amount),
      loan_id: loan.loan_id,
      term_months: Number(loan.term_months),
      interest_rate: Number(loan.interest_rate)
    };
  }
  if ('Repayment' in content) {
    const repayment = content.Repayment;
    return {
      type: 'repayment',
      amount: Number(repayment.amount),
      loan_id: repayment.loan_id,
      repayment_date: repayment.repayment_date
    };
  }
  if ('Notification' in content) {
    const notification = content.Notification;
    return {
      type: 'notification',
      amount: Number(notification.amount),
      days: Number(notification.days),
      period_amount: Number(notification.period_amount)
    };
  }
  return null;
}

export default {
  queryRecordsByUserDid,
  queryRecordDetails,
  getRiskAssessment
};