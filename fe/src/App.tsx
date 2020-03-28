import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Grid, List, ListItem, Paper, TextField} from '@material-ui/core'
import useWebSocket from 'react-use-websocket';

const {hostname, port, protocol} = window.location
const wsHost = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}:${['3000', '3001', '3002', '3003'].includes(port) ? 8080 : port}`

const TableTop = (args: {frame: string|null}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [context, setContext] = useState<CanvasRenderingContext2D>()

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) { setContext(ctx) }
    }
  }, [])

  useEffect(() => {
    if (context && args.frame) {
      const image = new Image()
      image.src = args.frame
      image.onload = () => { context?.drawImage(image, 0, 0, 960, 540) }
    }
  }, [args.frame])

  return <canvas width={480} height={270} ref={canvasRef} />
}

export const App = () => {
  const [messages, setMessages] = useState<{user: string, message: string, createdAt: string}[]>([])
  const [message, setMessage] = useState<string>('')
  const [user, setUser] = useState<string>('anonymous')
  const [errors, setErrors] = useState<string[]>([])
  const [stream, setStream] = useState<MediaStream>()
  const [sessions, setSessions] = useState<Record<string, string|null>>({})

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
    if (lastMessage) {
      const incomingMessage = JSON.parse(lastMessage.data);
      console.log(incomingMessage)
      switch (incomingMessage.type) {
        case 'Message':
          setMessages(prev => [...prev, incomingMessage])
          break;
        case 'JoiningUser':
          setSessions(prev => ({...prev, [incomingMessage.joining]: null}))
          break;
        case 'LeavingUser':
          setSessions(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id != incomingMessage.leaving)))
          break;
        case 'SessionVideoFrame':
          console.log('try store frame', sessions, sessions[incomingMessage.sessionId])
          if (sessions[incomingMessage.sessionId] === null) {
            console.log('store frame')
            setSessions((prev) => ({...prev, [incomingMessage.sessionId]: incomingMessage.frame}))
          }
          break;
        default: break;
      }
    }
  }, [lastMessage])


  useEffect(() => {
    if (ReadyState[readyState] === 'OPEN' && !stream) {
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // width: {ideal: 1920},
          // height: {ideal: 1080},
          noiseSuppression: true,
          // frameRate: {ideal: 1, max: 1}
        }
      })
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
    }
  }, [readyState, ReadyState, stream])

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
    <Grid container>
      <Grid container item lg={10}>
        {
          Object.entries(sessions).map(([id, frame]) =>
            <Grid item lg={6}>
              <div>{id}</div>
              <TableTop key={id} frame={frame} />
            </Grid>
          )
        }
      </Grid>
      <Grid item lg={2}>
        <div>Websocket is {ReadyState[readyState]}</div>
        <button onClick={() => {stream?.getVideoTracks()[0]?.stop()}} >stop</button>
        <button onClick={sendSnapshot} >send</button>
        <ul>{errors.map(error => <li>{error}</li>)}</ul>
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
