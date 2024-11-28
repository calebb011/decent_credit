import { Principal } from "@dfinity/principal";
import { createActor } from './IDL';


// 工具函数
const nsToMs = (ns) => {
  if (!ns) return Date.now();
  return Math.floor(Number(ns.toString()) / 1_000_000);
};

// 格式化机构数据的函数
function formatInstitution(raw) {
  if (!raw) {
    throw new Error('Invalid institution data');
  }

  try {
    return {
      id: typeof raw.id === 'string' ? raw.id : raw.id?.toText?.(),
      name: raw.name,
      full_name: raw.full_name,
      password : raw.password,
      status: raw.status?.Active !== undefined ? 'active' : 'inactive',
      join_time: raw.join_time ? new Date(nsToMs(raw.join_time)).toISOString() : null,
      last_active: raw.last_active ? new Date(nsToMs(raw.last_active)).toISOString() : null,
      api_calls: Number(raw.api_calls || 0),
      dcc_consumed: Number(raw.dcc_consumed || 0),
      data_uploads: Number(raw.data_uploads || 0),
      credit_score: {
        score: Number(raw.credit_score?.score || 0),
        last_update: raw.credit_score?.last_update ? nsToMs(raw.credit_score.last_update) : null
      },
      token_trading: {
        bought: Number(raw.token_trading?.bought || 0),
        sold: Number(raw.token_trading?.sold || 0)
      }
    };
  } catch (error) {
    console.error('Error formatting institution:', error);
    throw new Error('Failed to format institution data');
  }
}


// 机构管理功能
export async function registerInstitution(formData) {
  console.log('创建机构:', formData);

  if (!formData.name || !formData.full_name) {
    throw new Error('机构名称和全称不能为空');
  }

  const actor = await createActor();
  const request = {
    name: formData.name,
    full_name: formData.full_name,
    password: formData.password ? [formData.password] : []
  };
  
  console.log('Register request:', request);
  
  const result = await actor.register_institution(request);
  if ('Err' in result) {
    throw new Error(result.Err);
  }
  
  return {
    success: true,
    institution_id: result.Ok,
    message: '注册成功'
  };
}
export async function loginInstitution(formData) {
  const actor = await createActor();
  const request = {
    name: formData.name,
    password: formData.password
  };
    
  const response = await actor.login(request);
  if (response.success && response.institution_id?.[0]) {
    const institutionId = response.institution_id[0].toText();
    localStorage.setItem('institutionId', institutionId);
    localStorage.setItem('institutionName', formData.name);
  }
  return response;
}

export async function getAllInstitutions() {
  const actor = await createActor();
  const institutions = await actor.get_all_institutions();
  return institutions.map(inst => formatInstitution(inst));
}

export async function getInstitution(id) {
  const actor = await createActor();
  const institution = await actor.get_institution(id);
  if (!institution || institution.length === 0) {
    throw new Error('Institution not found');
  }
  return formatInstitution(institution[0]);
}

export async function changePassword(oldPassword, newPassword) {
  const actor = await createActor();
  return await actor.change_password(oldPassword, newPassword);
}

export async function resetPassword(institutionId) {
  const actor = await createActor();
  return await actor.reset_password(institutionId);
}

export async function updateInstitutionStatus(id, isActive) {
  const actor = await createActor();
  try {
    // 确保 id 是有效的 Principal
    const principalId = typeof id === 'string' ? Principal.fromText(id) : id;
    
    // 添加日志便于调试
    console.log('Updating institution status:', {
      id: principalId.toText(),
      isActive
    });

    await actor.update_institution_status(principalId, isActive);
    return true;
  } catch (error) {
    console.error('Failed to update institution status:', error);
    throw new Error(`更新机构状态失败: ${error.message}`);
  }
}

export async function buyDCC(amount) {
  const actor = await createActor();
  const account = localStorage.getItem('institutionId');
  if (!account) throw new Error('No institution ID found');
    
  await actor.record_token_trading(Principal.fromText(account), true, BigInt(amount));
  return {
    success: true,
    message: "购买成功"
  };
}

export async function sellDCC(amount) {
  const actor = await createActor();
  const account = localStorage.getItem('institutionId');
  if (!account) throw new Error('No institution ID found');
    
  await actor.record_token_trading(Principal.fromText(account), false, BigInt(amount));
  return {
    success: true,
    message: "卖出成功"
  };
}

export async function getBalance() {
  const account = localStorage.getItem('institutionId');
  if (!account) throw new Error('No institution ID found');
    
  const institution = await getInstitution(account);
  if (!institution?.token_trading) throw new Error('Invalid institution data');
    
  return {
    success: true,
    data: {
      dcc: Number(institution.token_trading.bought) - Number(institution.token_trading.sold)
    }
  };
}

