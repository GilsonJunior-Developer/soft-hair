import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APP_VERSION = process.env.npm_package_version ?? '0.1.0';

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'cache-control': 'no-store, max-age=0',
      },
    },
  );
}
