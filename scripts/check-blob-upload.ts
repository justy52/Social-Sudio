import { del, put } from '@vercel/blob';
import { config } from 'dotenv';

config({ path: '.env.local', override: false, quiet: true });
config({ path: '.env', override: false, quiet: true });

const token = process.env.BLOB_READ_WRITE_TOKEN;
const pathname = `diagnostics/social-studio-${Date.now()}.txt`;

console.log(JSON.stringify({ blobTokenPresent: Boolean(token) }));

if (!token) {
  process.exitCode = 1;
  console.log(JSON.stringify({ uploadOk: false, errorMessage: 'Blob token is missing.' }));
} else {
  try {
    const blob = await put(pathname, Buffer.from('ok'), {
      access: 'public',
      contentType: 'text/plain',
      token,
    });

    console.log(
      JSON.stringify({
        uploadOk: true,
        pathnamePresent: Boolean(blob.pathname),
        urlPresent: Boolean(blob.url),
      }),
    );

    await del(blob.pathname ?? pathname, { token });
    console.log(JSON.stringify({ deleteOk: true }));
  } catch (error) {
    const safeError = readSafeError(error);

    console.log(
      JSON.stringify({
        uploadOk: false,
        errorName: safeError.name,
        errorMessage: safeError.message,
        status: safeError.status,
      }),
    );
    process.exitCode = 1;
  }
}

function readSafeError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return {
      name: null,
      message: typeof error === 'string' ? error : null,
      status: null,
    };
  }

  const value = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };

  return {
    name: typeof value.name === 'string' ? value.name : null,
    message: typeof value.message === 'string' ? value.message : null,
    status:
      typeof value.status === 'number'
        ? value.status
        : typeof value.statusCode === 'number'
          ? value.statusCode
          : null,
  };
}
