import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase-admin';
import { analyticsEventSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = analyticsEventSchema.safeParse(await request.json());
    if (!payload.success) return NextResponse.json({ error: 'Invalid analytics event.' }, { status: 400 });

    const supabase = createSupabaseServiceClient();
    if (!supabase) return new NextResponse(null, { status: 204 });

    const referrer = payload.data.referrer ? new URL(payload.data.referrer).origin : null;
    await supabase.from('analytics_events').insert({
      event_type: 'page_view',
      path: payload.data.path,
      referrer,
      session_id: payload.data.sessionId,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    // Analytics must never block a public page. Do not expose internal database failures.
    return new NextResponse(null, { status: 204 });
  }
}
