// InstitutionLogin.jsx 
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loginInstitution } from '../services/icpService';

const InstitutionLogin = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [captcha] = useState('1234'); // 模拟验证码

  const handleSubmit = async (values) => {
    if (values.captcha !== captcha) {
      message.error('验证码错误');
      return;
    }

    try {
      const response = await loginInstitution({
        name: values.name,
        password: values.password
      });
      
      if (response.success) {
        message.success('登录成功');
        navigate('/institution/dashboard');
      } else {
        message.error(response.message);
      }
    } catch (error) {
      message.error('登录失败');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card title="机构登录" className="w-full">
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item 
              name="name" 
              rules={[{ required: true, message: '请输入机构名称' }]}
            >
              <Input placeholder="机构名称" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="密码" size="large" />
            </Form.Item>
            <Form.Item
              name="captcha"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Input 
                size="large"
                placeholder="验证码" 
                suffix={
                  <span style={{cursor:'pointer'}}>{captcha}</span>
                }
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                登录
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default InstitutionLogin;