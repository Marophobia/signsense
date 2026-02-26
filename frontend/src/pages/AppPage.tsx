import { Link } from 'react-router-dom'
import { StreamVideo, StreamCall, ParticipantsAudio, useCallStateHooks } from '@stream-io/video-react-sdk'
import { SignSenseLogo } from '@/components/sign-sense-logo'
import { VideoPanel } from '@/components/video-panel'
import { GestureDisplay } from '@/components/gesture-display'
import { TranscriptPanel } from '@/components/transcript-panel'
import { GestureLog } from '@/components/gesture-log'
import { PipelineStatusComponent } from '@/components/pipeline-status'
import { SessionControls } from '@/components/session-controls'
import { useSignSense } from '@/hooks/use-sign-sense'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { useState } from 'react'

/**
 * Renders hidden <audio> elements for all remote participants (the SignSense agent).
 * Must be rendered inside a <StreamCall> context so the hook works.
 * Without this, the agent's ElevenLabs TTS audio is never played.
 */
function AgentAudio() {
  const { useRemoteParticipants } = useCallStateHooks()
  const remoteParticipants = useRemoteParticipants()
  return <ParticipantsAudio participants={remoteParticipants} />
}

export function AppPage() {
  const {
    isActive,
    currentGesture,
    gestureHistory,
    transcriptHistory,
    pipelineStatus,
    error,
    isLoading,
    streamClient,
    streamCall,
    startSession,
    stopSession,
    clearTranscript,
  } = useSignSense()

  const [dismissError, setDismissError] = useState(false)

  const pageContent = (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
              aria-label="Back to home"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
              <SignSenseLogo size="sm" className="text-accent" />
              <span className="font-syne font-semibold text-sm">SignSense</span>
            </Link>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-status-ping' : 'bg-muted-foreground'}`}
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-muted-foreground">
                {isActive ? 'Session Active' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && !dismissError && (
        <div className="px-4 sm:px-6 lg:px-8 py-3 bg-destructive/20 border-b border-destructive/30 flex items-start gap-3 animate-sentence-slide-up">
          <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <button
            onClick={() => setDismissError(true)}
            className="text-xs text-destructive hover:opacity-75 shrink-0 font-medium"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
        <div className="h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Panel - Full width on mobile, left 2/3 on desktop */}
          <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
            <div className="flex-1 min-h-[300px] sm:min-h-[400px] lg:min-h-0">
              <VideoPanel isActive={isActive} />
            </div>
            <div className="min-h-[120px]">
              <GestureDisplay gesture={currentGesture} />
            </div>
          </div>

          {/* Right Panel - Transcript, Stats, Controls */}
          <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
            <div className="flex-1 min-h-[200px] md:min-h-[300px] lg:min-h-0">
              <TranscriptPanel transcriptHistory={transcriptHistory} onClear={clearTranscript} />
            </div>
            <div className="min-h-[140px]">
              <GestureLog gestures={gestureHistory} />
            </div>
            <div className="min-h-[140px]">
              <PipelineStatusComponent status={pipelineStatus} />
            </div>
            <div className="min-h-[130px]">
              <SessionControls
                isActive={isActive}
                isLoading={isLoading}
                onStart={startSession}
                onStop={stopSession}
                onClear={clearTranscript}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Footer Info */}
      <footer className="lg:hidden border-t border-border/50 px-4 sm:px-6 py-3 text-center text-xs text-muted-foreground bg-muted/5">
        <p>Ensure good lighting and clear hand visibility for optimal gesture recognition</p>
      </footer>
    </div>
  )

  // When a Stream session is active, wrap with SDK providers so:
  //   1. <ParticipantsAudio> can render hidden <audio> elements for the agent's TTS output
  //   2. Any child component can use Stream React hooks if needed
  if (streamClient && streamCall) {
    return (
      <StreamVideo client={streamClient}>
        <StreamCall call={streamCall}>
          {/* AgentAudio mounts hidden <audio> elements for remote participants.
              Without this, the agent's ElevenLabs TTS audio will never be heard. */}
          <AgentAudio />
          {pageContent}
        </StreamCall>
      </StreamVideo>
    )
  }

  return pageContent
}
