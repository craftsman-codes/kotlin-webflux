import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Grid, List, ListItem, Paper, TextField} from "@material-ui/core"
import useWebSocket from 'react-use-websocket';

const {hostname, port, protocol} = window.location
const wsHost = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}:${['3000', '3001', '3002', '3003'].includes(port) ? 8080 : port}`

export const App = () => {
  const [messages, setMessages] = useState<{user: string, message: string, createdAt: string}[]>([])
  const [message, setMessage] = useState<string>('')
  const [user, setUser] = useState<string>('anonymous')
  const [errors, setErrors] = useState<string[]>([])
  const [stream, setStream] = useState<MediaStream>()
  const [context, setContext] = useState<CanvasRenderingContext2D>()

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const STATIC_OPTIONS = useMemo(() => ({
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  }), []);
  const ReadyState = [
    'CONNECTING',
    'OPEN',
    'CLOSING',
    'CLOSED'
  ]

  const [sendMessage, lastMessage, readyState] = useWebSocket(`${wsHost}/socket`, STATIC_OPTIONS);

  const video: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    noiseSuppression: true,
    frameRate: {
      ideal: 1,
      max: 1
    }
  }
  const constraints: MediaStreamConstraints = {
    audio: false,
    video
  }

  type MessageType = 'AddMessage' | 'LoadMessages' | 'VideoFrame'
  const send = useCallback(
    (messageType: MessageType, content: object = {}) => sendMessage(JSON.stringify({...content, messageType})),
    [sendMessage]
  )
  const add = (message: string, user: string) => Promise.resolve(send('AddMessage', {message, user}))

  useEffect(() => {
    if (!lastMessage && ReadyState[readyState] === 'OPEN') { send('LoadMessages') }
  }, [readyState, lastMessage, ReadyState, send])

  useEffect(() => {
    if (context && lastMessage) {
      const incomingMessage = JSON.parse(lastMessage.data);
      if (incomingMessage.message) {
        setMessages(prev => [...prev, incomingMessage])
      } else {
        if (incomingMessage.frame) {
          const image = new Image()
          image.src = incomingMessage.frame
          image.onload = () => { context?.drawImage(image, 0, 0, 960, 540) }
        }
      }
    }
  }, [lastMessage, context])

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) { setContext(ctx) }
    }
  }, [])

  useEffect(() => {
    navigator.mediaDevices.getUserMedia(constraints)
      .then(setStream)
      .catch(function (error) {
        if (error.name === 'ConstraintNotSatisfiedError') {
          setErrors(prev => [...prev, 'The resolution x px is not supported by your device.']);
        } else if (error.name === 'PermissionDeniedError') {
          setErrors(prev => [...prev, 'Permissions have not been granted to use your camera and ' +
          'microphone, you need to allow the page access to your devices in ' +
          'order for the demo to work.']);
        }
        setErrors(prev => [...prev, 'getUserMedia error: ' + error.name]);
      })
  }, [constraints])

  const sendSnapshot = () => {
    if (ReadyState[readyState] === 'OPEN' && stream && stream?.getVideoTracks()[0]?.readyState === 'live') {
      // @ts-ignore ImageCapture
      new ImageCapture(stream.getVideoTracks()[0]).takePhoto()
        .then((blob: Blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob)
          reader.onloadend = (() => { send('VideoFrame', {frame: reader.result, user: 'test'}) })
        })
    }
  }

  return <Paper>
    Websocket is {ReadyState[readyState]}
    <Grid container>
      <Grid item lg={9}>
        <button onClick={() => {stream?.getVideoTracks()[0].stop()}} >stop</button>
        <button onClick={sendSnapshot} >send</button>
        <ul>{errors.map(error => <li>{error}</li>)}</ul>
        <canvas width={960} height={540} ref={canvasRef} />
      </Grid>
      <Grid item lg={3}>
        <TextField
          variant="filled"
          label="User"
          autoFocus={true}
          value={user}
          onChange={event => setUser(event.target.value)}
        />
        <TextField
          variant="filled"
          label="Type your message"
          autoFocus={true}
          value={message}
          onChange={event => setMessage(event.target.value)}
          onKeyUp={event => {
            if (event.ctrlKey && event.key && message.trim()) {
              add(message.trim(), user).then(() => setMessage(''))
            }
          }}
        />
        <List>
          {messages.map(m => <ListItem key={m.createdAt}>{m.createdAt.slice(11, 19)} [{m.user}]: {m.message}</ListItem>)}
        </List>

      </Grid>
    </Grid>
  </Paper>
}
