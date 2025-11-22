'use client';

import { useState, useEffect, useRef } from 'react';
import { Room, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import { Play, Pause, RotateCcw, Timer, CheckCircle } from 'lucide-react';

interface PomodoroTimerProps {
  room: Room | null;
}

type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export function PomodoroTimer({ room }: PomodoroTimerProps) {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [state, setState] = useState<TimerState>('idle');
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(Date.now());
  const isProcessingRemoteAction = useRef(false);

  useEffect(() => {
    if (!room) return;

    // Listen for timer sync messages from other participants
    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'pomodoro') {
          // Prevent processing our own messages to avoid loops
          if (data.senderId === room.localParticipant?.identity) {
            return;
          }

          isProcessingRemoteAction.current = true;

          if (data.action === 'sync') {
            // Full sync - update everything
            setTotalSeconds(data.totalSeconds);
            setState(data.state);
            setMinutes(data.minutes);
            setSeconds(data.seconds);
            lastSyncRef.current = Date.now();
          } else if (data.action === 'start') {
            // Start the timer with the provided time
            setTotalSeconds(data.totalSeconds);
            setState('running');
            setMinutes(data.minutes);
            setSeconds(data.seconds);
            lastSyncRef.current = Date.now();
          } else if (data.action === 'pause') {
            // Pause at current time
            setTotalSeconds(data.totalSeconds);
            setState('paused');
            setMinutes(data.minutes);
            setSeconds(data.seconds);
            lastSyncRef.current = Date.now();
          } else if (data.action === 'reset') {
            // Reset to 25 minutes
            setMinutes(25);
            setSeconds(0);
            setTotalSeconds(25 * 60);
            setState('idle');
            lastSyncRef.current = Date.now();
          }

          // Reset flag after a short delay
          setTimeout(() => {
            isProcessingRemoteAction.current = false;
          }, 100);
        }
      } catch (error) {
        console.error('Error parsing timer data:', error);
      }
    };

    room.on('dataReceived', handleData);

    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room]);

  // Timer countdown logic - everyone runs their own countdown and syncs periodically
  useEffect(() => {
    if (state === 'running' && totalSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            setState('completed');
            // Notify everyone when timer completes
            if (room) {
              sendTimerSync({ 
                action: 'sync', 
                minutes: 0, 
                seconds: 0, 
                totalSeconds: 0, 
                state: 'completed' 
              });
            }
            return 0;
          }
          const newTotal = prev - 1;
          const mins = Math.floor(newTotal / 60);
          const secs = newTotal % 60;
          setMinutes(mins);
          setSeconds(secs);
          
          // Sync every 5 seconds to keep everyone in sync (prevent drift)
          const now = Date.now();
          if (room && now - lastSyncRef.current >= 5000) {
            sendTimerSync({ 
              action: 'sync', 
              minutes: mins, 
              seconds: secs, 
              totalSeconds: newTotal, 
              state: 'running' 
            });
            lastSyncRef.current = now;
          }
          return newTotal;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, totalSeconds, room]);

  // Update displayed time when totalSeconds changes
  useEffect(() => {
    setMinutes(Math.floor(totalSeconds / 60));
    setSeconds(totalSeconds % 60);
  }, [totalSeconds]);

  const sendTimerSync = (data: any) => {
    if (!room || !room.localParticipant) return;
    const encoder = new TextEncoder();
    const message = {
      type: 'pomodoro',
      senderId: room.localParticipant.identity,
      ...data
    };
    room.localParticipant.publishData(
      encoder.encode(JSON.stringify(message)),
      DataPacket_Kind.RELIABLE
    );
  };

  const handleStart = () => {
    if (isProcessingRemoteAction.current) return;

    if (state === 'paused') {
      // Resume from current time
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setState('running');
      if (room) {
        sendTimerSync({ 
          action: 'start', 
          minutes: mins, 
          seconds: secs, 
          totalSeconds: totalSeconds, 
          state: 'running' 
        });
      }
    } else if (state === 'idle') {
      // Start fresh 25-minute timer
      setTotalSeconds(25 * 60);
      setMinutes(25);
      setSeconds(0);
      setState('running');
      if (room) {
        sendTimerSync({ 
          action: 'start', 
          minutes: 25, 
          seconds: 0, 
          totalSeconds: 25 * 60, 
          state: 'running' 
        });
      }
    }
  };

  const handlePause = () => {
    if (isProcessingRemoteAction.current) return;

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    setState('paused');
    if (room) {
      sendTimerSync({ 
        action: 'pause', 
        minutes: mins, 
        seconds: secs, 
        totalSeconds: totalSeconds, 
        state: 'paused' 
      });
    }
  };

  const handleReset = () => {
    if (isProcessingRemoteAction.current) return;

    setMinutes(25);
    setSeconds(0);
    setTotalSeconds(25 * 60);
    setState('idle');
    if (room) {
      sendTimerSync({ 
        action: 'reset', 
        minutes: 25, 
        seconds: 0, 
        totalSeconds: 25 * 60, 
        state: 'idle' 
      });
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = state === 'idle' ? 0 : 100 - (totalSeconds / (25 * 60)) * 100;
  const isRunning = state === 'running';
  const isCompleted = state === 'completed';

  return (
    <div className="group relative rounded-xl bg-gradient-to-br from-white/80 to-rose-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-xl border border-rose-200/50 dark:border-rose-900/50 p-3 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-400/10 via-transparent to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <div className={`rounded-lg p-1.5 shadow-md transition-all ${
            isRunning ? 'bg-gradient-to-br from-rose-400 to-rose-600 animate-pulse' :
            isCompleted ? 'bg-gradient-to-br from-green-400 to-green-600' :
            'bg-gradient-to-br from-slate-400 to-slate-600'
          }`}>
            <Timer size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">Pomodoro Timer</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Shared</p>
          </div>
        </div>
        
        {/* Timer Display */}
        <div className="mb-2 text-center">
          <div className={`relative inline-block transition-all duration-500 ${
            isRunning ? 'scale-105' : 'scale-100'
          }`}>
            <div className={`text-3xl font-bold tabular-nums tracking-tight ${
              isCompleted ? 'text-green-500 dark:text-green-400' :
              isRunning ? 'text-rose-500 dark:text-rose-400' :
              'text-slate-600 dark:text-slate-400'
            }`}>
              {formatTime(minutes, seconds)}
            </div>
            {isRunning && (
              <div className="absolute -inset-1 bg-rose-500/20 rounded-full blur-lg animate-pulse"></div>
            )}
          </div>
          {isCompleted && (
            <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold animate-fadeIn mt-1">
              <CheckCircle size={14} />
              <span>Time's up! 🎉</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 shadow-inner">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              isCompleted ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
              isRunning ? 'bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600' :
              'bg-gradient-to-r from-slate-300 to-slate-400'
            } shadow-sm`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {state === 'running' ? (
            <button
              onClick={handlePause}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Pause size={14} />
              Pause
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={isCompleted}
            >
              <Play size={14} />
              {state === 'idle' ? 'Start' : 'Resume'}
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 p-2 text-slate-700 dark:text-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
