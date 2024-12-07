
import { Principal } from '@dfinity/principal';
import { HttpAgent, Actor } from "@dfinity/agent";
import { authClientService } from './authClient';

const DFX_HOST = "http://127.0.0.1:8000";
const CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟刷新一次

// 缓存变量声明
let _actor = null;
let _lastIdentityPrincipal = null;
let _lastRefreshTime = 0;

 // 定义 IDL 工厂函数
 const idlFactory = ({ IDL }) => {
  // === 基础类型定义 ===
  const LoginRequest = IDL.Record({
    'name': IDL.Text,
    'password': IDL.Text,
  });

  const LoginResponse = IDL.Record({
    'success': IDL.Bool,
    'institution_id': IDL.Opt(IDL.Principal),
    'full_name': IDL.Text,
    'message': IDL.Text,
  });

  const RegisterRequest = IDL.Record({
    'name': IDL.Text,
    'full_name': IDL.Text,
    'password': IDL.Opt(IDL.Text),
    'principal': IDL.Text
  });

  // === 记录类型定义（最基础的枚举和内容类型）===
  const RecordType = IDL.Variant({
    'LoanRecord': IDL.Null,
    'RepaymentRecord': IDL.Null,
    'NotificationRecord': IDL.Null
  });

  const RecordStatus = IDL.Variant({
    'Pending': IDL.Null,
    'Confirmed': IDL.Null,
    'Rejected': IDL.Null
  });

  const LoanContent = IDL.Record({
    'amount': IDL.Nat64,
    'loan_id': IDL.Text,
    'interest_rate': IDL.Float64
  });

  const RepaymentContent = IDL.Record({
    'amount': IDL.Nat64,
    'loan_id': IDL.Text,
    'repayment_date': IDL.Text
  });

  const NotificationContent = IDL.Record({
    'amount': IDL.Nat64,
    'days': IDL.Nat64,
    'period_amount': IDL.Nat64
  });

  const RecordContent = IDL.Variant({
    'Loan': LoanContent,
    'Repayment': RepaymentContent,
    'Notification': NotificationContent
  });

  // === 核心记录类型（其他类型的基础）===
  const CreditRecord = IDL.Record({
    'id': IDL.Text,
    'institution_id': IDL.Principal,
    'institution_name': IDL.Text,
    'institution_full_name': IDL.Text,
    'record_type': RecordType,
    'user_did': IDL.Text,
    'event_date': IDL.Text,
    'content': RecordContent,
    'encrypted_content': IDL.Vec(IDL.Nat8),
    'proof': IDL.Vec(IDL.Nat8),
    'canister_id': IDL.Text,
    'timestamp': IDL.Nat64,
    'status': RecordStatus,
    'reward_amount': IDL.Opt(IDL.Nat64)
  });
  // === 新增服务设置相关类型定义 ===
  const UpdateServiceSettingsRequest = IDL.Record({
    'data_service_enabled': IDL.Bool,
    'query_price': IDL.Nat64,
    'reward_share_ratio': IDL.Nat8
  });

  const ServiceSettings = IDL.Record({
    'data_service_enabled': IDL.Bool,
    'query_price': IDL.Nat64,
    'reward_share_ratio': IDL.Nat8
  });

  const ServiceSettingsResponse = IDL.Record({
    'success': IDL.Bool,
    'data': IDL.Opt(ServiceSettings),
    'message': IDL.Opt(IDL.Text)
  });
  // === 机构记录 ===
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
    }),
    // 新增字段
    'data_service_enabled': IDL.Bool,
    'query_price': IDL.Nat64,
    'reward_share_ratio': IDL.Nat8
    
  });

  // === 查询相关结构 ===
  const GetRecordsResponse = IDL.Record({
    'status': IDL.Text,
    'records': IDL.Vec(CreditRecord)
  });

  const RecordQueryParams = IDL.Record({
    'institution_id': IDL.Opt(IDL.Principal),
    'user_did': IDL.Opt(IDL.Text),
    'record_type': IDL.Opt(RecordType),
    'start_date': IDL.Opt(IDL.Text),
    'end_date': IDL.Opt(IDL.Text),
    'status': IDL.Opt(RecordStatus)
  });

  // === 交易相关 ===
  const DCCTransactionRequest = IDL.Record({
    'dcc_amount': IDL.Nat64,
    'usdt_amount': IDL.Float64,
    'tx_hash': IDL.Text,
    'remarks': IDL.Text,
    'created_at': IDL.Nat64
  });

  const BalanceResponse = IDL.Record({
    'dcc': IDL.Nat64,
    'usdt_value': IDL.Float64
  });

  // === 提交相关结构 ===
  const RecordSubmissionRequest = IDL.Record({
    'institution_id': IDL.Principal,
    'record_type': RecordType,
    'user_did': IDL.Text,
    'event_date': IDL.Text,
    'content': RecordContent
  });

  const RecordSubmissionResponse = IDL.Record({
    'record_id': IDL.Text,
    'status': RecordStatus,
    'timestamp': IDL.Nat64,
    'reward_amount': IDL.Opt(IDL.Nat64)
  });

  // === 批量提交 ===
  const BatchSubmissionRequest = IDL.Record({
    'records': IDL.Vec(RecordSubmissionRequest)
  });

  const BatchSubmissionResponse = IDL.Record({
    'submitted': IDL.Nat64,
    'failed': IDL.Nat64,
    'record_ids': IDL.Vec(IDL.Text),
    'timestamp': IDL.Nat64,
    'status': RecordStatus
  });

  // === 原始数据结构 ===
  const RecordData = IDL.Record({
    'amount': IDL.Nat64,
    'user_id': IDL.Vec(IDL.Nat8),
    'record_type': IDL.Nat8,
    'timestamp': IDL.Nat64,
    'interest_rate': IDL.Opt(IDL.Float64),
    'loan_id': IDL.Opt(IDL.Text),
    'days': IDL.Opt(IDL.Nat64),
    'period_amount': IDL.Opt(IDL.Nat64)
  });

  // === 统计相关结构 ===
  const RecordStatistics = IDL.Record({
    'total_records': IDL.Nat64,
    'pending_records': IDL.Nat64,
    'confirmed_records': IDL.Nat64,
    'rejected_records': IDL.Nat64,
    'total_rewards': IDL.Nat64
  });

  // === 信用记录 ===
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

  // === 风险评估相关 ===
  const RiskAssessment = IDL.Record({
    'credit_score': IDL.Nat32,
    'risk_level': IDL.Text,
    'assessment_details': IDL.Vec(IDL.Text),
    'suggestions': IDL.Vec(IDL.Text)
  });

  const RiskAssessmentReport = IDL.Record({
    'report_id': IDL.Text,
    'user_did': IDL.Text,
    'institution_id': IDL.Principal,
    'assessment': RiskAssessment,
    'created_at': IDL.Nat64
  });

  // === 响应类型 ===
  const InstitutionRecordResponse = IDL.Record({
    'institution_id': IDL.Principal,
    'institution_name': IDL.Text,
    'user_did': IDL.Text,
    'records': IDL.Vec(CreditRecord)
  });

  const AssessmentListResponse = IDL.Record({
    'status': IDL.Text,
    'message': IDL.Opt(IDL.Text),
    'data': IDL.Vec(RiskAssessmentReport)
  });

  // === 上传历史相关类型定义 ===
  const ReviewResult = IDL.Record({
    'passed': IDL.Bool,
    'reason': IDL.Opt(IDL.Text)
  });

  const RecordHistoryParams = IDL.Record({
    'status': IDL.Opt(IDL.Text),
    'start_date': IDL.Opt(IDL.Text),
    'end_date': IDL.Opt(IDL.Text)
  });

  const UploadRecord = IDL.Record({
    'id': IDL.Text,
    'user_did': IDL.Text,
    'institution_id': IDL.Principal,
    'status': IDL.Text,
    'submitted_at': IDL.Text,
    'review_result': ReviewResult
  });

  const RecordHistoryResponse = IDL.Record({
    'data': IDL.Vec(UploadRecord),
    'total': IDL.Nat64
  });

  // 首先添加仪表板相关的类型定义
