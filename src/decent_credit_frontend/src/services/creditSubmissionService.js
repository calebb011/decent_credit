/**
 * 提交单条记录
 * @param {Object} request 记录请求
 * @param {string} request.record_type 记录类型
 * @param {string} request.user_did 用户DID
 * @param {Object} request.content 记录内容
 * @returns {Promise<Object>} 提交结果
 */
export const submitRecord = async (request) => {
    try {
      console.log('Submitting single record:', request);
      // TODO: 与链上交互
      // const actor = await getActor();
      // if (!actor) throw new Error('获取Actor失败');
      // const response = await actor.submit_record(request);
  
      return {
        success: true,
        data: {
          recordId: `REC${Date.now()}`,
          timestamp: Date.now() * 1000000,
          status: 'Pending'
        }
      };
    } catch (error) {
      console.error('Submit record failed:', error);
      throw new Error(error.message || '提交记录失败');
    }
  };
  
  /**
   * 批量提交记录
   * @param {Array<Object>} records 记录数组
   * @returns {Promise<Object>} 提交结果
   */
  export const submitRecordsBatch = async (records) => {
    try {
      // 数据校验
      if (!Array.isArray(records)) {
        throw new Error('无效的记录格式');
      }
  
      if (records.length === 0) {
        throw new Error('没有有效的记录');
      }
  
      if (records.length > 1000) {
        throw new Error('单次提交不能超过1000条记录');
      }
  
      console.log('Submitting records batch:', records);
      // TODO: 与链上交互
      // const actor = await getActor();
      // if (!actor) throw new Error('获取Actor失败');
      // const response = await actor.submit_records_batch(records);
  
      // 模拟批处理结果
      return {
        success: true,
        data: {
          submitted: records.length,
          failed: 0,
          recordIds: records.map((_, index) => `REC${Date.now()}${index}`),
          timestamp: Date.now() * 1000000,
          status: 'Pending'
        }
      };
    } catch (error) {
      console.error('Submit records batch failed:', error);
      throw new Error(error.message || '批量提交记录失败');
    }
  };
  
  /**
   * 解析Excel文件
   * @param {File} file CSV文件
   * @returns {Promise<Array>} 解析后的记录数组
   */
  export const parseExcelRecords = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('文件不能为空'));
        return;
      }
  
      // 检查文件大小（限制为10MB）
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('文件大小不能超过10MB'));
        return;
      }
  
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n');
          
          // 获取表头
          const headers = lines[0].split(',').map(h => h.trim());
          
          // 解析数据行
          const records = lines.slice(1)
            .filter(line => line.trim()) // 移除空行
            .map(line => {
              const values = line.split(',').map(v => v.trim());
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index];
              });
              return row;
            })
            .filter(row => validateRow(row))
            .map(row => formatRecord(row));
  
          if (records.length === 0) {
            throw new Error('文件中没有有效的记录');
          }
  
          resolve(records);
        } catch (error) {
          reject(new Error('CSV文件格式不正确: ' + error.message));
        }
      };
  
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
  
      reader.readAsText(file);
    });
  };
  
  /**
   * 验证Excel行数据
   * @param {Object} row Excel行数据
   * @returns {boolean} 是否为有效数据
   */
  const validateRow = (row) => {
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
  
    // 根据记录类型检查特定字段
    switch (row.recordType) {
      case 'loan':
        return !isNaN(Number(row.term)) && Number(row.term) > 0 && 
               !isNaN(Number(row.interestRate)) && Number(row.interestRate) >= 0;
      case 'repayment':
        return Boolean(row.originalLoanId);
      case 'overdue':
        return !isNaN(Number(row.overdueDays)) && Number(row.overdueDays) > 0;
      default:
        return false;
    }
  };
  
  /**
   * 格式化记录数据
   * @param {Object} row Excel行数据
   * @returns {Object} 格式化后的记录
   */
  const formatRecord = (row) => {
    const baseContent = {
      amount: Number(row.amount),
      timestamp: new Date(row.eventDate).valueOf() * 1000000 // 转换为纳秒
    };
  
    let content;
    switch (row.recordType) {
      case 'loan':
        content = {
          ...baseContent,
          term: Number(row.term),
          interestRate: Number(row.interestRate)
        };
        break;
      case 'repayment':
        content = {
          ...baseContent,
          originalLoanId: row.originalLoanId
        };
        break;
      case 'overdue':
        content = {
          ...baseContent,
          overdueDays: Number(row.overdueDays)
        };
        break;
      default:
        content = baseContent;
    }
  
    return {
      record_type: row.recordType,
      user_did: row.userDid,
      content
    };
  };
  
  export default {
    submitRecord,
    submitRecordsBatch,
    parseExcelRecords
  };