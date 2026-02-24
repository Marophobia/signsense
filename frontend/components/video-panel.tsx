import { type FC, useState, useEffect, useRef } from 'react'
import { Video, VideoOff } from 'lucide-react'

function VideoPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/20 rounded-lg border border-border/50">
      <Video size={48} className="text-muted-foreground opacity-50 mb-3" aria-hidden="true" />
      <p className="text-muted-foreground text-sm">Video Stream</p>
      <p className="text-muted-foreground text-xs mt-1">Requesting camera access...</p>
    </div>
  )
}

function CameraErrorPlaceholder({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/20 rounded-lg border border-destructive/30">
      <VideoOff size={48} className="text-destructive/70 mb-3" aria-hidden="true" />
      <p className="text-destructive text-sm font-medium">Camera error</p>
      <p className="text-muted-foreground text-xs mt-1 text-center px-4">{error}</p>
    </div>
  )
}

interface VideoPanelProps {
  isActive: boolean
  className?: string
}

export const VideoPanel: FC<VideoPanelProps> = ({ isActive, className = '' }) => {
  const [mounted, setMounted] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Camera is on as soon as the panel mounts — user can adjust position before starting session
  useEffect(() => {
    if (!mounted) return

    let cancelled = false
    let mediaStream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((ms) => {
        if (cancelled) {
          ms.getTracks().forEach((t) => t.stop())
          return
        }
        mediaStream = ms
        setStream(ms)
        setCameraError(null)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setCameraError(err.message ?? 'Could not access camera')
        }
      })

    return () => {
      cancelled = true
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop())
      }
      setStream(null)
    }
  }, [mounted])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      className={`relative w-full h-full rounded-lg border border-border overflow-hidden bg-background/50 ${className}`}
      role="region"
      aria-label="Video stream"
    >
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />

      {/* Video Stream Container — camera is always on so user can adjust position before starting */}
      <div className="absolute inset-0 flex items-center justify-center">
        {!mounted ? (
          <VideoPlaceholder />
        ) : cameraError ? (
          <CameraErrorPlaceholder error={cameraError} />
        ) : stream ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              aria-label="Your camera feed for sign language"
            />
            {!isActive && (
              <div className="absolute bottom-4 left-4 right-4 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-border/50 text-center pointer-events-none z-10">
                <p className="text-muted-foreground text-sm">Position yourself, then click Start Session</p>
              </div>
            )}
          </>
        ) : (
          <VideoPlaceholder />
        )}
      </div>

      {/* Signal Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-primary/30 z-20">
        <div
          className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-status-ping' : 'bg-muted-foreground'}`}
          aria-hidden="true"
        />
        <span className="text-xs text-foreground font-medium">{isActive ? 'Live' : 'Idle'}</span>
      </div>
    </div>
  )
}
