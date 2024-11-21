// src/decent_credit_backend/src/services/logger.rs
use candid::CandidType;
use serde::Deserialize;
use std::{cell::RefCell, collections::VecDeque};
use ic_cdk::api::time;

pub const MAX_LOG_ENTRIES: usize = 1000;

#[derive(CandidType, Deserialize, Debug, Clone)]
pub enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct LogEntry {
    pub timestamp: u64,
    pub level: LogLevel,
    pub message: String,
    pub context: Option<String>,
}

pub struct Logger {
    entries: VecDeque<LogEntry>,
}

impl Logger {
    pub fn new() -> Self {
        Self {
            entries: VecDeque::with_capacity(MAX_LOG_ENTRIES),
        }
    }

    pub fn log(&mut self, level: LogLevel, message: impl Into<String>, context: Option<String>) {
        if self.entries.len() >= MAX_LOG_ENTRIES {
            self.entries.pop_front();
        }

        self.entries.push_back(LogEntry {
            timestamp: time(),
            level,
            message: message.into(),
            context,
        });
    }

    pub fn debug(&mut self, message: impl Into<String>, context: Option<String>) {
        self.log(LogLevel::Debug, message, context);
    }

    pub fn info(&mut self, message: impl Into<String>, context: Option<String>) {
        self.log(LogLevel::Info, message, context);
    }

    pub fn warning(&mut self, message: impl Into<String>, context: Option<String>) {
        self.log(LogLevel::Warning, message, context);
    }

    pub fn error(&mut self, message: impl Into<String>, context: Option<String>) {
        self.log(LogLevel::Error, message, context);
    }

    pub fn get_logs(&self) -> Vec<LogEntry> {
        self.entries.iter().cloned().collect()
    }

    pub fn get_recent_logs(&self, count: usize) -> Vec<LogEntry> {
        self.entries.iter().rev().take(count).cloned().collect()
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }
}

thread_local! {
    pub static LOGGER: RefCell<Logger> = RefCell::new(Logger::new());
}

// 添加一些便捷函数
pub fn log_debug(message: impl Into<String>, context: Option<String>) {
    LOGGER.with(|logger| {
        logger.borrow_mut().debug(message, context);
    });
}

pub fn log_info(message: impl Into<String>, context: Option<String>) {
    LOGGER.with(|logger| {
        logger.borrow_mut().info(message, context);
    });
}

pub fn log_warning(message: impl Into<String>, context: Option<String>) {
    LOGGER.with(|logger| {
        logger.borrow_mut().warning(message, context);
    });
}

pub fn log_error(message: impl Into<String>, context: Option<String>) {
    LOGGER.with(|logger| {
        logger.borrow_mut().error(message, context);
    });
}