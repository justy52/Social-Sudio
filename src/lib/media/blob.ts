import { del, put } from '@vercel/blob';
import type { BlobStorageAdapter } from './api.ts';

export const vercelBlobStorage: BlobStorageAdapter = {
  put(pathname, body, options) {
    return put(pathname, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: options.contentType,
      ...(options.token ? { token: options.token } : {}),
      ...(!options.token && options.oidcToken ? { oidcToken: options.oidcToken } : {}),
      ...(!options.token && options.storeId ? { storeId: options.storeId } : {}),
    });
  },
  del(pathname, options) {
    return del(pathname, {
      ...(options.token ? { token: options.token } : {}),
      ...(!options.token && options.oidcToken ? { oidcToken: options.oidcToken } : {}),
      ...(!options.token && options.storeId ? { storeId: options.storeId } : {}),
    });
  },
};
