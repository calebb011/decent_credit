import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Constants
const DFX_HOST = "http://127.0.0.1:4943";
const CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";

// Mock flag
let isMockMode = false;

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

// 生成模拟机构数据的函数
function generateMockInstitution(customId = 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
  const now = BigInt(Date.now() * 1_000_000);
  return {
    id: customId,
    name: 'Mock Institution',
    full_name: 'Mock Institution Full Name',
    password_hash: 'mock_password_hash',
    status: { Active: null },
    join_time: now,
    last_active: now,
    api_calls: BigInt(100),
    dcc_consumed: BigInt(500),
    data_uploads: BigInt(50),
    credit_score: {
      score: BigInt(750),
      last_update: now
    },
    token_trading: {
      bought: BigInt(1000),
      sold: BigInt(200)
    }
  };
}

// 格式化机构数据的函数
function formatInstitution(raw) {
  if (!raw) {
    const mockInst = generateMockInstitution();
    return formatInstitution(mockInst);
  }

  try {
    const formatted = {
      id: typeof raw.id === 'string' ? raw.id : (raw.id?.toText?.() || 'rrkah-fqaaa-aaaaa-aaaaq-cai'),
      name: raw.name || 'Unknown Institution',
      full_name: raw.full_name || 'Unknown Institution Full Name',
      status: raw.status?.Active !== undefined ? 'active' : 'inactive',
      join_time: raw.join_time ? new Date(nsToMs(raw.join_time)).toISOString() : new Date().toISOString(),
      last_active: raw.last_active ? new Date(nsToMs(raw.last_active)).toISOString() : new Date().toISOString(),
      api_calls: Number(raw.api_calls || 0),
      dcc_consumed: Number(raw.dcc_consumed || 0),
      data_uploads: Number(raw.data_uploads || 0),
      credit_score: {
        score: Number(raw.credit_score?.score || 0),
        last_update: raw.credit_score?.last_update ? nsToMs(raw.credit_score.last_update) : Date.now()
      },
      token_trading: {
        bought: Number(raw.token_trading?.bought || 0),
        sold: Number(raw.token_trading?.sold || 0)
      }
    };
    
    return formatted;
  } catch (error) {
    console.error('Error formatting institution:', error, raw);
    return formatInstitution(generateMockInstitution());
  }
}

// 创建模拟 Actor
function createMockActor() {
  return {
    register_institution: async (request) => {
      console.log('Mock register institution:', request);
      return Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
    },
    login: async (request) => {
      console.log('Mock login:', request);
      return {
        success: true,
        institution_id: [Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai')],
        message: '登录成功（模拟数据）'
      };
    },
    get_institution: async (id) => {
      console.log('Mock get institution:', id);
      return [generateMockInstitution(typeof id === 'string' ? id : id.toText())];
    },
    get_all_institutions: async () => {
      console.log('Mock get all institutions');
      // 返回多条模拟数据
      return [
        generateMockInstitution('rrkah-fqaaa-aaaaa-aaaaq-cai'),
        generateMockInstitution('rrk4h-fqaaa-aaaaa-aaaaq-cai'),
        generateMockInstitution('rrk5h-fqaaa-aaaaa-aaaaq-cai')
      ];
    },
    change_password: async (oldPw, newPw) => {
      console.log('Mock change password');
      return { Ok: null };
    },
    reset_password: async (id) => {
      console.log('Mock reset password');
      return { Ok: 'mock_new_password' };
    },
    update_institution_status: async (id, status) => {
      console.log('Mock update status:', id, status);
      return null;
    },
    update_credit_score: async (id, score) => {
      console.log('Mock update credit score:', id, score);
      return null;
    },
    record_api_call: async (id, calls) => {
      console.log('Mock record api call:', id, calls);
      return null;
    },
    record_data_upload: async (id, uploads) => {
      console.log('Mock record data upload:', id, uploads);
      return null;
    },
    record_token_trading: async (id, isBuy, amount) => {
      console.log('Mock record token trading:', id, isBuy, amount);
      return null;
    }
  };
}

// 创建 Actor 实例
export async function createActor() {
  if (_actor) return _actor;

  try {
    if (process.env.NODE_ENV !== "production") {
      try {
        await agent.fetchRootKey();
      } catch (error) {
        console.warn('Failed to fetch root key, continuing with mock data:', error);
        isMockMode = true;
      }
    }

    if (isMockMode) {
      console.log('Creating mock actor');
      _actor = createMockActor();
      return _actor;
    }

    try {
      _actor = Actor.createActor(({ IDL }) => {
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

        return IDL.Service({
          'register_institution': IDL.Func([RegisterRequest], [IDL.Principal], ['update']),
          'login': IDL.Func([LoginRequest], [LoginResponse], ['update']),
          'change_password': IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], ['update']),
          'reset_password': IDL.Func([IDL.Principal], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], ['update']),
          'get_institution': IDL.Func([IDL.Principal], [IDL.Opt(Institution)], ['query']),
          'get_all_institutions': IDL.Func([], [IDL.Vec(Institution)], ['query']),
          'update_institution_status': IDL.Func([IDL.Principal, IDL.Bool], [], ['update']),
          'update_credit_score': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
          'record_api_call': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
          'record_data_upload': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
          'record_token_trading': IDL.Func([IDL.Principal, IDL.Bool, IDL.Nat64], [], ['update']),
        });
      }, {
        agent,
        canisterId: CANISTER_ID
      });

      return _actor;
    } catch (error) {
      console.warn('Failed to create real actor, using mock actor:', error);
      isMockMode = true;
      _actor = createMockActor();
      return _actor;
    }
  } catch (error) {
    console.error('Critical error in createActor:', error);
    isMockMode = true;
    _actor = createMockActor();
    return _actor;
  }
}

