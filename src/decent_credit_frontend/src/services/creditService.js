// creditService.js
// import { createActor } from './icpService';
import { Principal } from '@dfinity/principal';

// 模拟数据
const MOCK_DATA = {
  success: true,
  data: [
    {
      id: '1',
      recordId: 'CR20240323001',
      institutionId: 'bkyz2-fmaaa-aaaaa-qaaaq-cai',
      institutionName: '测试金融机构A',
      deductionPoints: 5,
      reason: '数据质量不合格：字段缺失率超过阈值',
      dataQualityIssue: '信贷数据中关键字段缺失率超过10%，包括：收入信息、工作信息等必填字段',
      createdAt: '2024-03-23T08:00:00.000Z',
      operatorId: 'admin1',
      operatorName: '管理员A'
    },
    {
      id: '2',
      recordId: 'CR20240323002',
      institutionId: 'ckyz2-fmaaa-aaaaa-qaaar-cai',
      institutionName: '测试金融机构B',
      deductionPoints: 3,
      reason: '数据质量不合格：数据准确性问题',
      dataQualityIssue: '发现多条数据存在明显的数据准确性问题，例如：贷款金额与还款记录不匹配',
      createdAt: '2024-03-23T10:30:00.000Z',
      operatorId: 'admin2',
      operatorName: '管理员B'
    }
  ]
};

/**
 * 安全获取 Actor 实例
 * @returns {Promise<{success: boolean, actor?: any, error?: string}>}
 */
async function getActor() {
  try {
    // const actor = await createActor();
    // if (!actor) {
      return {
        success: false,
        error: '获取 Actor 实例失败'
      };
    // }
    return {
      success: true,
      actor
    };
  } catch (error) {
    console.error('Failed to create actor:', error);
    return {
      success: false,
      error: error.message || '创建 Actor 实例失败'
    };
  }
}

/**
 * 获取信用扣分记录列表
 * @param {string} institutionId 机构ID（可选）
 * @param {boolean} useMock 是否使用模拟数据
 * @returns {Promise<Object>} 信用扣分记录列表
 */
export async function getCreditRecords(institutionId = '', useMock = true) {
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let data = MOCK_DATA.data;
        if (institutionId) {
          data = data.filter(record => record.institutionId === institutionId);
        }
        resolve({ success: true, data });
      }, 500);
    });
  }

  // 获取 Actor
  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    const records = await actorResult.actor.get_credit_records().catch(error => {
      throw new Error(error.message || '获取记录失败');
    });

    // 检查返回的记录是否有效
    if (!records || !Array.isArray(records)) {
      return {
        success: false,
        message: '获取的记录格式无效'
      };
    }

    // 过滤机构ID（如果提供）并格式化记录
    const formattedRecords = records
      .map(formatCreditRecord)
      .filter(record => record !== null)
      .filter(record => !institutionId || record.institutionId === institutionId);

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

/**
 * 创建信用扣分记录
 * @param {Object} record 扣分记录信息
 * @param {string} record.institutionId 机构ID
 * @param {number} record.deductionPoints 扣除分数
 * @param {string} record.reason 扣分原因
 * @param {string} record.dataQualityIssue 数据质量问题描述
 * @returns {Promise<Object>} 创建结果
 */
export async function createCreditRecord(record, useMock = true) {
  // 输入验证
  if (!record.institutionId || !record.deductionPoints || !record.reason || !record.dataQualityIssue) {
    return {
      success: false,
      message: '请填写所有必要信息'
    };
  }

  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: Date.now().toString(),
            recordId: `CR${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`,
            ...record,
            createdAt: new Date().toISOString(),
            operatorId: 'current-admin',
            operatorName: '当前管理员'
          }
        });
      }, 500);
    });
  }

  // 获取 Actor
  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    // 验证机构ID格式
    let institutionPrincipal;
    try {
      institutionPrincipal = Principal.fromText(record.institutionId);
    } catch (error) {
      return {
        success: false,
        message: '无效的机构ID格式'
      };
    }

    const createParams = {
      institution_id: institutionPrincipal,
      deduction_points: Number(record.deductionPoints),
      reason: record.reason,
      data_quality_issue: record.dataQualityIssue
    };

    const result = await actorResult.actor.create_credit_record(createParams).catch(error => {
      throw new Error(error.message || '创建记录失败');
    });

    // 检查返回结果
    if (!result) {
      return {
        success: false,
        message: '创建记录失败：未收到有效响应'
      };
    }

    const formattedRecord = formatCreditRecord(result);
    if (!formattedRecord) {
      return {
        success: false,
        message: '创建记录失败：格式化响应数据失败'
      };
    }

    return {
      success: true,
      data: formattedRecord
    };
  } catch (error) {
    console.error('Failed to create credit record:', error);
    return {
      success: false,
      message: error.message || '创建信用记录失败'
    };
  }
}

/**
 * 格式化信用记录数据
 * @param {Object} raw 原始记录数据
 * @returns {Object|null} 格式化后的记录或null（如果数据无效）
 */
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
      institutionId: raw.institution_id ? raw.institution_id.toText() : '',
      institutionName: raw.institution_name || '',
      deductionPoints: Number(raw.deduction_points || 0),
      reason: raw.reason || '',
      dataQualityIssue: raw.data_quality_issue || '',
      createdAt: raw.created_at ? new Date(nsToMs(raw.created_at)).toISOString() : new Date().toISOString(),
      operatorId: raw.operator_id ? raw.operator_id.toText() : '',
      operatorName: raw.operator_name || ''
    };
  } catch (error) {
    console.error('Error formatting credit record:', error);
    return null;
  }
}

export default {
  getCreditRecords,
  createCreditRecord
};