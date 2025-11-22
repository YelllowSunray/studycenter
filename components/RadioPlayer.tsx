'use client';

import { useState, useEffect, useRef } from 'react';
import { Room, RemoteParticipant } from 'livekit-client';
import { Play, Pause, Volume2, Radio, Music2 } from 'lucide-react';

interface RadioPlayerProps {
  room: Room | null;
}

// Radio stations from Zeno.fm, 181.fm, and smoothjazz.com.pl
const RADIO_STATIONS = [
  { 
    name: 'Lofi Girl Radio', 
    url: 'http://stream.zeno.fm/f3wvbbqmdg8uv', 
    icon: '🎧', 
    color: 'from-purple-400 to-purple-600' 
  },
  { 
    name: 'Classical', 
    url: 'http://listen.181fm.com/181-classical_128k.mp3', 
    icon: '🎹', 
    color: 'from-blue-400 to-blue-600' 
  },
  { 
    name: 'Pop (Top 40)', 
    url: 'http://listen.181fm.com/181-top40_128k.mp3', 
    icon: '🎵', 
    color: 'from-pink-400 to-pink-600' 
  },
  { 
    name: 'Classic Rock', 
    url: 'http://listen.181fm.com/181-classicrock_128k.mp3', 
    icon: '🎸', 
    color: 'from-orange-400 to-orange-600' 
  },
  { 
    name: 'Electronic Dance', 
    url: 'http://listen.181fm.com/181-energy_128k.mp3', 
    icon: '🎛️', 
    color: 'from-cyan-400 to-cyan-600' 
  },
  { 
    name: 'Hip Hop Beats', 
    url: 'http://listen.181fm.com/181-hiphop_128k.mp3', 
    icon: '🎤', 
    color: 'from-red-400 to-red-600' 
  },
  { 
    name: 'Ambient Chill', 
    url: 'http://listen.181fm.com/181-chill_128k.mp3', 
    icon: '🌿', 
    color: 'from-green-400 to-green-600' 
  },
  { 
    name: 'Smooth Jazz 24/7', 
    url: 'http://smoothjazz.com.pl:8000/stream', 
    icon: '🎺', 
    color: 'from-teal-400 to-teal-600' 
  },
];

