import { Actor,HttpAgent } from "@dfinity/agent";


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
let _actor = null;// 创建 Actor 实例
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
  
    // IDL definitions for credit records
    const CreditDeductionRecord = IDL.Record({
      'id': IDL.Text,
      'record_id': IDL.Text,
      'institution_id': IDL.Principal,
      'institution_name': IDL.Text,
      'deduction_points': IDL.Nat32,
      'reason': IDL.Text,
      'data_quality_issue': IDL.Text,
      'created_at': IDL.Nat64,
      'operator_id': IDL.Principal,
      'operator_name': IDL.Text
    });
  
    const CreateCreditRecordRequest = IDL.Record({
      'institution_id': IDL.Principal,
      'deduction_points': IDL.Nat32,
      'reason': IDL.Text,
      'data_quality_issue': IDL.Text
    });
  
    const CreditRecord = IDL.Record({
      'id': IDL.Text,
      'user_did': IDL.Text,
      'amount': IDL.Nat64,
      'record_type': IDL.Text,
      'created_at': IDL.Nat64,
      'details': IDL.Text
    });
  
    const InstitutionRecordResponse = IDL.Record({
      'institution_id': IDL.Principal,
      'institution_name': IDL.Text,
      'user_did': IDL.Text,
      'records': IDL.Vec(CreditRecord)
    });
  
    const RiskAssessment = IDL.Record({
      'credit_score': IDL.Nat64,
      'risk_level': IDL.Text,
      'assessment_details': IDL.Vec(IDL.Text),
      'suggestions': IDL.Vec(IDL.Text)
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
    ), 
    
    'create_credit_record': IDL.Func(
    [CreateCreditRecordRequest],
    [IDL.Variant({ 'Ok': CreditDeductionRecord, 'Err': IDL.Text })],
    ['update']
  ),
  
    'get_credit_records': IDL.Func(
      [IDL.Opt(IDL.Principal)],
      [IDL.Vec(CreditDeductionRecord)],
      ['query']
    ),
  
    'query_institution_records': IDL.Func(
      [IDL.Principal, IDL.Text],
      [IDL.Variant({ 'Ok': InstitutionRecordResponse, 'Err': IDL.Text })],
      ['query']
    ),
  
    'deduct_query_token': IDL.Func(
      [IDL.Principal],
      [IDL.Variant({ 'Ok': IDL.Bool, 'Err': IDL.Text })],
      ['update']
    ),
  
    'get_risk_assessment': IDL.Func(
      [IDL.Text],
      [IDL.Variant({ 'Ok': RiskAssessment, 'Err': IDL.Text })],
      ['query']
    ),
      });
    }, {
      agent,
      canisterId: CANISTER_ID
    });
  
    return _actor;
  }
  