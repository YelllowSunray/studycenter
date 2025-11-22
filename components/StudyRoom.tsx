'use client';

import { useState, useEffect } from 'react';
import { VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { Room, DisconnectReason } from 'livekit-client';
import { LiveKitRoom, useRoomContext } from '@livekit/components-react';
import { PomodoroTimer } from './PomodoroTimer';
import { RadioPlayer } from './RadioPlayer';
import { SidePanel } from './SidePanel';
import { Menu, X, Sparkles } from 'lucide-react';

interface StudyRoomProps {
  roomName: string;
  participantName: string;
}

function RoomContent({ roomName }: { roomName: string }) {
  const room = useRoomContext();
  const [showSidePanel, setShowSidePanel] = useState(false);

  useEffect(() => {
    if (room) {
      console.log('✅ Connected to room:', room.name || 'Unknown');
      console.log('Room state:', {
        name: room.name || 'Unknown',
        localParticipant: room.localParticipant?.identity || 'Unknown',
        participants: room.numParticipants || 0,
      });

      const handleDisconnected = (reason?: DisconnectReason) => {
        console.log('❌ Disconnected from room:', reason);
      };

      room.on('disconnected', handleDisconnected);

      return () => {
        room.off('disconnected', handleDisconnected);
      };
    }
  }, [room]);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-rose-50/20 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top bar with controls */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-purple-500 via-rose-500 to-teal-500 p-2 shadow-md">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-rose-600 to-teal-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-rose-400 dark:to-teal-400">
              Study Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{roomName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
            aria-label="Toggle side panel"
          >
            {showSidePanel ? <X size={20} className="text-slate-600 dark:text-slate-300" /> : <Menu size={20} className="text-slate-600 dark:text-slate-300" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with Pomodoro and Radio */}
        <div className="w-80 border-r border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-y-auto">
          <div className="p-4 space-y-4">
            <PomodoroTimer room={room} />
            <RadioPlayer room={room} />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Video conference */}
          <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900/50">
            <VideoConference />
            <RoomAudioRenderer />
          </div>
        </div>

        {/* Right side panel for Google Docs */}
        {showSidePanel && (
          <div className="w-96 border-l border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl">
            <SidePanel />
          </div>
        )}
      </div>
    </div>
  );
}

export function StudyRoom({ roomName, participantName }: StudyRoomProps) {
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Reset error when trying to connect
    setError('');
    
    // Get token from API
    fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, participantName }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.error || `HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          console.error('API Error:', data.error);
          setError(data.error);
          return;
        }
        if (data.token && data.wsUrl) {
          setToken(data.token);
          setWsUrl(data.wsUrl);
          console.log('✅ Token received, connecting to:', data.wsUrl);
        } else {
          const errMsg = 'Missing token or wsUrl in response. Check your LiveKit configuration.';
          console.error(errMsg, data);
          setError(errMsg);
        }
      })
      .catch((err) => {
        console.error('❌ Error getting token:', err);
        setError(err.message || 'Failed to connect. Please check your LiveKit configuration.');
      });
  }, [roomName, participantName]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <div className="max-w-md rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-red-200 dark:border-red-900/50 shadow-2xl p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">Connection Error</h2>
          <p className="mb-6 text-slate-700 dark:text-slate-300">{error}</p>
          <div className="text-left text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="mb-3 font-semibold text-slate-800 dark:text-slate-200">To fix this:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Create a <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-xs font-mono">.env.local</code> file in the root directory</li>
              <li>Add your LiveKit credentials:
                <pre className="mt-2 bg-slate-900 text-slate-100 p-3 rounded text-xs overflow-x-auto font-mono">
{`LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud`}
                </pre>
              </li>
              <li>Get credentials from <a href="https://cloud.livekit.io" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">cloud.livekit.io</a></li>
              <li>Restart the dev server after adding .env.local</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-rose-400 to-teal-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
            <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-purple-500 mx-auto"></div>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-lg font-medium">Getting connection token...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={wsUrl}
      connectOptions={{
        autoSubscribe: true,
      }}
      onError={(error: Error) => {
        console.error('❌ LiveKit error:', error);
        setError(error.message || 'Connection error occurred');
      }}
      className="h-screen w-screen"
    >
      <RoomContent roomName={roomName} />
    </LiveKitRoom>
  );
}
