import { Platform } from 'react-native';
import { ERROR_LOG_URL } from '../config/api';

export const logError = async (error, context = {}) => {
  try {
    await fetch(ERROR_LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error?.message || 'Unknown error',
        stack: error?.stack || null,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        ...context,
      }),
    });
  } catch (loggingError) {
    console.warn('Remote error logging failed:', loggingError?.message || loggingError);
  }
};
