import crypto from 'crypto';

/**
 * Generate MD5 hash for PayHere Checkout
 * Formula: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase()).toUpperCase()
 */
export const generateCheckoutHash = (
    merchantId: string,
    orderId: string,
    amount: number,
    currency: string,
    merchantSecret: string
): string => {
    const formattedAmount = amount.toFixed(2);
    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();

    const mainHash = crypto
        .createHash('md5')
        .update(merchantId + orderId + formattedAmount + currency + secretHash)
        .digest('hex')
        .toUpperCase();

    return mainHash;
};

/**
 * Generate MD5 hash for PayHere Notify verification
 * Formula: MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret).toUpperCase()).toUpperCase()
 */
export const generateNotifyHash = (
    merchantId: string,
    orderId: string,
    payhereAmount: string,
    payhereCurrency: string,
    statusCode: string,
    merchantSecret: string
): string => {
    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();

    const mainHash = crypto
        .createHash('md5')
        .update(merchantId + orderId + payhereAmount + payhereCurrency + statusCode + secretHash)
        .digest('hex')
        .toUpperCase();

    return mainHash;
};
