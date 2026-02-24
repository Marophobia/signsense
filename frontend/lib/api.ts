const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000'
const API_URL = `${API_BASE.replace(/\/$/, '')}/api/calls`

export interface Call {
  call_id: string
  call_type: string
  token: string
  api_key: string
}

export interface EventMessage {
  type: string
  gesture?: string
  confidence?: number
  sentence?: string
  timestamp?: number
  data?: unknown
}

export const createCall = async (userId?: string, userName?: string): Promise<Call> => {
  const response = await fetch(`${API_URL}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId ?? `user_${Date.now()}`,
      user_name: userName ?? 'User',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to create call: ${response.status} ${text}`)
  }

  return response.json()
}

export const startAgent = async (callId: string, callType = 'default'): Promise<void> => {
  const response = await fetch(`${API_URL}/${callId}/start-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ call_type: callType }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to start agent: ${response.status} ${text}`)
  }
}

export const stopAgent = async (callId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/${callId}/stop-agent`, {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 404) {
    const text = await response.text()
    throw new Error(`Failed to stop agent: ${response.status} ${text}`)
  }
}

export const openEventStream = (
  callId: string,
  onMessage: (event: EventMessage) => void,
  onError: (error: Error) => void,
  onClose: () => void
): (() => void) => {
  const eventSource = new EventSource(`${API_URL}/${callId}/events`)

  eventSource.onmessage = (event: MessageEvent<string>) => {
    try {
      const message = JSON.parse(event.data) as EventMessage
      onMessage(message)
    } catch (err) {
      console.error('Failed to parse event:', err)
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
    onError(new Error('Event stream connection failed'))
  }

  return () => {
    eventSource.close()
    onClose()
  }
}