const DataDistribution = IDL.Record({
  'loan_records': IDL.Nat64,
  'repayment_records': IDL.Nat64,
  'notification_records': IDL.Nat64
});

const BasicInfo = IDL.Record({
  'name': IDL.Text,
  'id': IDL.Text,
  'status': IDL.Variant({ 'Active': IDL.Null, 'Inactive': IDL.Null }),
  'join_time': IDL.Nat64,
  'credit_level': IDL.Text,
  'credit_score': IDL.Nat64
});

const SubmissionStats = IDL.Record({
  'today_submissions': IDL.Nat64,
  'total_submissions': IDL.Nat64,
  'submission_distribution': DataDistribution
});

const ApiQuota = IDL.Record({
  'used': IDL.Nat64,
  'total': IDL.Nat64
});

const InstitutionUsageStats = IDL.Record({
  'query_others': IDL.Nat64,
  'queried_by_others': IDL.Nat64,
  'today_query_others': IDL.Nat64,
  'today_queried_by_others': IDL.Nat64,
  'total_queries': IDL.Nat64,
  'api_quota': ApiQuota
});

const TokenInfo = IDL.Record({
  'balance': IDL.Nat64,
  'total_spent': IDL.Nat64,
  'today_spent': IDL.Nat64,
  'total_reward': IDL.Nat64,
  'today_reward': IDL.Nat64,
});



