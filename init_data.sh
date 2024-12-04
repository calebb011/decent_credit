#!/bin/bash

# 设置 canister ID
CANISTER_ID="decent_credit_backend"

# 注册机构并获取返回的 ID
echo "Registering Bank A..."
BANK_A_ID=$(dfx canister call $CANISTER_ID register_institution '(record {
    name = "Bank A1111";
    full_name = "Bank A International";
    password = opt "default_password"
})' | grep -oP 'principal "\K[^"]+')

echo "Bank A ID: $BANK_A_ID"

echo "Registering Bank B..."
BANK_B_ID=$(dfx canister call $CANISTER_ID register_institution '(record {
    name = "1";
    full_name = "Bank B Global";
    password = opt "1"
})' | grep -oP 'principal "\K[^"]+')

echo "Bank B ID: $BANK_B_ID"

echo "Registering Finance C..."
FINANCE_C_ID=$(dfx canister call $CANISTER_ID register_institution '(record {
    name = "Finance C1111";
    full_name = "Finance C Group";
    password = opt "default_password"
})' | grep -oP 'principal "\K[^"]+')

echo "Finance C ID: $FINANCE_C_ID"

# 为机构充值 DCC - 使用实际返回的机构 ID
echo "Charging DCC for institutions..."
dfx canister call $CANISTER_ID recharge_dcc "(
    principal \"$BANK_A_ID\",
    record {
        dcc_amount = 1000;
        usdt_amount = 1000.0;
        tx_hash = \"TX_1\";
        remarks = \"Initial DCC charge\";
        created_at = 1701388800000000000;
    }
)"

dfx canister call $CANISTER_ID recharge_dcc "(
    principal \"$BANK_B_ID\",
    record {
        dcc_amount = 1000;
        usdt_amount = 1000.0;
        tx_hash = \"TX_2\";
        remarks = \"Initial DCC charge\";
        created_at = 1701388800000000000;
    }
)"

dfx canister call $CANISTER_ID recharge_dcc "(
    principal \"$FINANCE_C_ID\",
    record {
        dcc_amount = 1000;
        usdt_amount = 1000.0;
        tx_hash = \"TX_3\";
        remarks = \"Initial DCC charge\";
        created_at = 1701388800000000000;
    }
)"


# 设置信用分数
echo "Setting credit scores..."
dfx canister call $CANISTER_ID update_credit_score "(principal \"$BANK_A_ID\", 100)"
dfx canister call $CANISTER_ID update_credit_score "(principal \"$BANK_B_ID\", 100)"
dfx canister call $CANISTER_ID update_credit_score "(principal \"$FINANCE_C_ID\", 100)"




# 用户 DID 列表 - 模拟5个不同信用场景的用户
USER_1_DID="did:icp:user1_excellent_credit" # 优质信用用户
USER_2_DID="did:icp:user2_good_payment"     # 正常还款用户
USER_3_DID="did:icp:user3_mixed_history"    # 混合记录用户
USER_4_DID="did:icp:user4_late_payment"     # 有逾期用户
USER_5_DID="did:icp:user5_multiple_loans"   # 多贷款用户

# === 用户1：优质信用记录 ===
echo "Creating records for User 1 (Excellent Credit)..."

# 大额房贷
dfx canister call $CANISTER_ID submit_record '(
  record {
    institution_id = principal "'$BANK_A_ID'";
    record_type = variant { LoanRecord };
    user_did = "'$USER_1_DID'";
    event_date = "2023-01-15";
    content = variant { 
      Loan = record {
        amount = 2_000_000;
        loan_id = "MORTGAGE_2023_001";
        term_months = 360;
        interest_rate = 3.5;
      }
    }
  }
)'

# 按时还款记录 (连续6个月)
for MONTH in $(seq 1 6); do
  PAYMENT_DATE="2023-0$((MONTH+1))-15"
  dfx canister call $CANISTER_ID submit_record '(
    record {
      institution_id = principal "'$BANK_A_ID'";
      record_type = variant { RepaymentRecord };
      user_did = "'$USER_1_DID'";
      event_date = "'$PAYMENT_DATE'";
      content = variant { 
        Repayment = record {
          amount = 9_000;
          loan_id = "MORTGAGE_2023_001";
          repayment_date = "'$PAYMENT_DATE'";
        }
      }
    }
  )'
done

# === 用户2：正常还款记录 ===
echo "Creating records for User 2 (Good Payment)..."

# 消费贷款
dfx canister call $CANISTER_ID submit_record '(
  record {
    institution_id = principal "'$BANK_B_ID'";
    record_type = variant { LoanRecord };
    user_did = "'$USER_2_DID'";
    event_date = "2023-12-01";
    content = variant { 
      Loan = record {
        amount = 100_000;
        loan_id = "PERSONAL_2023_001";
        term_months = 24;
        interest_rate = 6.5;
      }
    }
  }
)'

