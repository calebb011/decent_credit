import { Principal } from '@dfinity/principal';
import { getActor } from './IDL';



// 获取信用扣分记录列表
export async function getCreditRecords(institutionId = '') {
  try {
    const actorResult = await getActor();
    
    // 处理参数，将其转换为 Option<Principal>
    let option = null;  // 默认为 null，对应 Rust 中的 None
    if (institutionId) {
      try {
        option = Principal.fromText(institutionId);  // 如果有值，创建 Principal，对应 Rust 中的 Some
      } catch (error) {
        console.error('Invalid institution ID:', error);
        return {
          success: false,
          message: 'Invalid institution ID format'
        };
      }
    }

    console.log('Fetching records with institution_id:', option);
    const records = await actorResult.get_credit_records();  // 传递 option
    console.log('Received records:', records);

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
      message: error.message || 'Failed to fetch credit records'
    };
  }
}

export async function createCreditRecord(record) {
  if (!record.institutionId || 
      record.deductionPoints === undefined || 
      record.deductionPoints === '' || 
      !record.reason || 
      !record.dataQualityIssue) {
    return {
      success: false,
      message: 'Please fill in all required fields'
    };
  }

  const actorResult = await getActor();


  try {
    // 确保 deductionPoints 是正整数
    const deductionPoints = Math.floor(Math.abs(Number(record.deductionPoints)));
    if (isNaN(deductionPoints) || deductionPoints <= 0) {
      return {
        success: false,
        message: 'Deduction points must be a positive integer'
      };
    }

    let institutionPrincipal;
    try {
      institutionPrincipal = Principal.fromText(record.institutionId);
    } catch (error) {
      return {
        success: false,
        message: 'Invalid institution ID format'
      };
    }

    const payload = {
      institution_id: institutionPrincipal,
      deduction_points: deductionPoints,
      reason: record.reason.trim(),
      data_quality_issue: record.dataQualityIssue.trim()
    };

    console.log('Sending payload to backend:', payload);

    const result = await actorResult.create_credit_record(payload);
    console.log('Backend response:', result);

    if ('Err' in result) {
      // 处理后端返回的中文错误信息
      const errorMsg = result.Err;
      // 错误信息映射
      const errorMap = {
        '机构不存在': 'Institution does not exist',
        '未知机构': 'Unknown institution',
        '创建信用记录失败': 'Failed to create credit record'
      };
      
      return {
        success: false,
        message: errorMap[errorMsg] || errorMsg // 如果没有映射就使用原始消息
      };
    }
    
    return {
      success: true,
      data: formatCreditRecord(result.Ok)
    };
  } catch (error) {
    console.error('Create record error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create credit record'
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
    const details = await actorResult.query_institution_records_list(institutionPrincipal, userDid);
    
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