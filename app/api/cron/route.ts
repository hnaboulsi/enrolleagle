import { NextResponse } from 'next/server';
import { pollWatchItems } from '@/src/services/pollingService';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: Request) {
    // Simple authorization to prevent abuse from public internet
    // Configure CRON_SECRET in Vercel Environment Variables
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Run the polling logic
        await pollWatchItems();
        return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Cron polling failed:', error);
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