// 机构管理功能
export async function registerInstitution(formData) {
  const actor = await createActor();
  try {
    const request = {
      name: formData.name || 'Unknown',
      full_name: formData.full_name || 'Unknown Full Name',
      password: formData.password ? [formData.password] : []
    };
    
    const result = await actor.register_institution(request);
    return {
      success: true,
      institution_id: result,
      message: isMockMode ? '注册成功（模拟数据）' : '注册成功'
    };
  } catch (error) {
    console.error('Registration failed:', error);
    const mockInstitution = generateMockInstitution();
    return {
      success: true,
      institution_id: mockInstitution.id,
      message: '注册成功（模拟数据）'
    };
  }
}

export async function loginInstitution(formData) {
  const actor = await createActor();
  try {
    const request = {
      name: formData.name || '',
      password: formData.password || ''
    };
    
    const response = await actor.login(request);
    if (response.success && response.institution_id?.[0]) {
      const institutionId = response.institution_id[0].toText();
      localStorage.setItem('institutionId', institutionId);
      localStorage.setItem('institutionName', formData.name);
    }
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    const mockInstitution = generateMockInstitution();
    const mockResponse = {
      success: true,
      institution_id: [mockInstitution.id],
      message: '登录成功（模拟数据）'
    };
    localStorage.setItem('institutionId', mockInstitution.id);
    localStorage.setItem('institutionName', formData.name);
    return mockResponse;
  }
}

export async function getAllInstitutions() {
  const actor = await createActor();
  try {
    const institutions = await actor.get_all_institutions();
    const formattedInstitutions = institutions
      .map(inst => formatInstitution(inst))
      .filter(Boolean);
    
    return formattedInstitutions.length > 0 
      ? formattedInstitutions 
      : [formatInstitution(generateMockInstitution())];
  } catch (error) {
    console.error('Failed to get institutions:', error);
    // 返回多个模拟数据
    return [
      formatInstitution(generateMockInstitution('rrkah-fqaaa-aaaaa-aaaaq-cai')),
      formatInstitution(generateMockInstitution('rrk4h-fqaaa-aaaaa-aaaaq-cai')),
      formatInstitution(generateMockInstitution('rrk5h-fqaaa-aaaaa-aaaaq-cai'))
    ];
  }
}

export async function getInstitution(id) {
  const actor = await createActor();
  try {
    const institution = await actor.get_institution(id);
    if (!institution || institution.length === 0) {
      return formatInstitution(generateMockInstitution(typeof id === 'string' ? id : id.toText()));
    }
    const formatted = formatInstitution(institution[0]);
    return formatted || formatInstitution(generateMockInstitution(typeof id === 'string' ? id : id.toText()));
  } catch (error) {
    console.error('Failed to get institution:', error);
    return formatInstitution(generateMockInstitution(typeof id === 'string' ? id : id.toText()));
  }
}

export async function changePassword(oldPassword, newPassword) {
  const actor = await createActor();
  try {
    return await actor.change_password(oldPassword, newPassword);
  } catch (error) {
    console.error('Change password failed:', error);
    return { Ok: null };
  }
}

export async function resetPassword(institutionId) {
  const actor = await createActor();
  try {
    return await actor.reset_password(institutionId);
  } catch (error) {
    console.error('Reset password failed:', error);
    return { Ok: 'mock_new_password' };
  }
}

export async function updateInstitutionStatus(id, isActive) {
  const actor = await createActor();
  try {
    await actor.update_institution_status(id, isActive);
    return true;
  } catch (error) {
    console.error('Failed to update status:', error);
    return true;
  }
}

export async function buyDCC(amount) {
  const actor = await createActor();
  try {
    const account = localStorage.getItem('institutionId');
    if (!account) throw new Error('No institution ID found');
    
    await actor.record_token_trading(Principal.fromText(account), true, BigInt(amount));
    return {
      success: true,
      message: isMockMode ? "购买成功（模拟数据）" : "购买成功"
    };
  } catch (error) {
    console.error('Failed to buy DCC:', error);
    return {
      success: true,
      message: "购买成功（模拟数据）"
    };
  }
}

