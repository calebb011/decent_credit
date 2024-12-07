import { Principal } from '@dfinity/principal';
import { getActor } from './IDL';

// 向 RecordService.js 中添加新方法
export const queryRecordById = async (recordId,loginInstitutionId) => {
  try {
    if (!recordId?.trim()) {
      return {
        success: false,
        message: 'Record ID cannot be empty'
      };
    }

    const actor = await getActor();
    const principal_id = Principal.fromText(loginInstitutionId);

    const result = await actor.query_record_by_id(recordId,principal_id);

    if ('Err' in result) {
      throw new Error(result.Err);
    }

    // 格式化记录
    const record = result.Ok;
    const formattedRecord = {
      id: record.id,
      institution_id: record.institution_id.toText(),
      institution_name: record.institution_name,
      institution_full_name: record.institution_full_name,
      user_did: record.user_did,
      event_date: record.event_date,
      record_type: formatRecordType(record.record_type),
      content: formatRecordContent(record.content),
      timestamp: Number(record.timestamp),
      status: formatStatus(record.status),
      reward_amount: record.reward_amount ? Number(record.reward_amount) : null,
      canister_id: record.canister_id
    };

    return {
      success: true,
      data: formattedRecord
    };

  } catch (error) {
    console.error('Query record by ID failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to query record'
    };
  }
};

export const queryRecordsByUserDid = async (userDid) => {
  if (!userDid?.trim()) {
      return {
          success: false,
          message: '用户DID不能为空'
      };
  }

  try {
      const actor = await getActor();
      const principal = Principal.fromText(localStorage.getItem('userPrincipal'));
      console.log("Principal object:", principal.toText()); 

      const response = await actor.query_records_by_user_did(principal, userDid);

      // 检查错误响应
      if ('Err' in response) {
          return {
              success: false,
              message: response  // 直接返回后端的错误信息
          };
      }

      const records = response.Ok;
      const formattedRecords = records.map(record => ({
          id: record.id,
          institution_id: record.institution_id.toText(),
          institution_name: record.institution_name,
          institution_full_name: record.institution_full_name,
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
      return {
          success: false,
          message: (error.message || '查询记录失败') + (error?.detail ? `\n详细信息: ${error.detail}` : '')
      };
  }
};

export const queryRecordList = async (institutionId, userDid) => {
  try {
    const actor = await getActor();
    
    // 将字符串转换为 Principal 类型
    const principal = Principal.fromText(institutionId);
   
    // 2. 查询机构记录详情
    const detailsResult = await actor.query_institution_records_list(
      principal, // 使用转换后的 Principal
      userDid
    );

    if ('Err' in detailsResult) {
      throw new Error(detailsResult.Err);
    }

    return 'Ok' in detailsResult ? {
      institution_id: detailsResult.Ok.institution_id.toText(),
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

export const getRiskAssessment = async (institutionId, userDid) => {
  try {
    const actor = await getActor();
    const principal = Principal.fromText(institutionId);
    const result = await actor.get_risk_assessment(principal, userDid);
    console.log(result)
    if ('Err' in result) {
      throw new Error(result.Err);
    }

    // 直接返回正确格式的数据
    return {
      success: true,
      data: {
        creditScore: result.Ok.credit_score,
        riskLevel: result.Ok.risk_level,
        assessmentDetails: result.Ok.assessment_details,
        suggestions: result.Ok.suggestions
      }
    };
  } catch (error) {
    console.error('Risk assessment error:', error);
    return {
      success: false,
      message: error.message || '获取风险评估失败'
    };
  }
};
export const queryAssessmentReports = async (institutionId, days = 30) => {
  try {
    const actor = await getActor();
    const principal = Principal.fromText(institutionId);
    console.log('query_assessment_reports')
    const response = await actor.query_assessment_reports(principal, [days]);
    console.log(response)
    return {
      success: true,
      data: response.data.map(report => ({
        ...report,
        assessment: {
          creditScore: Number(report.assessment.credit_score),
          riskLevel: report.assessment.risk_level,
          assessmentDetails: report.assessment.assessment_details,
          suggestions: report.assessment.suggestions
        }
      }))
    };
  } catch (error) {
    console.error('Query assessment reports error:', error);
    return {
      success: false,
      message: error.message || '获取报告列表失败'
    };
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
  queryRecordList,
  getRiskAssessment,
  queryRecordById  // 添加新方法

};