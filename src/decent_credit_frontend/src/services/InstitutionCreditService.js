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

// 模拟用户记录数据
const MOCK_RECORDS = {
  success: true,
  data: [
    {
      id: '1',
      institutionId: 'bkyz2-fmaaa-aaaaa-qaaaq-cai',
      institutionName: '测试金融机构A',
      records: [
        {
          id: 'REC20240322001',
          record_type: 'loan',
          content: {
            amount: 100000,
            term: 12,
            interestRate: 4.35
          },
          timestamp: new Date('2024-03-22T10:00:00Z').getTime() * 1000000
        },
        {
          id: 'REC20240322002',
          record_type: 'repayment',
          content: {
            amount: 8500,
            originalLoanId: 'REC20240322001'
          },
          timestamp: new Date('2024-03-23T15:30:00Z').getTime() * 1000000
        }
      ]
    },
    {
      id: '2',
      institutionId: 'ckyz2-fmaaa-aaaaa-qaaar-cai',
      institutionName: '测试金融机构B',
      records: [
        {
          id: 'REC20240322003',
          record_type: 'loan',
          content: {
            amount: 50000,
            term: 6,
            interestRate: 3.85
          },
          timestamp: new Date('2024-03-21T09:00:00Z').getTime() * 1000000
        },
        {
          id: 'REC20240322004',
          record_type: 'overdue',
          content: {
            amount: 5000,
            overdueDays: 30
          },
          timestamp: new Date('2024-03-22T14:20:00Z').getTime() * 1000000
        }
      ]
    }
  ]
};

/**
 * 安全获取 Actor 实例
 */
async function getActor() {
  try {
    // const actor = await createActor();
    return {
      success: false,
      error: '获取 Actor 实例失败'
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
export async function getCreditRecords(institutionId = '', useMock =false) {
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let data = MOCK_DATA.data;
        if (institutionId) {
          data = data.filter(record => record.institutionId === institutionId);
        }
        resolve({ success: true, data });
      }, 0);
    });
  }

  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    const records = await actorResult.actor.get_credit_records();
    if (!records || !Array.isArray(records)) {
      return {
        success: false,
        message: '获取的记录格式无效'
      };
    }

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
 */
export async function createCreditRecord(record, useMock =false) {
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
      }, 0);
    });
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
      deduction_points: Number(record.deductionPoints),
      reason: record.reason,
      data_quality_issue: record.dataQualityIssue
    });

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
 * 查询机构详细信用记录
 */
export async function queryRecordDetails(institutionId, userDid, useMock =false) {
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const institution = MOCK_RECORDS.data.find(inst => inst.institutionId === institutionId);
        if (institution) {
          resolve({
            success: true,
            records: institution.records
          });
        } else {
          resolve({
            success: false,
            message: '未找到机构记录'
          });
        }
      }, 0);
    });
  }

  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    const details = await actorResult.actor.query_institution_records(institutionId, userDid);
    return {
      success: true,
      records: details
    };
  } catch (error) {
    console.error('查询详细记录失败:', error);
    throw new Error(error.message || '查询详细记录失败');
  }
}

/**
 * 查询用户信用记录
 */
export async function queryRecordsByUserDid(userDid, useMock =false) {
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const records = MOCK_RECORDS.data.map(inst => ({
          institution_id: inst.institutionId,
          institution_name: inst.institutionName,
          user_did: userDid
        }));
        resolve({ success: true, data: records });
      }, 0);
    });
  }

  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    const records = await actorResult.actor.query_user_records(userDid);
    return {
      success: true,
      data: records
    };
  } catch (error) {
    console.error('查询记录失败:', error);
    throw new Error(error.message || '查询记录失败');
  }
}

/**
 * 扣除查询代币
 */
export async function deductTokenForQuery(institutionId, useMock =false) {
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, deducted: true });
      }, 0);
    });
  }

  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    await actorResult.actor.deduct_query_token(institutionId);
    return { success: true };
  } catch (error) {
    console.error('代币扣除失败:', error);
    throw new Error(error.message || '代币扣除失败');
  }
}

/**
 * 获取用户风险评估
 */
export async function getRiskAssessment(userDid, useMock =false) {
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          creditScore: 85,
          riskLevel: '低风险',
          assessmentDetails: [
            '历史还款记录良好，从未出现逾期',
            '当前总负债率较低，约为收入的30%',
            '信用卡使用频率适中，额度利用率保持在合理水平'
          ],
          suggestions: [
            '建议继续保持良好的还款习惯',
            '可以考虑适度提高信用额度',
            '定期检查信用报告，确保信息准确性'
          ]
        });
      }, 0);
    });
  }

  const actorResult = await getActor();
  if (!actorResult.success) {
    return {
      success: false,
      message: actorResult.error
    };
  }

  try {
    const assessment = await actorResult.actor.get_risk_assessment(userDid);
    return assessment;
  } catch (error) {
    console.error('风险评估失败:', error);
    throw new Error(error.message || '风险评估失败');
  }
}

/**
 * 格式化信用记录数据
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
  createCreditRecord,
  queryRecordsByUserDid,
  queryRecordDetails,
  deductTokenForQuery,
  getRiskAssessment
};