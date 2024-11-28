import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Constants
const DFX_HOST = "http://127.0.0.1:4943";
const CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";

// 创建一个单例 agent 实例
const agent = new HttpAgent({
  host: DFX_HOST,
  retryTimes: 3,
  fetchOptions: { timeout: 30000 }
});

// Actor 单例
let _actor = null;

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

// 创建 Actor 实例
export async function createActor() {
  if (_actor) return _actor;

  if (process.env.NODE_ENV !== "production") {
    await agent.fetchRootKey();
  }

  _actor = Actor.createActor(({ IDL }) => {
    // 添加 DCCTransactionRequest 类型定义
  const DCCTransactionRequest = IDL.Record({
    'dcc_amount': IDL.Nat64,
    'usdt_amount': IDL.Float64,
    'tx_hash': IDL.Text,
    'remarks': IDL.Text
  });
    // IDL 定义
    const LoginRequest = IDL.Record({
      'name': IDL.Text,
      'password': IDL.Text,
    });

    const LoginResponse = IDL.Record({
      'success': IDL.Bool,
      'institution_id': IDL.Opt(IDL.Principal),
      'message': IDL.Text,
    });

    const RegisterRequest = IDL.Record({
      'name': IDL.Text,
      'full_name': IDL.Text,
      'password': IDL.Opt(IDL.Text),
    });

    const Institution = IDL.Record({
      'id': IDL.Principal,
      'name': IDL.Text,
      'full_name': IDL.Text,
      'password_hash': IDL.Text,
      'status': IDL.Variant({ 'Active': IDL.Null, 'Inactive': IDL.Null }),
      'join_time': IDL.Nat64,
      'last_active': IDL.Nat64,
      'api_calls': IDL.Nat64,
      'dcc_consumed': IDL.Nat64,
      'data_uploads': IDL.Nat64,
      'credit_score': IDL.Record({
        'score': IDL.Nat64,
        'last_update': IDL.Nat64
      }),
      'token_trading': IDL.Record({
        'bought': IDL.Nat64,
        'sold': IDL.Nat64
      })
    });




// 记录内容结构
const RecordContent = IDL.Record({
  'amount': IDL.Nat64,
  'user_id': IDL.Vec(IDL.Nat8),
  'record_type': IDL.Nat8,
  'timestamp': IDL.Nat64,
  'term_months': IDL.Opt(IDL.Nat64),
  'interest_rate': IDL.Opt(IDL.Float64),
  'loan_id': IDL.Opt(IDL.Text),
  'days': IDL.Opt(IDL.Nat64),
  'period_amount': IDL.Opt(IDL.Nat64)
}); 

// 记录提交请求
const RecordSubmissionRequest = IDL.Record({
  // 'record_type': IDL.RE,
  'user_did': IDL.Text,
  'event_date': IDL.Text
  // 'content': RecordContent
});

// 记录状态
const RecordStatus = IDL.Variant({
  'Pending': IDL.Null,
  'Confirmed': IDL.Null,
  'Failed': IDL.Null
});

// 记录提交响应
const RecordSubmissionResponse = IDL.Record({
  'record_id': IDL.Text,
  'status': RecordStatus,
  'timestamp': IDL.Nat64,
  'reward_amount': IDL.Opt(IDL.Nat64)
});

// 批量提交请求
const BatchSubmissionRequest = IDL.Record({
  'records': IDL.Vec(RecordSubmissionRequest)
});


    return IDL.Service({
      'institution_login': IDL.Func([LoginRequest], [LoginResponse], ['update']),

'register_institution': IDL.Func(
        [RegisterRequest], 
        [IDL.Variant({ 'Ok': IDL.Principal, 'Err': IDL.Text })], // 修改这里
        ['update']
      ),      'login': IDL.Func([LoginRequest], [LoginResponse], ['update']),
      'change_password': IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], ['update']),
      'reset_password': IDL.Func([IDL.Principal], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], ['update']),
      'get_institution': IDL.Func([IDL.Principal], [IDL.Opt(Institution)], ['query']),
      'get_all_institutions': IDL.Func([], [IDL.Vec(Institution)], ['query']),
      'update_institution_status': IDL.Func([IDL.Principal, IDL.Bool], [], ['update']),
      'update_credit_score': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
      'record_api_call': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
      'record_data_upload': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
      'record_token_trading': IDL.Func([IDL.Principal, IDL.Bool, IDL.Nat64], [], ['update']),
      'recharge_dcc': IDL.Func(
      [IDL.Principal, DCCTransactionRequest], 
      [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], 
      ['update']
    ),
    'deduct_dcc': IDL.Func(
      [IDL.Principal, DCCTransactionRequest], 
      [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], 
      ['update']
    ),
   'submit_record': IDL.Func(
    [RecordSubmissionRequest], 
    [IDL.Variant({ 'Ok': RecordSubmissionResponse, 'Err': IDL.Text })],
    ['update']
  ),
  
  'submit_records_batch': IDL.Func(
    [BatchSubmissionRequest],
    [IDL.Variant({ 
      'Ok': IDL.Record({
        'submitted': IDL.Nat64,
        'failed': IDL.Nat64,
        'records': IDL.Vec(RecordSubmissionResponse)
      }),
      'Err': IDL.Text 
    })],
    ['update']
  )
    });
  }, {
    agent,
    canisterId: CANISTER_ID
  });

  return _actor;
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
export {
  DFX_HOST,
  CANISTER_ID,
};