# 正常还款记录 (3个月)
for MONTH in $(seq 12 14); do
  PAYMENT_DATE="2023-$MONTH-01"
  dfx canister call $CANISTER_ID submit_record '(
    record {
      institution_id = principal "'$BANK_B_ID'";
      record_type = variant { RepaymentRecord };
      user_did = "'$USER_2_DID'";
      event_date = "'$PAYMENT_DATE'";
      content = variant { 
        Repayment = record {
          amount = 4_500;
          loan_id = "PERSONAL_2023_001";
          repayment_date = "'$PAYMENT_DATE'";
        }
      }
    }
  )'
done

# === 用户3：混合信用记录 ===
echo "Creating records for User 3 (Mixed History)..."

# 多个小额贷款
for LOAN_NUM in $(seq 1 3); do
  dfx canister call $CANISTER_ID submit_record '(
    record {
      institution_id = principal "'$FINANCE_C_ID'";
      record_type = variant { LoanRecord };
      user_did = "'$USER_3_DID'";
      event_date = "2024-0'$LOAN_NUM'-01";
      content = variant { 
        Loan = record {
          amount = 30_000;
          loan_id = "SMALL_2024_00'$LOAN_NUM'";
          term_months = 12;
          interest_rate = 7.5;
        }
      }
    }
  )'
done

# 通知记录
dfx canister call $CANISTER_ID submit_record '(
  record {
    institution_id = principal "'$FINANCE_C_ID'";
    record_type = variant { NotificationRecord };
    user_did = "'$USER_3_DID'";
    event_date = "2024-02-15";
    content = variant { 
      Notification = record {
        amount = 2_500;
        days = 7;
        period_amount = 2_600;
      }
    }
  }
)'

# === 用户4：逾期记录 ===
echo "Creating records for User 4 (Late Payment)..."

# 车贷
dfx canister call $CANISTER_ID submit_record '(
  record {
    institution_id = principal "'$BANK_A_ID'";
    record_type = variant { LoanRecord };
    user_did = "'$USER_4_DID'";
    event_date = "2023-10-01";
    content = variant { 
      Loan = record {
        amount = 300_000;
        loan_id = "AUTO_2023_001";
        term_months = 48;
        interest_rate = 5.8;
      }
    }
  }
)'

# 逾期通知
dfx canister call $CANISTER_ID submit_record '(
  record {
    institution_id = principal "'$BANK_A_ID'";
    record_type = variant { NotificationRecord };
    user_did = "'$USER_4_DID'";
    event_date = "2024-01-15";
    content = variant { 
      Notification = record {
        amount = 6_500;
        days = 15;
        period_amount = 7_000;
      }
    }
  }
)'

# 补缴记录
dfx canister call $CANISTER_ID submit_record '(
  record {
    institution_id = principal "'$BANK_A_ID'";
    record_type = variant { RepaymentRecord };
    user_did = "'$USER_4_DID'";
    event_date = "2024-01-30";
    content = variant { 
      Repayment = record {
        amount = 7_000;
        loan_id = "AUTO_2023_001";
        repayment_date = "2024-01-30";
      }
    }
  }
)'

# === 用户5：多贷款记录 ===
echo "Creating records for User 5 (Multiple Loans)..."

# 多种类型贷款
LOAN_TYPES=(
  "BUSINESS_2024_001:500000:24:8.5"
  "PERSONAL_2024_001:100000:12:7.2"
  "MORTGAGE_2024_001:1500000:240:4.2"
)

for LOAN in "${LOAN_TYPES[@]}"; do
  IFS=':' read -r ID AMOUNT TERM RATE <<< "$LOAN"
  dfx canister call $CANISTER_ID submit_record '(
    record {
      institution_id = principal "'$BANK_B_ID'";
      record_type = variant { LoanRecord };
      user_did = "'$USER_5_DID'";
      event_date = "2024-01-01";
      content = variant { 
        Loan = record {
          amount = '$AMOUNT';
          loan_id = "'$ID'";
          term_months = '$TERM';
          interest_rate = '$RATE';
        }
      }
    }
  )'
done

# 正常还款记录
for LOAN_ID in "BUSINESS_2024_001" "PERSONAL_2024_001" "MORTGAGE_2024_001"; do
  for MONTH in {1..2}; do
    PAYMENT_DATE="2024-0$((MONTH+1))-01"
    dfx canister call $CANISTER_ID submit_record '(
      record {
        institution_id = principal "'$BANK_B_ID'";
        record_type = variant { RepaymentRecord };
        user_did = "'$USER_5_DID'";
        event_date = "'$PAYMENT_DATE'";
        content = variant { 
          Repayment = record {
            amount = 15000;
            loan_id = "'$LOAN_ID'";
            repayment_date = "'$PAYMENT_DATE'";
          }
        }
      }
    )'
  done
done

# === 验证所有用户的记录 ===
echo "Verifying records for all users..."
for USER_DID in "$USER_1_DID" "$USER_2_DID" "$USER_3_DID" "$USER_4_DID" "$USER_5_DID"; do
  echo "Records for $USER_DID:"
  dfx canister call $CANISTER_ID query_records_by_user_did "(\"$USER_DID\")"
done