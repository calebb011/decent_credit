import { createActor } from './institutionService';
import { Principal } from '@dfinity/principal';

/**
 * 查询用户信用记录
 * @param {Object} params 查询参数
 * @returns {Promise} 查询结果
 */
export async function queryRecordsByUserDid(params) {
  const actor = await createActor();
  try {
    const records = await actor.query_records_by_user_did(params.userDid);
    
    return {
      success: true,
      data: records.map(formatRecord)
    };
  } catch (error) {
    console.error('查询记录失败:', error);
    throw new Error(error.message || '查询失败');
  }
}

/**
 * 格式化记录数据
 */
function formatRecord(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    institution_id: raw.institution_id.toText(),
    record_type: raw.record_type,
    content: formatContent(raw.content),
    status: raw.status,
    timestamp: raw.timestamp,
    user_did: raw.user_did,
    canister_id: raw.canister_id
  };
}

/**
 * 格式化记录内容
 */
function formatContent(content) {
  // 需要根据实际的内容结构进行解析
  try {
    if (typeof content === 'string') {
      return JSON.parse(content);
    }
    return content;
  } catch (error) {
    console.error('解析记录内容失败:', error);
    return content;
  }
}

export default {
  queryRecordsByUserDid
};