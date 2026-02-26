import { useState, useCallback, useRef, useEffect } from 'react'
import { StreamVideoClient, type Call as StreamCall } from '@stream-io/video-react-sdk'
import { createCall, startAgent, stopAgent, openEventStream, type Call, type EventMessage } from '@/lib/api'

export interface GestureData {
  name: string
  confidence: number
  timestamp: number
}

export interface PipelineStatus {
  camera: 'connected' | 'disconnected' | 'error'
  gesture: 'processing' | 'ready' | 'error'
  transcript: 'processing' | 'ready' | 'error'
}

export interface TranscriptEntry {
  id: string
  text: string
  timestamp: number
  isPartial: boolean
}

export interface UseSignSenseReturn {
  isActive: boolean
  currentGesture: GestureData | null
  gestureHistory: GestureData[]
  transcriptHistory: TranscriptEntry[]
  pipelineStatus: PipelineStatus
  error: string | null
  isLoading: boolean
  // Stream Video context — needed by AppPage to render providers for remote audio
  streamClient: StreamVideoClient | null
  streamCall: StreamCall | null
  startSession: () => Promise<void>
  stopSession: () => Promise<void>
  clearTranscript: () => void
}

const defaultPipelineStatus: PipelineStatus = {
  camera: 'disconnected',
  gesture: 'ready',
  transcript: 'ready',
}

const MAX_GESTURE_HISTORY = 20
// How long the status indicator stays in 'processing' after an event
const GESTURE_STATUS_RESET_MS = 2000
const TRANSCRIPT_STATUS_RESET_MS = 3000

