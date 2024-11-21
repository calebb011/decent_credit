// icpService.js
import { Actor, HttpAgent } from "@dfinity/agent";

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

// 创建 Actor 实例
export async function createActor() {
  if (_actor) return _actor;

  try {
    if (process.env.NODE_ENV !== "production") {
      await agent.fetchRootKey();
    }

    _actor = Actor.createActor(({ IDL }) => {
      // 登录请求和响应类型
      const LoginRequest = IDL.Record({
        'name': IDL.Text,
        'password': IDL.Text,
      });

      const LoginResponse = IDL.Record({
        'success': IDL.Bool,
        'institution_id': IDL.Opt(IDL.Principal),
        'message': IDL.Text,
      });

      // 注册请求类型
      const RegisterRequest = IDL.Record({
        'name': IDL.Text,
        'full_name': IDL.Text,
        'password': IDL.Opt(IDL.Text),
      });

      const Institution = IDL.Record({
        'id': IDL.Principal,
        'name': IDL.Text,
        'full_name': IDL.Text,
        'password_hash': IDL.Text, // 新增密码哈希字段
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
    console.error('Error creating actor:', error);
    throw error;
  }
}

// 机构管理功能
export async function registerInstitution(formData) {
  const actor = await createActor();
  try {
    const request = {
      name: 'formData.name',
      full_name:' formData.full_name',
      password: formData.password ? [formData.password] : [] // Convert to opt
    };
    console.log('Constructed request:', request);

    const result = await actor.register_institution(request);
    console.log('Constructed request:', request);

    return {
      success: true,
      institution_id: result,
      message: '注册成功'
    };
  } catch (error) {
    console.error('Registration failed:', error);
    return {
      success: false,
      message: error.message || '注册失败'
    };
  }
}

// 登录功能
export async function loginInstitution(formData) {
  const actor = await createActor();
  try {
    const request = {
      name: formData.name,
      password: formData.password
    };
    const response = await actor.login(request);
    if (response.success) {
      // 登录成功，保存机构信息
      localStorage.setItem('institutionId', response.institution_id[0].toText());
      localStorage.setItem('institutionName', formData.name);
    }
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return {
      success: false,
      message: error.message || '登录失败'
    };
  }
}

// 修改密码
export async function changePassword(oldPassword, newPassword) {
  const actor = await createActor();
  try {
    const result = await actor.change_password(oldPassword, newPassword);
    return result;
  } catch (error) {
    console.error('Change password failed:', error);
    return { Err: error.message || '修改密码失败' };
  }
}

// 重置密码
export async function resetPassword(institutionId) {
  const actor = await createActor();
  try {
    const result = await actor.reset_password(institutionId);
    return result;
  } catch (error) {
    console.error('Reset password failed:', error);
    return { Err: error.message || '重置密码失败' };
  }
}

export async function getAllInstitutions() {
  const actor = await createActor();
  const institutions = await actor.get_all_institutions();
  return institutions.map(formatInstitution).filter(Boolean);
}

export async function getInstitution(id) {
  const actor = await createActor();
  const institution = await actor.get_institution(id);
  return institution.map(formatInstitution)[0];
}

export async function updateInstitutionStatus(id, isActive) {
  const actor = await createActor();
  return actor.update_institution_status(id, isActive);
}


// Token related functions
export async function buyDCC(amount) {
  const actor = await createActor();
  try {
    await actor.record_token_trading(Principal.fromText(account), true, amount);
    return {
      success: true,
      message: "购买成功"
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

export async function sellDCC(amount) {
  const actor = await createActor();
  try {
    await actor.record_token_trading(Principal.fromText(account), false, amount);
    return {
      success: true,
      message: "卖出成功"
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

export async function getBalance() {
  const actor = await createActor();
  try {
    const institution = await getInstitution(account);
    return {
      success: true,
      data: {
        dcc: institution.token_trading.bought - institution.token_trading.sold
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// 管理员登录功能
export async function loginAdmin(formData) {
  // 这里暂时使用硬编码的管理员账号密码
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "admin123";

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
const nsToMs = (ns) => {
  if (!ns) return 0;
  return Math.floor(Number(ns.toString()) / 1_000_000);
};

function formatInstitution(raw) {
  if (!raw) return null;

  try {
    return {
      id: raw.id ? raw.id.toText() : '',
      name: raw.name || '',
      full_name: raw.full_name || '',
      status: raw.status?.Active ? 'active' : 'inactive',
      join_time: raw.join_time ? new Date(nsToMs(raw.join_time)).toISOString() : null,
      last_active: raw.last_active ? new Date(nsToMs(raw.last_active)).toISOString() : null,
      api_calls: Number(raw.api_calls || 0),
      dcc_consumed: Number(raw.dcc_consumed || 0),
      data_uploads: Number(raw.data_uploads || 0),
      credit_score: raw.credit_score ? {
        score: Number(raw.credit_score.score || 0),
        last_update: raw.credit_score.last_update ? nsToMs(raw.credit_score.last_update) : 0
      } : {
        score: 0,
        last_update: 0
      },
      token_trading: raw.token_trading ? {
        bought: Number(raw.token_trading.bought || 0),
        sold: Number(raw.token_trading.sold || 0)
      } : {
        bought: 0,
        sold: 0
      }
    };
  } catch (error) {
    console.error('Error formatting institution:', error, raw);
    return null;
  }
}

// export {
//   createActor,
//   DFX_HOST,
//   CANISTER_ID,
// };