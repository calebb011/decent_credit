import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import RiskAssessmentReport from './RiskAssessmentReport';
import { queryAssessmentReports } from '../services/institutionQueryRecordService';

const UserReportList = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [viewReport, setViewReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const institutionId = localStorage.getItem('userPrincipal');
      if (!institutionId) {
        throw new Error('请重新登录');
      }

      const response = await queryAssessmentReports(institutionId);
      // 检查并格式化数据
      if (response.success && response.data) {
        // 将返回的数据转换为组件期望的格式
        const formattedReports = Array.isArray(response.data.data) ? response.data.data : [
          {
            report_id: 'temp-' + Date.now(),
            user_did: 'N/A',
            assessment: {
              creditScore: response.data.creditScore,
              riskLevel: response.data.riskLevel,
              assessmentDetails: response.data.assessmentDetails,
              suggestions: response.data.suggestions
            },
            created_at: Date.now() * 1000000 // 转换为纳秒
          }
        ];
        setReports(formattedReports);
      }
    } catch (error) {
      console.error('获取报告列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const columns = [
    {
      title: '报告ID',
      dataIndex: 'report_id',
      key: 'report_id',
      width: '20%',
    },
    {
      title: '用户DID',
      dataIndex: 'user_did',
      key: 'user_did',
      width: '25%',
      ellipsis: true,
    },
    {
      title: '信用评分',
      dataIndex: ['assessment', 'creditScore'],
      key: 'creditScore',
      width: '15%',
    },
    {
      title: '风险等级',
      dataIndex: ['assessment', 'riskLevel'],
      key: 'riskLevel',
      width: '15%',
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '15%',
      render: (time) => dayjs(Number(time) / 1000000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            setViewReport(record.assessment);
            setModalVisible(true);
          }}
        >
          查看报告
        </Button>
      ),
    }
  ];

  return (
    <div className="p-6">
      <Card title="用户风险评估报告列表">
        <Table
          loading={loading}
          columns={columns}
          dataSource={reports}
          rowKey="report_id"
        />
      </Card>

      <Modal
        title="风险评估报告详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={null}
      >
        {viewReport && <RiskAssessmentReport data={viewReport} showCard={false} />}
      </Modal>
    </div>
  );
};

export default UserReportList;