import { Principal } from '@dfinity/principal';
import { getActor } from './IDL';

// DCC代币充值
export async function rechargeDCC(institutionId, { dccAmount, usdtAmount, txHash, remarks }) {
  const actor = await getActor();
  try {
    // 记录代币交易（买入）
    await actor.record_token_trading(
      Principal.fromText(institutionId),
      true,
      BigInt(Math.floor(dccAmount))
    );

    // // 记录线下USDT交易
    // await actor.record_offline_transaction({
    //   institution_id: Principal.fromText(institutionId),
    //   transaction_type: { Recharge: null },
    //   dcc_amount: BigInt(Math.floor(dccAmount)),
    //   usdt_amount: BigInt(Math.floor(usdtAmount * 100)) / BigInt(100),
    //   tx_hash: txHash,
    //   remarks: remarks || '',
    //   timestamp: BigInt(Date.now()) * BigInt(1000000) // 转换为纳秒
    // });

    return {
      success: true,
      message: '充值成功'
    };
  } catch (error) {
    console.error('DCC充值失败:', error);
    throw new Error(error.message || '充值失败');
  }
}

// DCC代币扣除
export async function deductDCC(institutionId, { dccAmount, usdtAmount, txHash, remarks }) {
  const actor = await getActor();
  try {
    // 记录代币交易（卖出）
    await actor.record_token_trading(
      Principal.fromText(institutionId),
      false,
      BigInt(Math.floor(dccAmount))
    );

    // // 记录线下USDT交易
    // await actor.record_offline_transaction({
    //   institution_id: Principal.fromText(institutionId),
    //   transaction_type: { Deduct: null },
    //   dcc_amount: BigInt(Math.floor(dccAmount)),
    //   usdt_amount: BigInt(Math.floor(usdtAmount * 100)) / BigInt(100),
    //   tx_hash: txHash,
    //   remarks: remarks || '',
    //   timestamp: BigInt(Date.now()) * BigInt(1000000)
    // });

    return {
      success: true,
      message: '扣除成功'
    };
  } catch (error) {
    console.error('DCC扣除失败:', error);
    throw new Error(error.message || '扣除失败');
  }
}


