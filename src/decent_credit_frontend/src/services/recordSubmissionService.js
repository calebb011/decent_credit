// creditRecordService.js
import { createActor } from './IDL';
import { Principal } from '@dfinity/principal';


/**
 * 获取记录类型的变体格式
 */
function getRecordType(type) {
  const recordType = type.toLowerCase();
  switch(recordType) {
    case 'loan':
      return { 'LoanRecord': null };  // 修改为对应后端的 RecordType 枚举
    case 'repayment':
      return { 'RepaymentRecord': null };
    case 'notification':
      return { 'NotificationRecord': null };
    default:
      throw new Error(`Invalid record type: ${type}`);
  }
}
/**
 * 获取记录类型的数字表示
 */
function getRecordTypeNumber(type) {
  const recordType = type.toLowerCase();
  switch(recordType) {
    case 'loan':
      return 1;
    case 'repayment':
      return 2;
    case 'overdue':
      return 3;
    default:
      return 0;
  }
}

/**
 * 获取状态字符串
 */
function getStatusString(status) {
  if ('Pending' in status) return 'pending';
  if ('Confirmed' in status) return 'confirmed';
  if ('Failed' in status) return 'failed';
  return 'unknown';
}


/**
 * 格式化请求内容
 */

function formatRecordRequest(formValues) {
  const recordType = formValues.recordType.toLowerCase();
  let request = {
    institution_id: Principal.fromText(localStorage.getItem('institutionId')),
    record_type: getRecordType(recordType),
    user_did: formValues.userDid,
    event_date: formValues.eventDate.format('YYYY-MM-DD'),
    content: null
  };

  // 根据记录类型格式化 content
  switch (recordType) {
    case 'loan':
      request.content = {
        Loan: {  // 变为 Loan 而不是直接的数据结构
          amount: BigInt(Math.floor(Number(formValues.amount) * 100)),
          loan_id: `LOAN${formValues.eventDate.format('YYYYMMDD')}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
          term_months: BigInt(formValues.term),
          interest_rate: Number(formValues.interestRate)
        }
      };
      break;

    case 'repayment':
      request.content = {
        Repayment: {  // 变为 Repayment
          amount: BigInt(Math.floor(Number(formValues.amount) * 100)),
          loan_id: formValues.originalLoanId,
          repayment_date: formValues.eventDate.format('YYYY-MM-DD')
        }
      };
      break;

    case 'notification':
      request.content = {
        Notification: {  // 变为 Notification
          amount: BigInt(Math.floor(Number(formValues.amount) * 100)),
          days: BigInt(formValues.days || 0),
          period_amount: BigInt(Math.floor(Number(formValues.periodAmount || formValues.amount) * 100))
        }
      };
      break;

    default:
      throw new Error(`Unsupported record type: ${recordType}`);
  }

  return request;
}

/**
 * 提交单条记录
 */
export const submitRecord = async (formValues) => {
  try {
    const request = formatRecordRequest(formValues);
    
    console.log('Submitting record request:', JSON.stringify(request, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    ));
    
    const actor = await createActor();
    const response = await actor.submit_record(request);
    
    if ('Err' in response) {
      throw new Error(response.Err);
    }

    return {
      success: true,
      data: {
        recordId: response.Ok.record_id,
        timestamp: Number(response.Ok.timestamp),
        status: getStatusString(response.Ok.status),
        rewardAmount: response.Ok.reward_amount ? Number(response.Ok.reward_amount) : null
      }
    };
  } catch (error) {
    console.error('Submit record failed:', error);
    throw error;
  }
};

/**
 * 格式化批量记录
 */
function formatBatchRecord(record) {
  return {
    record_type: getRecordType(record.recordType),
    user_did: record.userDid,
    event_date: record.eventDate,
    content: {
      amount: BigInt(Math.floor(Number(record.amount) * 100)),
      timestamp: BigInt(new Date(record.eventDate).valueOf() * 1000000),
      record_type: getRecordTypeNumber(record.recordType),
      user_id: new Uint8Array(Buffer.from(record.userDid || '', 'utf-8')),
      term_months: record.term ? [BigInt(Math.floor(Number(record.term)))] : [],
      interest_rate: record.interestRate ? [Number(record.interestRate)] : [],
      loan_id: record.originalLoanId ? [record.originalLoanId] : [],
      days: record.overdueDays ? [BigInt(Math.floor(Number(record.overdueDays)))] : [],
      period_amount: record.amount ? [BigInt(Math.floor(Number(record.amount) * 100))] : []
    }
  };
}

/**
 * 批量提交记录
 */
export const submitRecordsBatch = async (records) => {
  try {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('无效的记录格式');
    }

    if (records.length > 1000) {
      throw new Error('单次提交不能超过1000条记录');
    }

    const formattedRecords = records.map(formatBatchRecord);
    console.log('Submitting batch records:', formattedRecords);

    const actor = await createActor();
    const batchRequest = { records: formattedRecords };
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
          timestamp: Number(response.Ok.timestamp),  // 转换为 BigInt
          record_type: getRecordTypeNumber(record.recordType), // 新增
  user_id: new Uint8Array(Buffer.from(record.userDid || '', 'utf-8')), // 新增
          status: getStatusString(record.status),
          rewardAmount: record.reward_amount ? Number(record.reward_amount) : null
        }))
      }
    };
  } catch (error) {
    console.error('Submit records batch failed:', error);
    throw new Error(error.message || '批量提交记录失败');
  }
};

/**
 * 验证Excel行数据
 */
function validateRow(row) {
  // 检查必填字段
  if (!row.recordType || !row.userDid || !row.eventDate || !row.amount) {
    return false;
  }

  // 检查记录类型
  if (!['loan', 'repayment', 'overdue'].includes(row.recordType)) {
    return false;
  }

  // 检查金额
  if (isNaN(Number(row.amount)) || Number(row.amount) <= 0) {
    return false;
  }

  // 检查日期格式
  const date = new Date(row.eventDate);
  if (isNaN(date.getTime())) {
    return false;
  }

    // 检查记录类型
    if (!['loan', 'repayment', 'notification'].includes(row.recordType)) {
      return false;
    }
  
    // 根据记录类型检查特定字段
    switch (row.recordType) {
      case 'loan':
        return !isNaN(Number(row.term)) && Number(row.term) > 0 && 
               !isNaN(Number(row.interestRate)) && Number(row.interestRate) >= 0;
      case 'repayment':
        return Boolean(row.originalLoanId);
      case 'notification':
        return !isNaN(Number(row.days)) && Number(row.days) > 0 &&
               !isNaN(Number(row.periodAmount)) && Number(row.periodAmount) > 0;
      default:
        return false;
    }
}

/**
 * 解析Excel文件
 */
export const parseExcelRecords = async (file) => {
  if (!file) {
    throw new Error('文件不能为空');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('文件大小不能超过10MB');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const records = lines
          .slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim());
            const record = {};
            headers.forEach((header, index) => {
              record[header] = values[index];
            });
            return record;
          })
          .filter(validateRow);

        if (records.length === 0) {
          throw new Error('文件中没有有效的记录');
        }

        resolve(records);
      } catch (error) {
        reject(new Error('CSV文件格式不正确: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
};

/**
 * 获取CSV模板数据
 */
export const getCsvTemplateData = () => {
  return [
    'recordType,userDid,eventDate,amount,term,interestRate,originalLoanId,overdueDays,remarks',
    'loan,did:example:123,2024-03-24,100000,12,4.35,,,首次贷款',
    'loan,did:example:456,2024-03-24,50000,6,3.85,,,小额贷款',
    'repayment,did:example:123,2024-03-24,5000,,,REC123,,正常还款',
    'repayment,did:example:456,2024-03-24,3000,,,REC456,,提前还款',
    'overdue,did:example:789,2024-03-24,2000,,,,30,首次逾期',
    'overdue,did:example:789,2024-03-24,3000,,,,45,持续逾期',
    '',
    '# 字段说明：',
    '# recordType: 记录类型（loan-贷款记录, repayment-还款记录, overdue-逾期记录）',
    '# userDid: 用户DID',
    '# eventDate: 发生日期（格式：YYYY-MM-DD）',
    '# amount: 金额（必填）',
    '# term: 贷款期限（月），仅贷款记录需填写',
    '# interestRate: 年化利率（%），仅贷款记录需填写',
    '# originalLoanId: 原贷款编号，仅还款记录需填写',
    '# overdueDays: 逾期天数，仅逾期记录需填写',
    '# remarks: 备注（选填）'
  ].join('\n');
};

export default {
  submitRecord,
  submitRecordsBatch,
  parseExcelRecords,
  getCsvTemplateData
};