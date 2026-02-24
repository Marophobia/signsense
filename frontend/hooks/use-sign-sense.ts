import { useState, useCallback, useRef, useEffect } from 'react'
import {
  createCall,
  startAgent,
  stopAgent,
  openEventStream,
  type Call,
  type EventMessage,
} from '@/lib/api'

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
  transcriptHistory: TranscriptEntry[]
  pipelineStatus: PipelineStatus
  error: string | null
  isLoading: boolean
  startSession: () => Promise<void>
  stopSession: () => Promise<void>
  clearTranscript: () => void
}

const defaultPipelineStatus: PipelineStatus = {
  camera: 'disconnected',
  gesture: 'ready',
  transcript: 'ready',
}

export const useSignSense = (): UseSignSenseReturn => {
  const [isActive, setIsActive] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<GestureData | null>(null)
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([])
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(defaultPipelineStatus)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const callRef = useRef<Call | null>(null)
  const closeStreamRef = useRef<(() => void) | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const handleMessage = useCallback((message: EventMessage) => {
    switch (message.type) {
      case 'gesture': {
        // Backend sends: { type: "gesture", gesture: "HELLO", confidence: 0.91 } (top-level)
        const gesture = message.gesture ?? (message.data as { name?: string })?.name ?? 'Unknown'
        const confidence = message.confidence ?? (message.data as { confidence?: number })?.confidence ?? 0
        const timestamp = message.timestamp ?? (message.data as { timestamp?: number })?.timestamp ?? Date.now()
        setCurrentGesture({ name: gesture, confidence, timestamp })
        break
      }

      case 'transcript': {
        // Backend sends: { type: "transcript", sentence: "...", timestamp: ... }
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

      default:
        console.log('[v0] Received unknown message type:', message.type)
    }
  }, [])

  const handleStreamError = useCallback(() => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts && isActive) {
      reconnectAttemptsRef.current += 1
      console.log(
        `[v0] Event stream error. Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
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
    console.log('[v0] Event stream closed')
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

      const call = await createCall()
      callRef.current = call

      await startAgent(call.call_id)

      setPipelineStatus({
        camera: 'connected',
        gesture: 'processing',
        transcript: 'processing',
      })

      setIsActive(true)
      openEventStreamWithReconnect(call.call_id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session'
      setError(errorMessage)
      setIsActive(false)
    } finally {
      setIsLoading(false)
    }
  }, [openEventStreamWithReconnect])

  const stopSession = useCallback(async () => {
    try {
      setIsLoading(true)

      if (closeStreamRef.current) {
        closeStreamRef.current()
        closeStreamRef.current = null
      }

      if (callRef.current) {
        await stopAgent(callRef.current.call_id)
      }

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
  }, [])

  useEffect(() => {
    return () => {
      if (closeStreamRef.current) {
        closeStreamRef.current()
      }
    }
  }, [])

  return {
    isActive,
    currentGesture,
    transcriptHistory,
    pipelineStatus,
    error,
    isLoading,
    startSession,
    stopSession,
    clearTranscript,
  }
}