// 记录 API 调用
export async function recordApiCall(institutionId, calls = 1) {
  const actor = await createActor();
  if (!institutionId) throw new Error('No institution ID provided');
  await actor.record_api_call(
    typeof institutionId === 'string' ? Principal.fromText(institutionId) : institutionId,
    BigInt(calls)
  );
  return true;
}

// 记录数据上传
export async function recordDataUpload(institutionId, size = 1) {
  const actor = await createActor();
  if (!institutionId) throw new Error('No institution ID provided');
  await actor.record_data_upload(
    typeof institutionId === 'string' ? Principal.fromText(institutionId) : institutionId,
    BigInt(size)
  );
  return true;
}

// 更新信用分数
export async function updateCreditScore(institutionId, score) {
  const actor = await createActor();
  if (!institutionId) throw new Error('No institution ID provided');
  if (score < 0 || score > 1000) throw new Error('Invalid credit score');
    
  await actor.update_credit_score(
    typeof institutionId === 'string' ? Principal.fromText(institutionId) : institutionId,
    BigInt(score)
  );
  return true;
}

// 管理员登录功能
export async function loginAdmin(formData) {
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "admin123";

  if (!formData?.username || !formData?.password) {
    throw new Error('Invalid credentials');
  }

  if (formData.username === ADMIN_USERNAME && formData.password === ADMIN_PASSWORD) {
    localStorage.setItem('adminToken', 'admin-token');
    return {
      success: true,
      message: '登录成功'
    };
  }
    
  return {
    success: false,
    message: '用户名或密码错误'
  };
}

// 工具函数
export function getCurrentInstitutionId() {
  const id = localStorage.getItem('institutionId');
  return id || null;
}

export function getCurrentInstitutionName() {
  const name = localStorage.getItem('institutionName');
  return name || null;
}

export function isAdmin() {
  return !!localStorage.getItem('adminToken');
}

export function logout() {
  localStorage.removeItem('institutionId');
  localStorage.removeItem('institutionName');
  localStorage.removeItem('adminToken');
}

// 记录提交相关的方法
export async function submitRecord(request) {
  const actor = await createActor();
  try {
    console.log('Submitting record:', request);
    const response = await actor.submit_record(request);
    
    if ('Err' in response) {
      throw new Error(response.Err);
    }

    return {
      success: true,
      data: {
        recordId: response.Ok.record_id,
        status: getStatusString(response.Ok.status),
        timestamp: Number(response.Ok.timestamp),
        rewardAmount: response.Ok.reward_amount ? Number(response.Ok.reward_amount[0]) : null
      }
    };
  } catch (error) {
    console.error('Submit record failed:', error);
    throw error;
  }
}

export async function submitRecordsBatch(records) {
  const actor = await createActor();
  try {
    const batchRequest = {
      records: records.map(record => ({
        record_type: getRecordType(record.record_type),
        user_did: record.user_did,
        event_date: record.event_date,
        content: {
          amount: BigInt(record.content.amount),
          user_id: Array.from(new TextEncoder().encode(record.user_did)),
          record_type: getRecordTypeNumber(record.record_type),
          timestamp: BigInt(record.content.timestamp),
          term_months: record.content.term ? [BigInt(record.content.term)] : [],
          interest_rate: record.content.interestRate ? [record.content.interestRate] : [],
          loan_id: record.content.originalLoanId ? [record.content.originalLoanId] : [],
          days: record.content.overdueDays ? [BigInt(record.content.overdueDays)] : [],
          period_amount: record.content.amount ? [BigInt(record.content.amount)] : []
        }
      }))
    };

    const response = await actor.submit_records_batch(batchRequest);
    
    if ('Err' in response) {
      throw new Error(response.Err);
    }

    return {
      success: true,
      data: {
        submitted: Number(response.Ok.submitted),
        failed: Number(response.Ok.failed),
        records: response.Ok.records.map(record => ({
          recordId: record.record_id,
          status: getStatusString(record.status),
          timestamp: Number(record.timestamp),
          rewardAmount: record.reward_amount ? Number(record.reward_amount[0]) : null
        }))
      }
    };
  } catch (error) {
    console.error('Submit records batch failed:', error);
    throw error;
  }
}

// 辅助函数
// 辅助函数
function getRecordType(type) {
  const recordType = type.toLowerCase();
  switch(recordType) {
    case 'loan':
      return ({ 'Loan': null }); // 注意这里的括号和引号
    case 'repayment':
      return ({ 'Repayment': null });
    case 'overdue':
      return ({ 'Overdue': null });
    default:
      throw new Error(`Invalid record type: ${type}`);
  }
}

function getRecordTypeNumber(type) {
  switch(type.toLowerCase()) {
    case 'loan': return 1;
    case 'repayment': return 2;
    case 'overdue': return 3;
    default: return 0;
  }
}

function getStatusString(status) {
  if ('Pending' in status) return 'pending';
  if ('Confirmed' in status) return 'confirmed';
  if ('Failed' in status) return 'failed';
  return 'unknown';
}

// 导出常量