export function RadioPlayer({ room }: RadioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(RADIO_STATIONS[0]);
  const [volume, setVolume] = useState(50);
  const [isHost, setIsHost] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const hostRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRemoteAction = useRef(false);

  useEffect(() => {
    if (!room) return;

    // Determine if this participant is the host (first to join)
    if (!room.participants || room.participants.size === 0) {
      hostRef.current = true;
      setIsHost(true);
    } else {
      // Check if we're the first participant (host)
      let isFirst = true;
      room.participants.forEach((participant) => {
        if (participant.identity && room.localParticipant?.identity && 
            participant.identity < room.localParticipant.identity) {
          isFirst = false;
        }
      });
      hostRef.current = isFirst;
      setIsHost(isFirst);
    }

    // Listen for radio control messages from other participants
    const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'radio') {
          // Prevent processing our own messages to avoid loops
          if (data.senderId === room.localParticipant?.identity) {
            return;
          }

          isProcessingRemoteAction.current = true;

          if (data.action === 'play') {
            setCurrentStation(data.station);
            setIsPlaying(true);
            if (data.volume !== undefined) {
              setVolume(data.volume);
            }
            // Play audio
            if (audioRef.current) {
              audioRef.current.src = data.station.url;
              audioRef.current.volume = (data.volume || volume) / 100;
              setStreamError(null);
              audioRef.current.play().catch(err => {
                console.error('Error playing audio:', err);
                setIsPlaying(false);
                setStreamError(`Unable to play ${data.station.name}. Try another station.`);
              });
            }
          } else if (data.action === 'pause') {
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.pause();
            }
          } else if (data.action === 'change') {
            setCurrentStation(data.station);
            if (data.volume !== undefined) {
              setVolume(data.volume);
            }
            // Use the isPlaying state from the message
            if (data.isPlaying !== undefined) {
              setIsPlaying(data.isPlaying);
              if (audioRef.current) {
                if (data.isPlaying) {
                  audioRef.current.src = data.station.url;
                  audioRef.current.volume = (data.volume || volume) / 100;
                  setStreamError(null);
                  audioRef.current.play().catch(err => {
                    console.error('Error playing audio:', err);
                    setIsPlaying(false);
                    setStreamError(`Unable to play ${data.station.name}. Try another station.`);
                  });
                } else {
                  audioRef.current.pause();
                }
              }
            }
          } else if (data.action === 'volume') {
            setVolume(data.volume);
            if (audioRef.current) {
              audioRef.current.volume = data.volume / 100;
            }
          } else if (data.action === 'sync') {
            // Full sync - update everything
            setCurrentStation(data.station);
            setIsPlaying(data.isPlaying);
            setVolume(data.volume || 50);
            if (audioRef.current) {
              audioRef.current.src = data.station.url;
              audioRef.current.volume = (data.volume || 50) / 100;
              setStreamError(null);
              if (data.isPlaying) {
                audioRef.current.play().catch(err => {
                  console.error('Error playing audio:', err);
                  setIsPlaying(false);
                  setStreamError(`Unable to play ${data.station.name}. Try another station.`);
                });
              } else {
                audioRef.current.pause();
              }
            }
          } else if (data.action === 'requestSync' && isHost) {
            // Handle sync requests from new participants
            const encoder = new TextEncoder();
            room.localParticipant?.publishData(
              encoder.encode(JSON.stringify({ 
                type: 'radio',
                action: 'sync',
                senderId: room.localParticipant.identity,
                station: currentStation,
                isPlaying,
                volume
              })),
              { reliable: true }
            );
            return; // Don't process this as a remote action
          }

          // Reset flag after a short delay
          setTimeout(() => {
            isProcessingRemoteAction.current = false;
          }, 100);
        }
      } catch (error) {
        console.error('Error parsing radio data:', error);
      }
    };

    room.on('dataReceived', handleData);

    // Request current state when joining (if not host)
    if (!hostRef.current && room.localParticipant) {
      const encoder = new TextEncoder();
      room.localParticipant.publishData(
        encoder.encode(JSON.stringify({ 
          type: 'radio', 
          action: 'requestSync',
          senderId: room.localParticipant.identity 
        })),
        { reliable: true }
      );
    }

    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room, isHost, currentStation, isPlaying, volume]);

  const sendRadioControl = (action: string, data?: any) => {
    if (!room || !isHost || !room.localParticipant || isProcessingRemoteAction.current) return;
    const encoder = new TextEncoder();
    const message = {
      type: 'radio',
      action,
      senderId: room.localParticipant.identity,
      ...data
    };
    room.localParticipant.publishData(
      encoder.encode(JSON.stringify(message)),
      { reliable: true }
    );
  };

  const handlePlayPause = () => {
    if (!isHost) return;

    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      sendRadioControl('pause');
    } else {
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = currentStation.url;
        audioRef.current.volume = volume / 100;
        setStreamError(null);
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
          setIsPlaying(false);
          setStreamError(`Unable to play ${currentStation.name}. The stream may be unavailable or blocked. Try another station.`);
        });
      }
      sendRadioControl('play', { station: currentStation, volume });
    }
  };

  const handleStationChange = (station: typeof RADIO_STATIONS[0]) => {
    if (!isHost) return;

    setCurrentStation(station);
    // If currently playing, switch to new station
    if (isPlaying && audioRef.current) {
      audioRef.current.src = station.url;
      audioRef.current.volume = volume / 100;
      setStreamError(null);
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
        setStreamError(`Unable to play ${station.name}. The stream may be unavailable. Try another station.`);
      });
      sendRadioControl('change', { station, volume, isPlaying: true });
    } else {
      sendRadioControl('change', { station, volume, isPlaying: false });
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!isHost) return;

    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    sendRadioControl('volume', { volume: newVolume });
  };

  const currentStationData = RADIO_STATIONS.find(s => s.name === currentStation.name) || RADIO_STATIONS[0];

  return (
    <div className="group relative rounded-xl bg-gradient-to-br from-white/80 to-purple-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-xl border border-purple-200/50 dark:border-purple-900/50 p-3 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-400/10 via-transparent to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <div className={`rounded-lg p-1.5 shadow-md transition-all ${
            isPlaying ? `bg-gradient-to-br ${currentStationData.color} animate-pulse` :
            'bg-gradient-to-br from-slate-400 to-slate-600'
          }`}>
            <Radio size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">Shared Radio</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isHost ? 'You control' : 'Listening'}
            </p>
          </div>
        </div>

        {/* Play/Pause and Station Info */}
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2 border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={handlePlayPause}
            disabled={!isHost}
            className={`rounded-lg p-2 shadow-md transition-all ${
              isHost 
                ? `bg-gradient-to-br ${currentStationData.color} text-white hover:scale-110 active:scale-95 cursor-pointer` 
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-lg">{currentStationData.icon}</span>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{currentStation.name}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Volume2 size={12} className="text-slate-500 dark:text-slate-400" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                disabled={!isHost}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono w-8">{volume}%</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {streamError && (
          <div className="mb-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2">
            <p className="text-xs text-red-600 dark:text-red-400">{streamError}</p>
          </div>
        )}

        {/* Station selector */}
        <div className="grid grid-cols-2 gap-1.5">
          {RADIO_STATIONS.map((station) => {
            const isSelected = currentStation.name === station.name;
            return (
              <button
                key={station.name}
                onClick={() => handleStationChange(station)}
                disabled={!isHost}
                className={`group/station relative rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? `bg-gradient-to-br ${station.color} text-white shadow-md scale-105`
                    : isHost
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm">{station.icon}</span>
                  <span className="truncate">{station.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Hidden audio element for streaming */}
        <audio
          ref={audioRef}
          preload="none"
          crossOrigin="anonymous"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
