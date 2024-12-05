import React, { useState, useEffect } from 'react';
import { Switch, InputNumber, Card, Form, Button, Spin, message, Alert } from 'antd';
import { Settings, Database, CreditCard, Save, PieChart, AlertCircle } from 'lucide-react';
import { getInstitutionSettings, updateInstitutionSettings } from '../services/InstitutionSettingsService';

const InstitutionSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState({
    dataServiceEnabled: false,
    queryPrice: 0,
    rewardShareRatio: 0
  });

  // 获取设置
  const fetchSettings = async () => {
    try {
      const response = await getInstitutionSettings();
      console.log('Settings response:', response);
      
      if (response.success && response.data) {
        const values = {
          dataServiceEnabled: Boolean(response.data.dataServiceEnabled),
          queryPrice: parseFloat(response.data.queryPrice) || 0,
          rewardShareRatio: parseInt(response.data.rewardShareRatio) || 0
        };
        console.log('Setting form values:', values);
        
        // 更新状态和表单值
        setFormValues(values);
        form.setFieldsValue(values);
      } else {
        message.error('Failed to load settings: ' + response.message);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchSettings();
  }, []);

  // 提交更新
  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const response = await updateInstitutionSettings(values);
      if (response.success) {
        message.success('Settings updated successfully');
        await fetchSettings();
      } else {
        message.error('Failed to update settings: ' + response.message);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      message.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin tip="Loading..." size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-200">Institution Settings</h1>
        <p className="text-gray-400 mt-2">Manage data service and revenue configuration</p>
      </div>

      <Alert
        icon={<AlertCircle className="w-4 h-4" />}
        message="Important Notice"
        description="These settings will directly affect your data service and revenue sharing. Please configure each option carefully."
        type="info"
        showIcon
        className="bg-blue-500/10 border-blue-500/20 text-gray-200"
      />

      <Card 
        title={
          <div className="flex items-center space-x-2 text-gray-200">
            <Settings className="w-5 h-5" />
            <span>Service Configuration</span>
          </div>
        }
        className="bg-black/20 border-gray-700"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={formValues}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 数据服务开关 */}
            <Form.Item
              name="dataServiceEnabled"
              valuePropName="checked"
              label={
                <span className="text-gray-200 flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Data Service Status</span>
                </span>
              }
              tooltip={{
                title: "When enabled, other institutions can query your data",
                className: 'bg-gray-800 text-gray-200'
              }}
            >
              <div className="flex items-center space-x-4">
                <Switch
                  checked={formValues.dataServiceEnabled}
                  onChange={checked => {
                    setFormValues(prev => ({ ...prev, dataServiceEnabled: checked }));
                  }}
                />
                <span className="text-gray-400 text-sm">
                  Control data service availability
                </span>
              </div>
            </Form.Item>

            {/* 查询价格 */}
            <Form.Item
              name="queryPrice"
              label={
                <span className="text-gray-200 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Query Price</span>
                </span>
              }
              tooltip={{
                title: "Set the DCC amount required for other institutions to query your data",
                className: 'bg-gray-800 text-gray-200'
              }}
            >
              <InputNumber
                className="w-full bg-[#17304D] border-[#17304D] text-gray-200"
                value={formValues.queryPrice}
                onChange={value => {
                  setFormValues(prev => ({ ...prev, queryPrice: value }));
                }}
                min={0}
                step={0.1}
                precision={2}
                controls={false}
                addonAfter="DCC"
                placeholder="Enter query price"
              />
            </Form.Item>

            {/* 分成比例 */}
            <Form.Item
              name="rewardShareRatio"
              label={
                <span className="text-gray-200 flex items-center space-x-2">
                  <PieChart className="w-4 h-4" />
                  <span>Revenue Share Ratio</span>
                </span>
              }
              tooltip={{
                title: "Your share ratio in data query revenue (0-100%)",
                className: 'bg-gray-800 text-gray-200'
              }}
            >
              <InputNumber
                className="w-full bg-[#17304D] border-[#17304D] text-gray-200"
                value={formValues.rewardShareRatio}
                onChange={value => {
                  setFormValues(prev => ({ ...prev, rewardShareRatio: value }));
                }}
                min={0}
                max={100}
                precision={0}
                controls={false}
                formatter={value => `${value || 0}%`}
                parser={value => parseInt(value?.replace('%', ''))}
              />
            </Form.Item>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end pt-4 border-t border-gray-700">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              className="bg-blue-500 hover:bg-blue-600 border-0 flex items-center px-6"
              icon={<Save className="w-4 h-4 mr-2" />}
            >
              Save Settings
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default InstitutionSettings;