export const useSignSense = (): UseSignSenseReturn => {
  const [isActive, setIsActive] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<GestureData | null>(null)
  const [gestureHistory, setGestureHistory] = useState<GestureData[]>([])
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([])
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(defaultPipelineStatus)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Expose as state so AppPage can use them as <StreamVideo> / <StreamCall> providers
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null)
  const [streamCall, setStreamCall] = useState<StreamCall | null>(null)

  // Internal refs for cleanup (avoid stale closure issues in async flows)
  const callRef = useRef<Call | null>(null)
  const streamClientRef = useRef<StreamVideoClient | null>(null)
  const streamCallRef = useRef<StreamCall | null>(null)
  const closeStreamRef = useRef<(() => void) | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Debounce timers for status indicators — reset to 'ready' after brief 'processing' flash
  const gestureStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transcriptStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMessage = useCallback((message: EventMessage) => {
    switch (message.type) {
      case 'gesture': {
        const gesture = message.gesture ?? (message.data as { name?: string })?.name ?? 'Unknown'
        const confidence = message.confidence ?? (message.data as { confidence?: number })?.confidence ?? 0
        const timestamp = message.timestamp ?? Date.now()

        // Silently drop [UNCLEAR] — don't pollute the display
        if (gesture === '[UNCLEAR]') break

        const gestureData: GestureData = { name: gesture, confidence, timestamp }
        setCurrentGesture(gestureData)
        setGestureHistory((prev) => [...prev.slice(-(MAX_GESTURE_HISTORY - 1)), gestureData])

        // Flash 'processing', then reset to 'ready' after a brief window
        setPipelineStatus((prev) => ({ ...prev, gesture: 'processing' }))
        if (gestureStatusTimerRef.current) clearTimeout(gestureStatusTimerRef.current)
        gestureStatusTimerRef.current = setTimeout(() => {
          setPipelineStatus((prev) => ({ ...prev, gesture: 'ready' }))
        }, GESTURE_STATUS_RESET_MS)
        break
      }

      case 'transcript': {
        const text =
          message.sentence ??
          (message.data as { text?: string })?.text ??
          ''
        const isPartial = (message.data as { is_partial?: boolean })?.is_partial ?? false
        if (text) {
          const entry: TranscriptEntry = {
            id: `${Date.now()}-${Math.random()}`,
            text,
            timestamp: message.timestamp ?? Date.now(),
            isPartial,
          }
          setTranscriptHistory((prev) => [...prev, entry])

          // Flash 'processing', then reset to 'ready'
          setPipelineStatus((prev) => ({ ...prev, transcript: 'processing' }))
          if (transcriptStatusTimerRef.current) clearTimeout(transcriptStatusTimerRef.current)
          transcriptStatusTimerRef.current = setTimeout(() => {
            setPipelineStatus((prev) => ({ ...prev, transcript: 'ready' }))
          }, TRANSCRIPT_STATUS_RESET_MS)
        }
        break
      }

      case 'status':
        if (message.data && typeof message.data === 'object') {
          setPipelineStatus((prev) => ({
            ...prev,
            ...(message.data as Partial<PipelineStatus>),
          }))
        }
        break

      case 'error':
        if (message.data && typeof message.data === 'object') {
          const errorData = message.data as { message: string }
          setError(errorData.message)
          setPipelineStatus((prev) => ({
            ...prev,
            gesture: 'error',
            transcript: 'error',
          }))
        }
        break

      case 'ping':
        break

      default:
        break
    }
  }, [])

  const handleStreamError = useCallback(() => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts && isActive) {
      reconnectAttemptsRef.current += 1
      console.log(
        `[SignSense] Event stream error. Reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
      )
      const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000)
      setTimeout(() => {
        if (isActive && callRef.current) {
          openEventStreamWithReconnect(callRef.current.call_id)
        }
      }, backoffDelay)
    } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError('Event stream reconnection failed')
      setIsActive(false)
    }
  }, [isActive])

  const handleStreamClose = useCallback(() => {
    console.log('[SignSense] Event stream closed')
  }, [])

  const openEventStreamWithReconnect = useCallback(
    (callId: string) => {
      if (closeStreamRef.current) {
        closeStreamRef.current()
      }
      closeStreamRef.current = openEventStream(
        callId,
        handleMessage,
        handleStreamError,
        handleStreamClose
      )
    },
    [handleMessage, handleStreamError, handleStreamClose]
  )

  const startSession = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      reconnectAttemptsRef.current = 0

      // 1. Create call — backend mints a Stream token for this exact user_id
      const userId = `user_${Date.now()}`
      const callData = await createCall(userId, 'User')
      callRef.current = callData

      // 2. Connect to Stream Video with the same user_id the token was minted for
      const client = new StreamVideoClient({
        apiKey: callData.api_key,
        user: { id: userId, name: 'User' },
        token: callData.token,
      })
      streamClientRef.current = client

      const call = client.call('default', callData.call_id)
      streamCallRef.current = call

      // Join the Stream call
      await call.join({ create: true })

      // Explicitly disable microphone — we only want to publish video (sign language)
      // This also prevents the browser from prompting for audio permissions
      try {
        await call.microphone.disable()
      } catch {
        // Ignore — mic might already be disabled
      }

      // Enable camera so the backend agent receives the video feed
      await call.camera.enable()

      // 3. Expose client + call as state so AppPage can wrap with Stream providers
      //    (required for ParticipantsAudio to play the agent's TTS output)
      setStreamClient(client)
      setStreamCall(call)

      // 4. Start the backend Vision Agent
      await startAgent(callData.call_id)

      // Start with 'ready' — status indicators flash briefly when events arrive
      setPipelineStatus({
        camera: 'connected',
        gesture: 'ready',
        transcript: 'ready',
      })
      setIsActive(true)

      // 5. Open SSE for gesture + transcript events
      openEventStreamWithReconnect(callData.call_id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session'
      setError(errorMessage)
      setIsActive(false)
      setStreamClient(null)
      setStreamCall(null)

      if (streamCallRef.current) {
        try { await streamCallRef.current.leave() } catch { /* ignore */ }
        streamCallRef.current = null
      }
      if (streamClientRef.current) {
        try { await streamClientRef.current.disconnectUser() } catch { /* ignore */ }
        streamClientRef.current = null
      }
    } finally {
      setIsLoading(false)
    }
  }, [openEventStreamWithReconnect])

  const stopSession = useCallback(async () => {
    try {
      setIsLoading(true)

      // Clear status debounce timers
      if (gestureStatusTimerRef.current) clearTimeout(gestureStatusTimerRef.current)
      if (transcriptStatusTimerRef.current) clearTimeout(transcriptStatusTimerRef.current)

      // Close SSE stream
      if (closeStreamRef.current) {
        closeStreamRef.current()
        closeStreamRef.current = null
      }

      // Stop backend agent
      if (callRef.current) {
        await stopAgent(callRef.current.call_id)
        callRef.current = null
      }

      // Leave Stream Video call and disconnect client
      if (streamCallRef.current) {
        try {
          await streamCallRef.current.camera.disable()
          await streamCallRef.current.leave()
        } catch { /* ignore */ }
        streamCallRef.current = null
      }
      if (streamClientRef.current) {
        try { await streamClientRef.current.disconnectUser() } catch { /* ignore */ }
        streamClientRef.current = null
      }

      // Clear React state — this unmounts the Stream providers in AppPage
      setStreamClient(null)
      setStreamCall(null)
      setIsActive(false)
      setPipelineStatus(defaultPipelineStatus)
      setCurrentGesture(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop session'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscriptHistory([])
    setGestureHistory([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gestureStatusTimerRef.current) clearTimeout(gestureStatusTimerRef.current)
      if (transcriptStatusTimerRef.current) clearTimeout(transcriptStatusTimerRef.current)
      if (closeStreamRef.current) closeStreamRef.current()
      if (streamCallRef.current) streamCallRef.current.leave().catch(() => {})
      if (streamClientRef.current) streamClientRef.current.disconnectUser().catch(() => {})
    }
  }, [])

  return {
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
  }
}
