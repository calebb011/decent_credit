export const idlFactory = ({ IDL }) => {
  const TokenTrading = IDL.Record({ 'sold' : IDL.Nat64, 'bought' : IDL.Nat64 });
  const CreditScore = IDL.Record({
    'score' : IDL.Nat64,
    'last_update' : IDL.Nat64,
  });
  const Institution = IDL.Record({
    'id' : IDL.Principal,
    'status' : IDL.Variant({ 'Inactive' : IDL.Null, 'Active' : IDL.Null }),
    'data_uploads' : IDL.Nat64,
    'join_time' : IDL.Nat64,
    'token_trading' : TokenTrading,
    'api_calls' : IDL.Nat64,
    'name' : IDL.Text,
    'last_active' : IDL.Nat64,
    'dcc_consumed' : IDL.Nat64,
    'credit_score' : CreditScore,
    'full_name' : IDL.Text,
  });
  const RepaymentContent = IDL.Record({
    'loan_id' : IDL.Text,
    'repayment_date' : IDL.Text,
    'amount' : IDL.Nat64,
  });
  const OverdueContent = IDL.Record({
    'overdueDays' : IDL.Nat64,
    'period_amount' : IDL.Nat64,
    'amount' : IDL.Nat64,
  });
  const LoanContent = IDL.Record({
    'loan_id' : IDL.Text,
    'interest_rate' : IDL.Float64,
    'term_months' : IDL.Nat64,
    'amount' : IDL.Nat64,
  });
  const RecordContent = IDL.Variant({
    'Repayment' : RepaymentContent,
    'Overdue' : OverdueContent,
    'Loan' : LoanContent,
  });
  const RecordSubmissionRequest = IDL.Record({
    'user_did' : IDL.Text,
    'content' : RecordContent,
    'record_type' : IDL.Nat64,
    'event_date' : IDL.Text,
  });
  const RecordStatus = IDL.Variant({
    'Confirmed' : IDL.Null,
    'Rejected' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const RecordSubmissionResponse = IDL.Record({
    'status' : RecordStatus,
    'reward_amount' : IDL.Opt(IDL.Nat64),
    'timestamp' : IDL.Nat64,
    'record_id' : IDL.Text,
  });
  return IDL.Service({
    'get_all_institutions' : IDL.Func([], [IDL.Vec(Institution)], ['query']),
    'get_institution' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(Institution)],
        ['query'],
      ),
    'record_api_call' : IDL.Func([IDL.Principal, IDL.Nat64], [], []),
    'record_data_upload' : IDL.Func([IDL.Principal, IDL.Nat64], [], []),
    'record_token_trading' : IDL.Func(
        [IDL.Principal, IDL.Bool, IDL.Nat64],
        [],
        [],
      ),
    'register_institution' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Principal],
        [],
      ),
    'submit_credit_record' : IDL.Func(
        [RecordSubmissionRequest],
        [IDL.Variant({ 'Ok' : RecordSubmissionResponse, 'Err' : IDL.Text })],
        [],
      ),
    'update_credit_score' : IDL.Func([IDL.Principal, IDL.Nat64], [], []),
    'update_institution_status' : IDL.Func([IDL.Principal, IDL.Bool], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
