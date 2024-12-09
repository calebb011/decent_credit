import { getActor } from './IDL';
import { Principal } from '@dfinity/principal';

export const getInstitutionSettings = async () => {
  try {
    const actor = await getActor();
    const id = localStorage.getItem('userPrincipal');
    if (!id) {
      throw new Error('No institution ID found');
    }
    const principalId = Principal.fromText(id);

   

    const institution = await actor.get_institution(principalId);
    
    if (!institution || institution.length === 0) {
      throw new Error('Institution not found');
    }

    const institutionData = institution[0];

    return {
      success: true,
      data: {
        dataServiceEnabled: institutionData.data_service_enabled,
        queryPrice: Number(institutionData.query_price), // 转换为小数
        rewardShareRatio: Number(institutionData.reward_share_ratio) // 0-100整数
      }
    };
  } catch (error) {
    console.error('获取机构设置失败:', error);
    return {
      success: false,
      message: error.message || '获取设置失败'
    };
  }
};

export const updateInstitutionSettings = async (settings) => {
  try {
    const actor = await getActor();
    const result = await actor.update_service_settings({
      data_service_enabled: settings.dataServiceEnabled,
      query_price: Math.round(settings.queryPrice), // 转换为整数存储
      reward_share_ratio: settings.rewardShareRatio
    });
    
    if ('Err' in result) {
      throw new Error(result.Err);
    }

    return {
      success: true,
      data: result.Ok
    };
  } catch (error) {
    console.error('更新机构设置失败:', error);
    return {
      success: false,
      message: error.message || '更新设置失败'
    };
  }
};