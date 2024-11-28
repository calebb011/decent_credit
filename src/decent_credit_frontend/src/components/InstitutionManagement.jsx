import React, { useState, useEffect } from 'react';
import { BarChart2, Database, AlertCircle } from 'lucide-react';
import { getAllInstitutions, registerInstitution, updateInstitutionStatus } from '../services/institutionService';
import InstitutionDialog from './InstitutionDialog';

const InstitutionList = () => {
 const [institutions, setInstitutions] = useState([]);
 const [loading, setLoading] = useState(false);
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingInstitution, setEditingInstitution] = useState(null);

 const handleAddOrEdit = async (formData) => {
   try {
     if (editingInstitution) {
       console.log('修改机构:', formData);
     } else {
       await registerInstitution(formData);
     }
     await fetchInstitutions();
   } catch (error) {
     console.error('操作失败:', error);
     throw error;
   }
 };

 const fetchInstitutions = async () => {
   setLoading(true);
   try {
     const data = await getAllInstitutions();
     setInstitutions(data);
   } catch (error) {
     console.error('获取机构列表失败:', error);
   } finally {
     setLoading(false);
   }
 };

 useEffect(() => {
   fetchInstitutions();
 }, []);

 const handleStatusChange = async (institution) => {
  const newStatus = institution.status !== 'active';
  const actionText = newStatus ? '接入' : '解除接入';
  
  if (window.confirm(`确认${actionText}机构 ${institution.name} 吗？`)) {
    try {
      const principalId = typeof institution.id === 'string' 
        ? institution.id 
        : institution.id.toText();
      
      await updateInstitutionStatus(principalId, newStatus);
      await fetchInstitutions();
    } catch (error) {
      console.error(`${actionText}失败:`, error);
      alert(error.message || `${actionText}失败`);
    }
  }
};


 return (
   <div className="min-h-screen bg-gray-50 py-6">
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <div className="flex justify-between items-center mb-6">
         <div>
           <h1 className="text-2xl font-bold text-gray-900">机构管理</h1>
           <p className="mt-1 text-sm text-gray-600">管理系统接入的金融机构及其数据使用情况</p>
         </div>
         <button 
           className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
           onClick={fetchInstitutions}
         >
           刷新
         </button>
         <button 
           className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
           onClick={() => {
             setEditingInstitution(null);
             setIsDialogOpen(true);
           }}
         >
           + 接入新机构
         </button>
       </div>

       {loading ? (
         <div className="text-center py-12">
           <div className="text-gray-500">加载中...</div>
         </div>
       ) : (
         <div className="space-y-4">
           {institutions.map((institution) => (
             <div key={institution.id} className="bg-white rounded-lg shadow overflow-hidden">
               <div className="p-4">
                 <div className="flex justify-between items-start">
                   <div>
                     <div className="flex items-center space-x-3">
                       <h3 className="text-base font-medium text-gray-900">
                         {institution.name}
                       </h3>
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                         institution.status === 'active' 
                           ? 'bg-green-100 text-green-800'
                           : 'bg-red-100 text-red-800'
                       }`}>
                         {institution.status === 'active' ? '已接入' : '未接入'}
                       </span>
                     </div>
                     <p className="mt-1 text-sm text-gray-500">{institution.full_name}</p>
                   </div>
                   <div className="text-right">
                     <div className="text-sm text-gray-500">
                       接入时间: {institution.join_time}
                     </div>
                     <div className="text-sm text-gray-500 mt-1">
                       最近活跃: {institution.last_active}
                     </div>
                   </div>
                 </div>

                 <div className="mt-4 grid grid-cols-4 gap-4">
                   <div className="border rounded-lg p-3">
                     <div className="flex items-center text-sm font-medium text-gray-500">
                       <BarChart2 className="w-4 h-4 mr-2" />
                       API调用量
                     </div>
                     <div className="mt-1">
                       <div className="text-xl font-semibold text-gray-900">
                         {institution.api_calls.toLocaleString()}
                       </div>
                       <div className="text-sm text-gray-500">
                         消耗 {institution.dcc_consumed.toLocaleString()} DCC
                       </div>
                     </div>
                   </div>

                   <div className="border rounded-lg p-3">
                     <div className="flex items-center text-sm font-medium text-gray-500">
                       <Database className="w-4 h-4 mr-2" />
                       数据上传量
                     </div>
                     <div className="mt-1 text-xl font-semibold text-gray-900">
                       {institution.data_uploads.toLocaleString()}
                     </div>
                   </div>

                   <div className="border rounded-lg p-3">
                     <div className="flex items-center text-sm font-medium text-gray-500">
                       <AlertCircle className="w-4 h-4 mr-2" />
                       信用评分
                     </div>
                     <div className="mt-1">
                       <div className="text-xl font-semibold text-gray-900">
                         {institution.credit_score.score}
                       </div>
                       <div className="text-sm text-gray-500">
                         更新于: {new Date(institution.credit_score.last_update).toLocaleString()}
                       </div>
                     </div>
                   </div>

                   <div className="border rounded-lg p-3">
                     <div className="flex items-center text-sm font-medium text-gray-500">
                       代币交易量
                     </div>
                     <div className="mt-1 space-y-1">
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-green-600">买入:</span>
                         <span className="text-base font-semibold text-gray-900">
                           {institution.token_trading.bought.toLocaleString()} DCC
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-red-600">卖出:</span>
                         <span className="text-base font-semibold text-gray-900">
                           {institution.token_trading.sold.toLocaleString()} DCC
                         </span>
                       </div>
                     </div>
                   </div>
                 </div>

                 <div className="mt-4 flex justify-end space-x-3">
                   <button 
                     className="px-3 py-1.5 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                     onClick={() => console.log('查看详情:', institution.id)}
                   >
                     查看详情
                   </button>
                   <button 
                     className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                       institution.status === 'active'
                         ? 'text-red-700 bg-red-50 hover:bg-red-100'
                         : 'text-green-700 bg-green-50 hover:bg-green-100'
                     }`}
                     onClick={() => handleStatusChange(institution)}
                   >
                     {institution.status === 'active' ? '解除接入' : '接入'}
                   </button>
                 </div>
               </div>
             </div>
           ))}
         </div>
       )}

       <InstitutionDialog
         isOpen={isDialogOpen}
         onClose={() => {
           setIsDialogOpen(false);
           setEditingInstitution(null);
         }}
         institution={editingInstitution}
         onSubmit={handleAddOrEdit}
       />
     </div>
   </div>
 );
};

export default InstitutionList;