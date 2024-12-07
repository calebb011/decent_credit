use candid::{CandidType};
use std::fmt;

#[derive(Debug, CandidType)]
pub enum Error {
    InvalidData(String),
    SerializationFailed,
    EncryptionFailed(String),
    StorageFailed,
    InvalidProof,
    RecordNotFound,
    VerificationFailed(String),
    InvalidStatus,
    NotAuthorized,
    DatabaseError(String),
    NetworkError(String),
    ValidationError(String),
    InsufficientBalance,
    ResourceNotFound(String),
    RateLimitExceeded,
    ServiceUnavailable
}

impl Error {
    pub fn as_str(&self) -> &str {
        match self {
            Error::InvalidData(msg) => msg,
            Error::SerializationFailed => "序列化失败",
            Error::EncryptionFailed(msg) => msg,
            Error::StorageFailed => "存储操作失败",
            Error::InvalidProof => "无效的证明",
            Error::RecordNotFound => "未找到记录",
            Error::VerificationFailed(msg) => msg,
            Error::InvalidStatus => "无效的记录状态",
            Error::NotAuthorized => "未授权的操作",
            Error::DatabaseError(msg) => msg,
            Error::NetworkError(msg) => msg,
            Error::ValidationError(msg) => msg,
            Error::InsufficientBalance => "余额不足",
            Error::ResourceNotFound(msg) => msg,
            Error::RateLimitExceeded => "超出请求限制",
            Error::ServiceUnavailable => "服务暂不可用"
        }
    }

    pub fn to_error_code(&self) -> u32 {
        match self {
            Error::InvalidData(_) => 1001,
            Error::SerializationFailed => 1002,
            Error::EncryptionFailed(_) => 1003,
            Error::StorageFailed => 1004,
            Error::InvalidProof => 1005,
            Error::RecordNotFound => 1006,
            Error::VerificationFailed(_) => 1007,
            Error::InvalidStatus => 1008,
            Error::NotAuthorized => 1009,
            Error::DatabaseError(_) => 2001,
            Error::NetworkError(_) => 2002,
            Error::ValidationError(_) => 2003,
            Error::InsufficientBalance => 3001,
            Error::ResourceNotFound(_) => 4001,
            Error::RateLimitExceeded => 4002,
            Error::ServiceUnavailable => 5001,
        }
    }
}

impl std::error::Error for Error {}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.to_error_code(), self.as_str())
    }
}

// 用于方便创建错误的宏
#[macro_export]
macro_rules! err {
    ($variant:ident) => {
        Error::$variant
    };
    ($variant:ident, $msg:expr) => {
        Error::$variant($msg.to_string())
    };
}

// 实现从其他错误类型的转换
impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Self {
        Error::StorageFailed
    }
}

impl From<candid::Error> for Error {
    fn from(_: candid::Error) -> Self {
        Error::SerializationFailed
    }
}

// 添加一些辅助函数
impl Error {
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Error::NetworkError(_) |
            Error::ServiceUnavailable |
            Error::RateLimitExceeded
        )
    }

    pub fn is_client_error(&self) -> bool {
        self.to_error_code() < 5000
    }

    pub fn is_server_error(&self) -> bool {
        self.to_error_code() >= 5000
    }
}

