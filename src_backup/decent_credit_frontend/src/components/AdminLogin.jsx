// AdminLogin.jsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/icpService';

const AdminLogin = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [captcha] = useState('1234'); // 模拟验证码

  const handleSubmit = async (values) => {
    if (values.captcha !== captcha) {
      message.error('验证码错误');
      return;
    }

    try {
      const response = await loginAdmin({
        username: values.username,
        password: values.password
      });
      
      if (response.success) {
        message.success('登录成功');
        navigate('/admin/dashboard');
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
        <Card title="管理员登录" className="w-full">
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item 
              name="username" 
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="用户名" size="large" />
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

export default AdminLogin;