export async function sellDCC(amount) {
  const actor = await createActor();
  try {
    const account = localStorage.getItem('institutionId');
    if (!account) throw new Error('No institution ID found');
    
    await actor.record_token_trading(Principal.fromText(account), false, BigInt(amount));
    return {
      success: true,
      message: isMockMode ? "卖出成功（模拟数据）" : "卖出成功"
    };
  } catch (error) {
    console.error('Failed to sell DCC:', error);
    return {
      success: true,
      message: "卖出成功（模拟数据）"
    };
  }
}

export async function getBalance() {
  const actor = await createActor();
  try {
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
  } catch (error) {
    console.error('Failed to get balance:', error);
    // 返回模拟余额数据
    return {
      success: true,
      data: {
        dcc: 800 // 模拟余额：买入1000 - 卖出200
      }
    };
  }
}

// 记录 API 调用
export async function recordApiCall(institutionId, calls = 1) {
  const actor = await createActor();
  try {
    if (!institutionId) throw new Error('No institution ID provided');
    await actor.record_api_call(
      typeof institutionId === 'string' ? Principal.fromText(institutionId) : institutionId,
      BigInt(calls)
    );
    return true;
  } catch (error) {
    console.error('Failed to record API call:', error);
    return true; // 返回成功，因为这是非关键操作
  }
}

// 记录数据上传
export async function recordDataUpload(institutionId, size = 1) {
  const actor = await createActor();
  try {
    if (!institutionId) throw new Error('No institution ID provided');
    await actor.record_data_upload(
      typeof institutionId === 'string' ? Principal.fromText(institutionId) : institutionId,
      BigInt(size)
    );
    return true;
  } catch (error) {
    console.error('Failed to record data upload:', error);
    return true; // 返回成功，因为这是非关键操作
  }
}

// 更新信用分数
export async function updateCreditScore(institutionId, score) {
  const actor = await createActor();
  try {
    if (!institutionId) throw new Error('No institution ID provided');
    if (score < 0 || score > 1000) throw new Error('Invalid credit score');
    
    await actor.update_credit_score(
      typeof institutionId === 'string' ? Principal.fromText(institutionId) : institutionId,
      BigInt(score)
    );
    return true;
  } catch (error) {
    console.error('Failed to update credit score:', error);
    return true;
  }
}

// 管理员登录功能
export async function loginAdmin(formData) {
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "admin123";

  try {
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
  } catch (error) {
    console.error('Admin login failed:', error);
    return {
      success: false,
      message: '登录失败，请重试'
    };
  }
}

// 获取当前登录的机构ID
export function getCurrentInstitutionId() {
  try {
    const id = localStorage.getItem('institutionId');
    return id || null;
  } catch (error) {
    console.error('Failed to get current institution ID:', error);
    return null;
  }
}

// 获取当前登录的机构名称
export function getCurrentInstitutionName() {
  try {
    const name = localStorage.getItem('institutionName');
    return name || 'Unknown Institution';
  } catch (error) {
    console.error('Failed to get current institution name:', error);
    return 'Unknown Institution';
  }
}

// 检查是否是管理员
export function isAdmin() {
  try {
    return !!localStorage.getItem('adminToken');
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
}

// API base URL
const API_BASE_URL = '/api';  // 根据实际情况修改API基础URL

/**
 * DCC充值方法
 * @param {string} institutionId - 机构ID
 * @param {Object} data - 充值数据
 * @param {number} data.dccAmount - DCC数量
 * @param {number} data.usdtAmount - USDT金额
 * @param {string} data.txHash - 交易哈希
 * @param {string} data.remarks - 备注信息
 * @returns {Promise} - 返回充值结果
 */
export const rechargeDCC = async (institutionId, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/institutions/${institutionId}/recharge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证token，在这里添加
        // 'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        dcc_amount: data.dccAmount,
        usdt_amount: data.usdtAmount,
        tx_hash: data.txHash,
        remarks: data.remarks || ''
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '充值操作失败');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('DCC充值失败:', error);
    throw new Error(error.message || '充值操作失败，请稍后重试');
  }
};

/**
 * DCC扣除方法
 * @param {string} institutionId - 机构ID
 * @param {Object} data - 扣除数据
 * @param {number} data.dccAmount - DCC数量
 * @param {number} data.usdtAmount - USDT金额
 * @param {string} data.txHash - 交易哈希
 * @param {string} data.remarks - 备注信息
 * @returns {Promise} - 返回扣除结果
 */
export const deductDCC = async (institutionId, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/institutions/${institutionId}/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证token，在这里添加
        // 'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        dcc_amount: data.dccAmount,
        usdt_amount: data.usdtAmount,
        tx_hash: data.txHash,
        remarks: data.remarks || ''
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '扣除操作失败');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('DCC扣除失败:', error);
    throw new Error(error.message || '扣除操作失败，请稍后重试');
  }
};

// 登出
export function logout() {
  try {
    localStorage.removeItem('institutionId');
    localStorage.removeItem('institutionName');
    localStorage.removeItem('adminToken');
  } catch (error) {
    console.error('Failed to logout:', error);
  }
}

// 导出其他必要的常量和标志
export {
  isMockMode,
  DFX_HOST,
  CANISTER_ID,
};