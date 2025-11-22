'use client';

import { useState, useEffect, useRef } from 'react';
import { Room, RemoteParticipant } from 'livekit-client';
import { Play, Pause, RotateCcw, Timer, CheckCircle, Coffee, SkipForward } from 'lucide-react';

interface PomodoroTimerProps {
  room: Room | null;
}

type TimerState = 'idle' | 'running' | 'paused' | 'completed';
type TimerMode = 'pomodoro' | 'break';

export function PomodoroTimer({ room }: PomodoroTimerProps) {
  // Pomodoro timer state
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [state, setState] = useState<TimerState>('idle');
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  
  // Break timer state
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [breakTotalSeconds, setBreakTotalSeconds] = useState(5 * 60);
  const [breakState, setBreakState] = useState<TimerState>('idle');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const breakIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(Date.now());
  const breakLastSyncRef = useRef<number>(Date.now());
  const isProcessingRemoteAction = useRef(false);
  
  // Break durations: 5 min short break, 15 min long break (after 4 Pomodoros)
  const SHORT_BREAK_SECONDS = 5 * 60;
  const LONG_BREAK_SECONDS = 15 * 60;

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
            setMode(data.mode || 'pomodoro');
            setCompletedPomodoros(data.completedPomodoros || 0);
            lastSyncRef.current = Date.now();
          } else if (data.action === 'start') {
            // Start the timer with the provided time
            setTotalSeconds(data.totalSeconds);
            setState('running');
            setMinutes(data.minutes);
            setSeconds(data.seconds);
            setMode(data.mode || 'pomodoro');
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
            setMode('pomodoro');
            setCompletedPomodoros(0);
            lastSyncRef.current = Date.now();
          } else if (data.action === 'startBreak') {
            // Start break timer
            setBreakTotalSeconds(data.breakTotalSeconds);
            setBreakState('running');
            setBreakMinutes(data.breakMinutes);
            setBreakSeconds(data.breakSeconds);
            setMode('break');
            setCompletedPomodoros(data.completedPomodoros || 0);
            breakLastSyncRef.current = Date.now();
          } else if (data.action === 'breakSync') {
            // Break timer sync
            setBreakTotalSeconds(data.breakTotalSeconds);
            setBreakState(data.breakState);
            setBreakMinutes(data.breakMinutes);
            setBreakSeconds(data.breakSeconds);
            breakLastSyncRef.current = Date.now();
          } else if (data.action === 'breakPause') {
            // Pause break
            setBreakTotalSeconds(data.breakTotalSeconds);
            setBreakState('paused');
            setBreakMinutes(data.breakMinutes);
            setBreakSeconds(data.breakSeconds);
            breakLastSyncRef.current = Date.now();
          } else if (data.action === 'skipBreak') {
            // Skip break and start new Pomodoro
            setMode('pomodoro');
            setBreakState('idle');
            setTotalSeconds(25 * 60);
            setMinutes(25);
            setSeconds(0);
            setState('idle');
            lastSyncRef.current = Date.now();
          } else if (data.action === 'breakComplete') {
            // Break completed, ready for next Pomodoro
            setMode('pomodoro');
            setBreakState('idle');
            setTotalSeconds(25 * 60);
            setMinutes(25);
            setSeconds(0);
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
    if (state === 'running' && totalSeconds > 0 && mode === 'pomodoro') {
      intervalRef.current = setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            setState('completed');
            // Increment completed Pomodoros
            const newCount = completedPomodoros + 1;
            setCompletedPomodoros(newCount);
            
            // Determine break duration (long break after every 4 Pomodoros)
            const isLongBreak = newCount % 4 === 0;
            const breakDuration = isLongBreak ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
            
            // Auto-start break timer
            const breakMins = Math.floor(breakDuration / 60);
            setBreakTotalSeconds(breakDuration);
            setBreakMinutes(breakMins);
            setBreakSeconds(0);
            setBreakState('running');
            setMode('break');
            
            // Notify everyone when timer completes and break starts
            if (room) {
              // Start break immediately
              sendTimerSync({
                action: 'startBreak',
                breakTotalSeconds: breakDuration,
                breakMinutes: breakMins,
                breakSeconds: 0,
                completedPomodoros: newCount
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
              state: 'running',
              mode: 'pomodoro',
              completedPomodoros
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
  }, [state, totalSeconds, room, mode, completedPomodoros]);

  // Break timer countdown logic
  useEffect(() => {
    if (breakState === 'running' && breakTotalSeconds > 0 && mode === 'break') {
      breakIntervalRef.current = setInterval(() => {
        setBreakTotalSeconds((prev) => {
          if (prev <= 1) {
            setBreakState('completed');
            setMode('pomodoro');
            // Reset Pomodoro timer for next session
            setTotalSeconds(25 * 60);
            setMinutes(25);
            setSeconds(0);
            setState('idle');
            
            // Notify everyone when break completes
            if (room) {
              sendTimerSync({
                action: 'breakComplete',
                completedPomodoros
              });
            }
            return 0;
          }
          const newTotal = prev - 1;
          const mins = Math.floor(newTotal / 60);
          const secs = newTotal % 60;
          setBreakMinutes(mins);
          setBreakSeconds(secs);
          
          // Sync every 5 seconds to keep everyone in sync
          const now = Date.now();
          if (room && now - breakLastSyncRef.current >= 5000) {
            sendTimerSync({
              action: 'breakSync',
              breakTotalSeconds: newTotal,
              breakMinutes: mins,
              breakSeconds: secs,
              breakState: 'running'
            });
            breakLastSyncRef.current = now;
          }
          return newTotal;
        });
      }, 1000);
    } else {
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
        breakIntervalRef.current = null;
      }
    }

    return () => {
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
      }
    };
  }, [breakState, breakTotalSeconds, room, mode, completedPomodoros]);

  // Update displayed time when totalSeconds changes
  useEffect(() => {
    setMinutes(Math.floor(totalSeconds / 60));
    setSeconds(totalSeconds % 60);
  }, [totalSeconds]);

  // Update displayed break time when breakTotalSeconds changes
  useEffect(() => {
    setBreakMinutes(Math.floor(breakTotalSeconds / 60));
    setBreakSeconds(breakTotalSeconds % 60);
  }, [breakTotalSeconds]);

  const sendTimerSync = (data: any) => {
    if (!room || !room.localParticipant) return;
    const encoder = new TextEncoder();
    const message = {
      type: 'pomodoro',
      senderId: room.localParticipant.identity,
      mode: mode,
      completedPomodoros: completedPomodoros,
      ...data
    };
    room.localParticipant.publishData(
      encoder.encode(JSON.stringify(message)),
      { reliable: true }
    );
  };

  const handleStart = () => {
    if (isProcessingRemoteAction.current) return;

    if (state === 'paused') {
      // Resume from current time
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setState('running');
      setMode('pomodoro');
      if (room) {
        sendTimerSync({ 
          action: 'start', 
          minutes: mins, 
          seconds: secs, 
          totalSeconds: totalSeconds, 
          state: 'running',
          mode: 'pomodoro'
        });
      }
    } else if (state === 'idle') {
      // Start fresh 25-minute timer
      setTotalSeconds(25 * 60);
      setMinutes(25);
      setSeconds(0);
      setState('running');
      setMode('pomodoro');
      if (room) {
        sendTimerSync({ 
          action: 'start', 
          minutes: 25, 
          seconds: 0, 
          totalSeconds: 25 * 60, 
          state: 'running',
          mode: 'pomodoro'
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
    setMode('pomodoro');
    setCompletedPomodoros(0);
    setBreakState('idle');
    setBreakTotalSeconds(SHORT_BREAK_SECONDS);
    if (room) {
      sendTimerSync({ 
        action: 'reset', 
        minutes: 25, 
        seconds: 0, 
        totalSeconds: 25 * 60, 
        state: 'idle',
        mode: 'pomodoro',
        completedPomodoros: 0
      });
    }
  };

  // Break timer handlers
  const handleBreakStart = () => {
    if (isProcessingRemoteAction.current) return;
    
    setBreakState('running');
    if (room) {
      sendTimerSync({
        action: 'startBreak',
        breakTotalSeconds: breakTotalSeconds,
        breakMinutes: breakMinutes,
        breakSeconds: breakSeconds,
        completedPomodoros
      });
    }
  };

  const handleBreakPause = () => {
    if (isProcessingRemoteAction.current) return;
    
    setBreakState('paused');
    if (room) {
      sendTimerSync({
        action: 'breakPause',
        breakTotalSeconds: breakTotalSeconds,
        breakMinutes: breakMinutes,
        breakSeconds: breakSeconds
      });
    }
  };

  const handleSkipBreak = () => {
    if (isProcessingRemoteAction.current) return;
    
    setMode('pomodoro');
    setBreakState('idle');
    setTotalSeconds(25 * 60);
    setMinutes(25);
    setSeconds(0);
    setState('idle');
    if (room) {
      sendTimerSync({
        action: 'skipBreak',
        completedPomodoros
      });
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'pomodoro' 
    ? (state === 'idle' ? 0 : 100 - (totalSeconds / (25 * 60)) * 100)
    : (breakState === 'idle' ? 0 : 100 - (breakTotalSeconds / (breakTotalSeconds === LONG_BREAK_SECONDS ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS)) * 100);
  
  const isRunning = mode === 'pomodoro' ? state === 'running' : breakState === 'running';
  const isCompleted = mode === 'pomodoro' ? state === 'completed' : breakState === 'completed';
  const isLongBreak = breakTotalSeconds === LONG_BREAK_SECONDS;

  // Show break timer UI when in break mode
  if (mode === 'break') {
    const initialBreakDuration = isLongBreak ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
    const breakProgress = breakState === 'idle' ? 0 : 100 - (breakTotalSeconds / initialBreakDuration) * 100;
    const breakIsRunning = breakState === 'running';
    const breakIsCompleted = breakState === 'completed';

    return (
      <div className="group relative rounded-xl bg-gradient-to-br from-white/80 to-teal-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-xl border border-teal-200/50 dark:border-teal-900/50 p-3 shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400/10 via-transparent to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative">
          {/* Header */}
          <div className="mb-3 flex items-center gap-2">
            <div className={`rounded-lg p-1.5 shadow-md transition-all ${
              breakIsRunning ? 'bg-gradient-to-br from-teal-400 to-teal-600 animate-pulse' :
              breakIsCompleted ? 'bg-gradient-to-br from-green-400 to-green-600' :
              'bg-gradient-to-br from-slate-400 to-slate-600'
            }`}>
              <Coffee size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                {isLongBreak ? 'Long Break' : 'Short Break'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completedPomodoros} Pomodoro{completedPomodoros !== 1 ? 's' : ''} completed
              </p>
            </div>
          </div>
          
          {/* Timer Display */}
          <div className="mb-2 text-center">
            <div className={`relative inline-block transition-all duration-500 ${
              breakIsRunning ? 'scale-105' : 'scale-100'
            }`}>
              <div className={`text-3xl font-bold tabular-nums tracking-tight ${
                breakIsCompleted ? 'text-green-500 dark:text-green-400' :
                breakIsRunning ? 'text-teal-500 dark:text-teal-400' :
                'text-slate-600 dark:text-slate-400'
              }`}>
                {formatTime(breakMinutes, breakSeconds)}
              </div>
              {breakIsRunning && (
                <div className="absolute -inset-1 bg-teal-500/20 rounded-full blur-lg animate-pulse"></div>
              )}
            </div>
            {breakIsCompleted && (
              <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold animate-fadeIn mt-1">
                <CheckCircle size={14} />
                <span>Break over! Ready to study? ☕</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 shadow-inner">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                breakIsCompleted ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                breakIsRunning ? 'bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600' :
                'bg-gradient-to-r from-slate-300 to-slate-400'
              } shadow-sm`}
              style={{ width: `${breakProgress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {breakState === 'running' ? (
              <button
                onClick={handleBreakPause}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Pause size={14} />
                Pause
              </button>
            ) : breakState === 'paused' ? (
              <button
                onClick={handleBreakStart}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Play size={14} />
                Resume
              </button>
            ) : (
              <button
                onClick={handleBreakStart}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-400 to-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Play size={14} />
                Start Break
              </button>
            )}
            <button
              onClick={handleSkipBreak}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 px-3 py-2 text-slate-700 dark:text-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              title="Skip break and start next Pomodoro"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pomodoro timer UI
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
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completedPomodoros > 0 && `${completedPomodoros} completed`}
            </p>
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
