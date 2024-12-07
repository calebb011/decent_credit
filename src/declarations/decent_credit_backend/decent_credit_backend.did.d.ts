import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CreditScore { 'score' : bigint, 'last_update' : bigint }
export interface Institution {
  'id' : Principal,
  'status' : { 'Inactive' : null } |
    { 'Active' : null },
  'data_uploads' : bigint,
  'join_time' : bigint,
  'token_trading' : TokenTrading,
  'api_calls' : bigint,
  'name' : string,
  'last_active' : bigint,
  'dcc_consumed' : bigint,
  'credit_score' : CreditScore,
  'full_name' : string,
}
export interface LoanContent {
  'loan_id' : string,
  'interest_rate' : number,
  'term_months' : bigint,
  'amount' : bigint,
}
export interface NotificationContent {
  'days' : bigint,
  'period_amount' : bigint,
  'amount' : bigint,
}
export type RecordContent = { 'Repayment' : RepaymentContent } |
  { 'Notification' : NotificationContent } |
  { 'Loan' : LoanContent };
export type RecordStatus = { 'Confirmed' : null } |
  { 'Rejected' : null } |
  { 'Pending' : null };
export interface RecordSubmissionRequest {
  'user_did' : string,
  'content' : RecordContent,
  'record_type' : bigint,
  'event_date' : string,
}
export interface RecordSubmissionResponse {
  'status' : RecordStatus,
  'reward_amount' : [] | [bigint],
  'timestamp' : bigint,
  'record_id' : string,
}
export type RecordType = { 'LoanRecord' : null } |
  { 'RepaymentRecord' : null } |
  { 'NotificationRecord' : null };
export interface RepaymentContent {
  'loan_id' : string,
  'repayment_date' : string,
  'amount' : bigint,
}
export interface TokenTrading { 'sold' : bigint, 'bought' : bigint }
export interface _SERVICE {
  'get_all_institutions' : ActorMethod<[], Array<Institution>>,
  'get_institution' : ActorMethod<[Principal], [] | [Institution]>,
  'record_api_call' : ActorMethod<[Principal, bigint], undefined>,
  'record_data_upload' : ActorMethod<[Principal, bigint], undefined>,
  'record_token_trading' : ActorMethod<[Principal, boolean, bigint], undefined>,
  'register_institution' : ActorMethod<[string, string], Principal>,
  'submit_credit_record' : ActorMethod<
    [RecordSubmissionRequest],
    { 'Ok' : RecordSubmissionResponse } |
      { 'Err' : string }
  >,
  'update_credit_score' : ActorMethod<[Principal, bigint], undefined>,
  'update_institution_status' : ActorMethod<[Principal, boolean], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
