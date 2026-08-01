import { NextResponse } from 'next/server';

export async function PATCH() {
  return NextResponse.json({ error: { code: 'ENDPOINT_REMOVED', message: 'Use a semantic order action endpoint.' } }, { status: 410 });
}
