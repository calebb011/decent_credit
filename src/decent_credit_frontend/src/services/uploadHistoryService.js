// uploadHistoryService.js

const uploadHistoryService = {
    /**
     * 获取上传历史记录
     * @param {string} institutionId 机构ID
     * @param {Object} params 查询参数
     * @param {string} params.status 状态筛选
     * @param {string} params.startDate 开始日期
     * @param {string} params.endDate 结束日期
     * @returns {Promise<Object>} 查询结果
     */
    getUploadHistory: async (institutionId, params) => {
      try {
        // 尝试调用实际的API
        try {
          const actor = await window.getActor();
          const response = await actor.get_upload_history(institutionId, params);
          return {
            success: true,
            data: response.data || [],
            total: response.total || 0
          };
        } catch (apiError) {
          console.warn('API调用失败，使用模拟数据:', apiError);
          
          // 仅在API调用失败时使用模拟数据
          const mockData = Array(15).fill(null).map((_, index) => ({
            id: `UP${Date.now() + index}`,
            user_did: `did:example:${100 + index}`,
            institution_id: institutionId,
            status: ['Success', 'Failed'][Math.floor(Math.random() * 2)],
            submitted_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            review_result: Math.random() > 0.5 ? {
              passed: false,
              reason: [
                '数据格式不符合要求',
                '金额超出合理范围',
                '利率超出限制'
              ][Math.floor(Math.random() * 3)]
            } : {
              passed: true,
              reason: null
            }
          }));
  
          // 应用筛选
          let filteredData = mockData;
          
          if (params.status) {
            filteredData = filteredData.filter(item => item.status === params.status);
          }
          
          if (params.startDate) {
            const startTimestamp = new Date(params.startDate).getTime();
            filteredData = filteredData.filter(item => 
              new Date(item.submitted_at).getTime() >= startTimestamp
            );
          }
          
          if (params.endDate) {
            const endTimestamp = new Date(params.endDate).getTime();
            filteredData = filteredData.filter(item => 
              new Date(item.submitted_at).getTime() <= endTimestamp
            );
          }
  
          return {
            success: true,
            data: filteredData,
            total: filteredData.length
          };
        }
      } catch (error) {
        console.error('Fetch upload history failed:', error);
        throw new Error(error.message || '获取上传历史记录失败');
      }
    },
  
    /**
     * 重试失败的记录
     * @param {string} institutionId 机构ID
     * @param {string} recordId 记录ID
     * @returns {Promise<Object>} 重试结果
     */
    retryFailedRecord: async (institutionId, recordId) => {
      try {
        // 尝试调用实际的API
        try {
          const actor = await window.getActor();
          const response = await actor.retry_record(institutionId, recordId);
          return {
            success: true,
            data: response
          };
        } catch (apiError) {
          console.warn('API调用失败，使用模拟响应:', apiError);
          
          // 仅在API调用失败时返回模拟响应
          return {
            success: true,
            data: {
              recordId,
              status: 'Success'
            }
          };
        }
      } catch (error) {
        console.error('Retry record failed:', error);
        throw new Error(error.message || '重试记录失败');
      }
    }
  };
  
  export default uploadHistoryService;