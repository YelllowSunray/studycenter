'use client';

import { useState } from 'react';
import { StudyRoom } from '@/components/StudyRoom';
import { GraduationCap, Users, Video, Sparkles } from 'lucide-react';

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() && participantName.trim()) {
      setJoined(true);
    }
  };

  if (joined) {
    return <StudyRoom roomName={roomName} participantName={participantName} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50/30 to-purple-50/30 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl animate-pulse-slow dark:bg-purple-900/20"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl animate-pulse-slow dark:bg-rose-900/20" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl animate-pulse-slow dark:bg-teal-900/20" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative w-full max-w-lg animate-fadeIn">
        <div className="rounded-3xl bg-white/80 backdrop-blur-xl shadow-2xl border border-white/20 p-8 dark:bg-slate-900/80 dark:border-slate-700/50">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-rose-400 to-teal-400 rounded-full blur-xl opacity-50"></div>
                <div className="relative rounded-full bg-gradient-to-br from-purple-500 via-rose-500 to-teal-500 p-5 shadow-lg">
                  <GraduationCap size={48} className="text-white drop-shadow-md" />
                </div>
              </div>
            </div>
            <h1 className="mb-3 bg-gradient-to-r from-purple-600 via-rose-600 to-teal-600 bg-clip-text text-4xl font-bold text-transparent dark:from-purple-400 dark:via-rose-400 dark:to-teal-400">
              Study Center
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Join your friends for focused, beautiful study sessions
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="participantName"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Your Name
              </label>
              <input
                id="participantName"
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 dark:focus:ring-purple-400/50 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="roomName"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter or create room name"
                required
                className="w-full rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 dark:focus:ring-purple-400/50 shadow-sm"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share this room name with your friends to join the same session
              </p>
            </div>

            <button
              type="submit"
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-rose-500 to-teal-500 p-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              <span className="relative flex items-center justify-center gap-2">
                <Video size={20} className="transition-transform group-hover:scale-110" />
                Join Study Room
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </form>

          {/* Features */}
          <div className="mt-10 space-y-4 rounded-2xl bg-gradient-to-br from-purple-50/50 to-rose-50/50 dark:from-purple-950/30 dark:to-rose-950/30 p-6 border border-purple-100/50 dark:border-purple-900/50">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 p-2.5 shadow-md">
                <Users size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Group Video Calls</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Crystal-clear video and audio with your study group</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 p-2.5 shadow-md">
                <GraduationCap size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Shared Tools</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Synchronized Pomodoro timer, ambient music, and collaborative documents</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 p-2.5 shadow-md">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Beautiful Design</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Calm, focused interface designed for productive studying</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
