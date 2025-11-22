import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

// This generates a token for users to join a LiveKit room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, participantName } = body;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing roomName or participantName' },
        { status: 400 }
      );
    }

    // You'll need to set these in your .env.local file
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      console.error('Missing LiveKit credentials. Check your .env.local file.');
      console.error('Current env values:', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasWsUrl: !!wsUrl,
      });
      return NextResponse.json(
        { error: 'Server misconfigured - missing LiveKit credentials. Please check your .env.local file and restart the dev server.' },
        { status: 500 }
      );
    }

    if (!wsUrl) {
      console.error('Missing NEXT_PUBLIC_LIVEKIT_URL in environment variables.');
      return NextResponse.json(
        { error: 'Server misconfigured - missing LiveKit WebSocket URL. Please set NEXT_PUBLIC_LIVEKIT_URL in your .env.local file and restart the dev server.' },
        { status: 500 }
      );
    }

    let at: AccessToken;
    try {
      at = new AccessToken(apiKey, apiSecret, {
        identity: participantName,
      });

      at.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();
      return NextResponse.json({ token, wsUrl });
    } catch (tokenError: any) {
      console.error('Error creating AccessToken:', tokenError);
      return NextResponse.json(
        { error: `Failed to create token: ${tokenError?.message || 'Unknown error'}. Please check your LiveKit credentials and restart the dev server.` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}

