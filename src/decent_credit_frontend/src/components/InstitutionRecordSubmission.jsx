// InstitutionRecordSubmission.jsx
import React, { useState } from 'react';
import { 
  Card, Form, Input, Select, Button, DatePicker, message, Alert, 
  Descriptions, Upload, Modal, Progress 
} from 'antd';
import { InfoCircleOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import recordSubmissionService from '../services/recordSubmissionService';

const { Option } = Select;

const InstitutionRecordSubmission = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recordType, setRecordType] = useState('loan');
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);

  const currentInstitution = {
    id: localStorage.getItem('institutionId'),
    name: localStorage.getItem('institutionName')
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const result = await recordSubmissionService.submitRecord(values);
      
      if (result.success) {
        message.success('数据提交成功');
        form.resetFields();
      } else {
        throw new Error(result.message || '提交失败');
      }
    } catch (error) {
      console.error('Submit failed:', error);
      message.error(error.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpload = async () => {
    if (!uploadFile) {
      message.error('请先选择Excel文件');
      return;
    }

    setBatchProcessing(true);
    setUploadProgress(0);
    
    try {
      const records = await recordSubmissionService.parseExcelRecords(uploadFile);
      setUploadProgress(30);

      const result = await recordSubmissionService.submitRecordsBatch(records);
      setUploadProgress(100);

      if (result.success) {
        message.success(`成功提交 ${result.data.submitted} 条记录`);
        if (result.data.failed > 0) {
          message.warning(`${result.data.failed} 条记录提交失败`);
        }
        setBatchModalVisible(false);
        setUploadFile(null);
      }
    } catch (error) {
      console.error('Batch upload failed:', error);
      message.error(error.message || '批量上传失败');
    } finally {
      setBatchProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = recordSubmissionService.getCsvTemplateData();
    const blob = new Blob([templateData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '信用记录导入模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const renderInstitutionInfo = () => (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <Descriptions title="提交机构信息" column={1} size="small">
        <Descriptions.Item label="机构ID">{currentInstitution.id}</Descriptions.Item>
        <Descriptions.Item label="机构名称">{currentInstitution.name}</Descriptions.Item>
      </Descriptions>
    </div>
  );

  const renderExtraFields = () => {
    switch (recordType) {
      case 'loan':
        return (
          <>
            <Form.Item
              name="term"
              label="贷款期限(月)"
              rules={[{ required: true, message: '请输入贷款期限' }]}
            >
              <Input type="number" placeholder="请输入贷款期限" min={1} />
            </Form.Item>
            <Form.Item
              name="interestRate"
              label="年化利率(%)"
              rules={[{ required: true, message: '请输入年化利率' }]}
            >
              <Input type="number" placeholder="请输入年化利率" step={0.01} min={0} max={100} />
            </Form.Item>
          </>
        );
      case 'repayment':
        return (
          <Form.Item
            name="originalLoanId"
            label="原贷款编号"
            rules={[{ required: true, message: '请输入原贷款编号' }]}
          >
            <Input placeholder="请输入原贷款编号" />
          </Form.Item>
        );
      case 'overdue':
        return (
          <Form.Item
            name="overdueDays"
            label="逾期天数"
            rules={[{ required: true, message: '请输入逾期天数' }]}
          >
            <Input type="number" placeholder="请输入逾期天数" min={1} />
          </Form.Item>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">信用数据提交</h2>
        <p className="text-gray-600">提交用户信用记录数据</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="提交新记录" className="shadow-sm">
            {renderInstitutionInfo()}
            
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                recordType: 'loan',
                eventDate: dayjs()
              }}
            >
              <Form.Item
                name="recordType"
                label="记录类型"
                rules={[{ required: true, message: '请选择记录类型' }]}
              >
                <Select onChange={(value) => setRecordType(value)}>
                  <Option value="loan">贷款记录</Option>
                  <Option value="repayment">还款记录</Option>
                  <Option value="overdue">逾期记录</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="userDid"
                label="用户DID"
                rules={[{ required: true, message: '请输入用户DID' }]}
              >
                <Input placeholder="请输入用户DID" />
              </Form.Item>

              <Form.Item
                name="eventDate"
                label="发生日期"
                rules={[{ required: true, message: '请选择发生日期' }]}
              >
                <DatePicker 
                  className="w-full"
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>

              <Form.Item
                name="amount"
                label="金额"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <Input type="number" placeholder="请输入金额" min={0.01} step={0.01} />
              </Form.Item>

              {renderExtraFields()}

              <Alert
                message="提交说明"
                description="提交的数据将进行ZK证明生成和加密存储，确保数据安全性。"
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                className="mb-4"
              />

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  block
                >
                  提交记录
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="批量提交" className="shadow-sm">
            <div className="space-y-4">
              <Alert
                message="批量提交说明"
                description="支持通过Excel文件批量提交记录，请先下载模板，按要求填写数据后上传。"
                type="info"
                showIcon
              />
              <div className="flex justify-between">
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                >
                  下载导入模板
                </Button>
                <Button 
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => setBatchModalVisible(true)}
                >
                  批量上传
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Card title="提交指南" className="shadow-sm">
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">支持的记录类型</h4>
              <ul className="list-disc list-inside text-gray-600">
                <li>贷款记录：原始贷款信息，包含金额、期限、利率</li>
                <li>还款记录：还款金额、原贷款关联</li>
                <li>逾期记录：逾期金额、逾期天数</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">数据要求</h4>
              <ul className="list-disc list-inside text-gray-600">
                <li>确保数据真实性和准确性</li>
                <li>必须包含用户的DID信息</li>
                <li>金额必须大于0</li>
                <li>发生日期不能晚于今天</li>
                <li>数据提交后将进行加密存储</li>
                <li>每条记录会生成对应的ZK证明</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">字段说明</h4>
              <ul className="list-disc list-inside text-gray-600">
                <li>用户DID：用户的去中心化身份标识</li>
                <li>金额：交易或事件涉及的具体金额</li>
                <li>贷款期限：以月为单位的贷款期限</li>
                <li>年化利率：贷款的年化利率百分比</li>
                <li>原贷款编号：还款关联的原始贷款ID</li>
                <li>逾期天数：贷款逾期的具体天数</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        title="批量上传信用记录"
        open={batchModalVisible}
        onCancel={() => !batchProcessing && setBatchModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setBatchModalVisible(false)}
            disabled={batchProcessing}
          >
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary"
            onClick={handleBatchUpload}
            loading={batchProcessing}
          >
            开始上传
          </Button>
        ]}
      >
        <div className="space-y-4">
          <Upload
            accept=".csv,.xlsx,.xls"
            beforeUpload={(file) => {
              setUploadFile(file);
              return false;
            }}
            fileList={uploadFile ? [uploadFile] : []}
            onRemove={() => setUploadFile(null)}
          >
            <Button icon={<UploadOutlined />}>选择Excel文件</Button>
          </Upload>

          {batchProcessing && (
            <div className="pt-4">
              <Progress percent={uploadProgress} status="active" />
            </div>
          )}

          <Alert
            message="上传说明"
            description={
              <ul className="list-disc list-inside">
                <li>请使用下载的模板填写数据</li>
                <li>支持的文件格式：CSV、Excel</li>
                <li>单次最多支持上传1000条记录</li>
                <li>请确保数据格式正确：</li>
                <ul className="list-disc list-inside ml-4">
                  <li>日期格式：YYYY-MM-DD</li>
                  <li>金额必须大于0</li>
                  <li>年化利率为百分比（如：4.35）</li>
                  <li>贷款期限和逾期天数必须为整数</li>
                </ul>
              </ul>
            }
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
};

export default InstitutionRecordSubmission;