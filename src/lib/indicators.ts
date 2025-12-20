import { RSI, MACD } from 'technicalindicators';

export function calculateRSI(values: number[], period: number = 14) {
    const input = {
        values,
        period,
    };
    return RSI.calculate(input);
}

export function calculateMACD(values: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const input = {
        values,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    };
    return MACD.calculate(input);
}
