// services/validator.rs

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

pub struct DataValidator {
   schemas: HashMap<RecordType, ValidationSchema>
}

#[derive(Serialize, Deserialize)]
struct ValidationSchema {
   required_fields: Vec<String>,
   field_types: HashMap<String, FieldType>,
   constraints: Vec<Constraint>
}

#[derive(Serialize, Deserialize)]
enum FieldType {
   String,
   Number,
   Boolean,
   Object,
   Array
}

#[derive(Serialize, Deserialize)] 
enum Constraint {
   StringLength(usize, usize),
   NumberRange(f64, f64),
   Pattern(String),
   Custom(String)
}

impl DataValidator {
   pub fn new() -> Self {
       let mut schemas = HashMap::new();
       
       // 贷款记录验证规则
       schemas.insert(RecordType::Loan, ValidationSchema {
           required_fields: vec![
               "loan_id".to_string(),
               "amount".to_string(),
               "term".to_string(),
               "interest_rate".to_string(),
               "borrower_id".to_string()
           ],
           field_types: {
               let mut types = HashMap::new();
               types.insert("loan_id".to_string(), FieldType::String);
               types.insert("amount".to_string(), FieldType::Number);
               types.insert("term".to_string(), FieldType::Number);
               types.insert("interest_rate".to_string(), FieldType::Number);
               types.insert("borrower_id".to_string(), FieldType::String);
               types
           },
           constraints: vec![
               Constraint::NumberRange(0.0, 1000000.0), // 金额范围
               Constraint::NumberRange(0.0, 100.0),     // 利率范围
           ]
       });

       // 还款记录验证规则
       schemas.insert(RecordType::Payment, ValidationSchema {
           required_fields: vec![
               "payment_id".to_string(),
               "loan_id".to_string(),
               "amount".to_string(),
               "payment_date".to_string()
           ],
           field_types: {
               let mut types = HashMap::new();
               types.insert("payment_id".to_string(), FieldType::String);
               types.insert("loan_id".to_string(), FieldType::String); 
               types.insert("amount".to_string(), FieldType::Number);
               types.insert("payment_date".to_string(), FieldType::String);
               types
           },
           constraints: vec![
               Constraint::NumberRange(0.0, 1000000.0), // 金额范围
           ]
       });

       Self { schemas }
   }

   pub fn validate(&self, record_type: &RecordType, data: &[u8]) -> Result<(), ValidationError> {
       // 解析JSON数据
       let json: Value = serde_json::from_slice(data)
           .map_err(|_| ValidationError::InvalidFormat)?;

       // 获取验证规则
       let schema = self.schemas.get(record_type)
           .ok_or(ValidationError::UnsupportedType)?;

       // 检查必填字段
       for field in &schema.required_fields {
           if !json.get(field).is_some() {
               return Err(ValidationError::MissingField(field.clone()));
           }
       }

       // 检查字段类型
       for (field, expected_type) in &schema.field_types {
           if let Some(value) = json.get(field) {
               if !self.check_type(value, expected_type) {
                   return Err(ValidationError::InvalidFieldType(field.clone()));
               }
           }
       }

       // 检查约束条件
       for constraint in &schema.constraints {
           self.check_constraint(&json, constraint)?;
       }

       Ok(())
   }

   fn check_type(&self, value: &Value, expected_type: &FieldType) -> bool {
       match expected_type {
           FieldType::String => value.is_string(),
           FieldType::Number => value.is_number(),
           FieldType::Boolean => value.is_boolean(),
           FieldType::Object => value.is_object(),
           FieldType::Array => value.is_array()
       }
   }

   fn check_constraint(&self, json: &Value, constraint: &Constraint) -> Result<(), ValidationError> {
       match constraint {
           Constraint::NumberRange(min, max) => {
               // 检查数值范围
               if let Some(num) = json.get("amount").and_then(|v| v.as_f64()) {
                   if num < *min || num > *max {
                       return Err(ValidationError::ConstraintViolation);
                   }
               }
           },
           Constraint::Pattern(pattern) => {
               // 检查字符串模式
               // TODO: 实现正则匹配
           },
           _ => {}
       }
       Ok(())
   }
}

#[derive(Debug)]
pub enum ValidationError {
   InvalidFormat,
   UnsupportedType,
   MissingField(String),
   InvalidFieldType(String),
   ConstraintViolation,
}