const CreditInfo = IDL.Record({
  'credit_score': IDL.Nat64,
  'credit_level': IDL.Text,
  'data_quality_score': IDL.Nat64
});

const SystemStatus = IDL.Record({
  'api_health': IDL.Bool,
  'has_announcement': IDL.Bool,
  'last_update_time': IDL.Nat64,
  'system_version': IDL.Text
});

  const InstitutionDashboardData = IDL.Record({
    'basic_info': BasicInfo,
    'submission_stats': SubmissionStats,
    'usage_stats': InstitutionUsageStats,
    'token_info': TokenInfo,
    'credit_info': CreditInfo,
    'system_status': SystemStatus
  });
  const DataStats = IDL.Record({
    'total_records': IDL.Nat64,
    'today_records': IDL.Nat64,
    'data_distribution': DataDistribution
  });
  const InstitutionStats = IDL.Record({
  'total_count': IDL.Nat64,
  'active_count': IDL.Nat64,
  'today_new_count': IDL.Nat64,
});

const ApiStats = IDL.Record({
  'total_calls': IDL.Nat64,
  'today_calls': IDL.Nat64,
  'success_rate': IDL.Float64,
  'query_stats': IDL.Record({
    'total_queries': IDL.Nat64,
    'today_queries': IDL.Nat64,
    'outbound_queries': IDL.Nat64,
    'inbound_queries': IDL.Nat64
  })
});

const TokenStats = IDL.Record({
  'total_rewards': IDL.Nat64,
  'total_consumption': IDL.Nat64,
  'today_rewards': IDL.Nat64,
  'today_consumption': IDL.Nat64,
  'total_circulation': IDL.Nat64,
  'average_daily_consumption': IDL.Float64
});

const LevelDistribution = IDL.Record({
  'aaa_count': IDL.Nat64,
  'aa_count': IDL.Nat64,
  'a_count': IDL.Nat64,
  'bbb_count': IDL.Nat64,
  'bb_count': IDL.Nat64,
  'other_count': IDL.Nat64
});

const ScoreTrend = IDL.Record({
  'date': IDL.Text,
  'score': IDL.Float64
});

const CreditStats = IDL.Record({
  'average_score': IDL.Float64,
  'level_distribution': LevelDistribution,
});

