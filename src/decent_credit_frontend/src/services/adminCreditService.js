import { Principal } from '@dfinity/principal';
import { getActor } from './IDL';



// 获取信用扣分记录列表
export async function getCreditRecords(institutionId = '') {
  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    let option = [];
    if (institutionId) {
      try {
        option = [Principal.fromText(institutionId)];
      } catch (error) {
        return {
          success: false,
          message: '无效的机构ID'
        };
      }
    }

    const records = await actorResult.get_credit_records(option);
    
    const formattedRecords = records
      .map(formatCreditRecord)
      .filter(record => record !== null);

    return {
      success: true,
      data: formattedRecords
    };
  } catch (error) {
    console.error('Failed to fetch credit records:', error);
    return {
      success: false,
      message: error.message || '获取信用记录失败'
    };
  }
}

export async function createCreditRecord(record) {
  if (!record.institutionId || !record.deductionPoints || !record.reason || !record.dataQualityIssue) {
    return {
      success: false,
      message: '请填写所有必要信息'
    };
  }

  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    let institutionPrincipal = Principal.fromText(record.institutionId);
    const result = await actorResult.actor.create_credit_record({
      institution_id: institutionPrincipal,
      deduction_points: Number(Math.floor(record.deductionPoints)),
      reason: record.reason,
      data_quality_issue: record.dataQualityIssue
    });
    console.log(result)
    if ('Err' in result) {
      return {
        success: false,  
        message: result.Err
      };
    }
    
    return {
      success: true,
      data: formatCreditRecord(result.Ok)
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '创建信用记录失败'
    };
  }
}

export async function queryRecordList(institutionId, userDid) {
  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    const institutionPrincipal = Principal.fromText(institutionId);
    const details = await actorResult.actor.query_institution_records_list(institutionPrincipal, userDid);
    
    if ('Err' in details) {
      return {
        success: false,
        message: details.Err
      };
    }

    return {
      success: true,
      data: details.Ok
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '查询详细记录失败'
    };
  }
}

export async function getRiskAssessment(userDid) {
  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    const institutionPrincipal = Principal.fromText(institutionId);

    const result = await actorResult.actor.get_risk_assessment(institutionPrincipal,userDid);
    
    if ('Err' in result) {
      return {
        success: false,
        message: result.Err
      };
    }

    return {
      success: true,
      data: result.Ok
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || '风险评估失败'
    };
  }
}

function formatCreditRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    const nsToMs = (ns) => {
      if (!ns) return 0;
      return Math.floor(Number(ns.toString()) / 1_000_000);
    };

    return {
      id: raw.id?.toString() || '',
      recordId: raw.record_id || '',
      institutionId: raw.institution_id?.toText() || '',
      institutionName: raw.institution_name || '',
      deductionPoints: Number(raw.deduction_points || 0),
      reason: raw.reason || '',
      dataQualityIssue: raw.data_quality_issue || '',
      createdAt: raw.created_at ? new Date(nsToMs(raw.created_at)).toISOString() : new Date().toISOString(),
      operatorId: raw.operator_id?.toText() || '',
      operatorName: raw.operator_name || ''
    };
  } catch (error) {
    console.error('Error formatting credit record:', error);
    return null;
  }
}

export default {
  getCreditRecords,
  createCreditRecord,
  queryRecordList,
  getRiskAssessment
};