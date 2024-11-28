import { createActor } from './IDL';

export async function loginInstitution(formData) {
  try {
    const actor = await createActor();
    
    // 构造登录请求
    const request = {
      name: formData.username,
      password: formData.password
    };

    // 调用后端登录接口
    const response = await actor.institution_login(request);
    
    if (response.success) {
      // 存储登录状态
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('institutionName', formData.username);
      if (response.institution_id?.[0]) {
        localStorage.setItem('institutionId', response.institution_id[0].toText());
      }
    }

    return {
      success: response.success,
      message: response.message,
      institutionId: response.institution_id?.[0]
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(error.message || '登录失败，请稍后重试');
  }
}

export function logout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('institutionName');
  localStorage.removeItem('institutionId');
}

export function isLoggedIn() {
  return localStorage.getItem('isLoggedIn') === 'true';
}