// 最终的 AdminDashboardData 类型
const AdminDashboardData = IDL.Record({
  'institution_stats': InstitutionStats,
  'data_stats': DataStats,
  'api_stats': ApiStats,
  'token_stats': TokenStats,
  'credit_stats': CreditStats,
  'system_status': SystemStatus
});
  return IDL.Service({
    
  // 在 IDL.Service 中添加这些方法
  'get_upload_history': IDL.Func(
    [IDL.Principal, RecordHistoryParams],
    [IDL.Variant({ 'Ok': RecordHistoryResponse, 'Err': IDL.Text })],
    ['query']
  ),

  'retry_record': IDL.Func(
    [IDL.Principal, IDL.Text],
    [IDL.Variant({ 'Ok': UploadRecord, 'Err': IDL.Text })],
    ['update']
  ),
    'institution_login': IDL.Func([LoginRequest], [LoginResponse], ['update']),
    'register_institution': IDL.Func([RegisterRequest], [IDL.Variant({ 'Ok': IDL.Principal, 'Err': IDL.Text })], ['update']),
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
    'recharge_dcc': IDL.Func([IDL.Principal, DCCTransactionRequest], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], ['update']),
    'deduct_dcc': IDL.Func([IDL.Principal, DCCTransactionRequest], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], ['update']),
    'submit_record': IDL.Func([RecordSubmissionRequest], [IDL.Variant({ 'Ok': RecordSubmissionResponse, 'Err': IDL.Text })], ['update']),
    'submit_records_batch': IDL.Func([BatchSubmissionRequest], [IDL.Variant({ 
      'Ok': IDL.Record({
        'submitted': IDL.Nat64,
        'failed': IDL.Nat64,
        'records': IDL.Vec(RecordSubmissionResponse)
      }),
      'Err': IDL.Text 
    })], ['update']),
    'create_credit_record': IDL.Func([CreateCreditRecordRequest], [IDL.Variant({ 'Ok': CreditDeductionRecord, 'Err': IDL.Text })], ['update']),
    'get_credit_records': IDL.Func([IDL.Opt(IDL.Principal)], [IDL.Vec(CreditDeductionRecord)], ['query']),
    'query_institution_records_list': IDL.Func([IDL.Principal, IDL.Text], [IDL.Variant({ 'Ok': InstitutionRecordResponse, 'Err': IDL.Text })], ['update']),
    'deduct_query_token': IDL.Func([IDL.Principal], [IDL.Variant({ 'Ok': IDL.Bool, 'Err': IDL.Text })], ['update']),
    'get_risk_assessment': IDL.Func([IDL.Principal, IDL.Text], [IDL.Variant({ 'Ok': RiskAssessment, 'Err': IDL.Text })], ['query']),
    'query_assessment_reports': IDL.Func([IDL.Principal, IDL.Opt(IDL.Nat64)], [AssessmentListResponse], ['query']),
    'query_institution_records_failed_list': IDL.Func(
      [IDL.Principal],
      [IDL.Variant({
        'Ok': InstitutionRecordResponse,
        'Err': IDL.Text
      })],
      ['query']
    ),
  
    'query_institution_records_list': IDL.Func(
      [IDL.Principal, IDL.Text],
      [IDL.Variant({
        'Ok': InstitutionRecordResponse,
        'Err': IDL.Text
      })],
      ['update']
    ),
  
    'query_records': IDL.Func(
      [RecordQueryParams],
      [IDL.Vec(CreditRecord)],
      ['query']
    ),
    
    'query_records_by_user_did': IDL.Func(
    [IDL.Principal, IDL.Text],  // [机构ID, 用户DID]
    [IDL.Variant({             // 返回 Result
      'Ok': IDL.Vec(CreditRecord),
      'Err': IDL.Text
    })],
    ['query']
  ),
  
    'get_record_statistics': IDL.Func(
      [IDL.Opt(IDL.Principal)],
      [IDL.Variant({
        'Ok': RecordStatistics,
        'Err': IDL.Text
      })],
      ['query']
    ),
  
    'deduct_query_token': IDL.Func(
      [IDL.Principal, IDL.Text],
      [IDL.Variant({
        'Ok': IDL.Bool,
        'Err': IDL.Text
      })],
      ['update']
    ),
     // 新增服务设置相关方法
     'get_institution_settings': IDL.Func(
      [],
      [ServiceSettingsResponse],
      ['query']
    ),

  'get_admin_dashboard_data': IDL.Func(
    [], // 无参数
    [AdminDashboardData], // 返回管理员仪表板数据
    ['query'] // 查询方法
  ),

  'get_institution_dashboard_data': IDL.Func(
    [IDL.Principal], // 参数：机构 ID
    [IDL.Variant({
      'Ok': InstitutionDashboardData,
      'Err': IDL.Text
    })], // 返回机构仪表板数据或错误
    ['query'] // 查询方法
  ),
    'update_service_settings': IDL.Func(
      [UpdateServiceSettingsRequest],
      [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })],
      ['update']
    ),  'query_record_by_id': IDL.Func(
      [
        IDL.Text,  // record_id
        IDL.Principal  // institution_id 可选参数
      ],
      [IDL.Variant({
        'Ok': CreditRecord,
        'Err': IDL.Text
      })],
      ['query']  // 标记为查询方法
    ),
  });
};
export async function getActor() {
  try {
    const identity = await authClientService.getIdentity();
    if (!identity) {
      throw new Error("No identity found");
    }

    const currentPrincipal = identity.getPrincipal().toString();
    const currentTime = Date.now();

    const needsRefresh = !_actor || 
                        currentPrincipal !== _lastIdentityPrincipal ||
                        (currentTime - _lastRefreshTime) > REFRESH_INTERVAL;

    if (needsRefresh) {
      // 使用 authClientService 的 agent
      const agent = authClientService.getAgent();

      // Actor 配置并创建
      _actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CANISTER_ID
      });
      
      _lastIdentityPrincipal = currentPrincipal;
      _lastRefreshTime = currentTime;
      
      console.log('Created new actor with identity:', currentPrincipal);
    }

    return _actor;
  } catch (error) {
    console.error("Failed to get actor:", error);
    _actor = null;
    _lastIdentityPrincipal = null;
    throw error;
  }
}