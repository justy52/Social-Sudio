import { del, put } from '@vercel/blob';
import type { BlobStorageAdapter } from './api.ts';

export const vercelBlobStorage: BlobStorageAdapter = {
  put(pathname, body, options) {
    return put(pathname, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: options.contentType,
      token: options.token,
    });
  },
  del(pathname, options) {
    return del(pathname, { token: options.token });
  },
};
