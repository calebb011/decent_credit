import React, { useState, useEffect } from 'react';
import { Typography, message, Modal, Upload, Checkbox } from 'antd';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { registerInstitution } from '../services/adminInstitutionService';
import { useNavigate } from 'react-router-dom';
import { InboxOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
    password: '',
    principal: ''
  });

  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const loginInstitutionId = localStorage.getItem('userPrincipal');
    if (loginInstitutionId) {
      setFormData(prev => ({
        ...prev,
        principal: loginInstitutionId
      }));
    }
  }, []);

  const showResultModal = (success = true) => {
    Modal.info({
      title: 'Registration Submitted',
      content: success 
        ? 'Your registration has been submitted successfully. Please wait for admin approval.'
        : 'Your registration has been submitted. We will process it shortly.',
      okText: 'Back to Home',
      onOk: () => {
        navigate('/');
      },
      centered: true,
    });
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error('You can only upload PDF files!');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return false;
      }
      return false;  // Return false to prevent auto upload
    },
    onChange: ({ fileList }) => setFileList(fileList),
    fileList,
    maxCount: 1
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerInstitution(formData);
      showResultModal(true);
    } catch (error) {
      console.error('Registration error:', error);
      showResultModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-12 flex flex-col justify-center">
        <div className="max-w-xl">
          <Title level={1} className="!text-white !text-5xl !font-bold !mb-6">
            Institution Account Registration
          </Title>
          <Text className="!text-white !text-lg !opacity-90">
            Securely connect to Internet Computer using Internet Identity.
            Please complete your institution information for registration.
          </Text>
        </div>
      </div>

      <div className="w-[480px] bg-white p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <Title level={2} className="!mb-4 !text-gray-800">Registration Application</Title>
            <Text className="!text-gray-700 !text-base">
              Please fill in the following information to complete registration
            </Text>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Principal ID
              </label>
              <input
                type="text"
                value={formData.principal}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-800"
              />
              <Text className="!text-sm !text-gray-600 mt-1">
                Your identity has been automatically retrieved
              </Text>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Institution Short Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="e.g., Alibaba Finance"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Institution Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                placeholder="e.g., Alibaba Financial Technology Co., Ltd."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  placeholder="Set login password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                >
                  {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
              <Text className="!text-sm !text-gray-600 mt-1">
                Default password 'changeme123' will be used if not set
              </Text>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Business License <span className="text-red-500">*</span>
              </label>
              <Upload.Dragger {...uploadProps} className="w-full">
                <p className="ant-upload-drag-icon">
                  <InboxOutlined className="text-blue-500" />
                </p>
                <p className="ant-upload-text !text-gray-800 !text-base">Click or drag file to upload</p>
                <p className="ant-upload-hint !text-sm !text-gray-600">
                  Support for PDF only. Max size: 10MB
                </p>
              </Upload.Dragger>
            </div>

            <div className="flex items-start">
              <Checkbox
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1"
              />
              <span className="ml-2 text-sm text-gray-700">
                I have read and agree to the {' '}
                <button
                  type="button"
                  onClick={() => {
                    Modal.info({
                      title: 'Terms and Conditions',
                      content: (
                        <div className="max-h-96 overflow-y-auto">
                          <p>1. Service Terms...</p>
                          <p>2. Privacy Policy...</p>
                        </div>
                      ),
                      width: 600,
                    });
                  }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  terms and conditions
                </button>
              </span>
            </div>

            <button
              type="submit"
              className={`w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium
                ${loading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              disabled={loading || !agreedToTerms}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;