import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {Button, Grid, List, ListItem, Paper, TextField, Typography} from '@material-ui/core'
import useWebSocket from 'react-use-websocket'
import {v4 as uuid} from 'uuid'

const {hostname, port, protocol} = window.location
const wsHost = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}:${['3000', '3001', '3002', '3003'].includes(port) ? 8080 : port}`

type VideoFrame = {sessionId: string, user: string, frame: string, rotation: number}

const TableTop = (args: {frame: VideoFrame}) => {
  const small = {
    width: 480,
    height: 270,
    border: 'solid lightgrey 2px',
  }
  const large = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }
  const [dimensions, setDimensions] = useState<Record<string, any>>(small)

  const toggleSize = () => setDimensions(prev => prev.width === 480 ? large : small)

  return <Paper style={{padding: '10px'}}>
    <img alt={args.frame.user} onClick={toggleSize} style={{
      ...dimensions,
      transform: `rotate(${args.frame.rotation}deg)`
    }} src={args.frame.frame} />
    <Typography variant="subtitle1">{args.frame.user}</Typography>
  </Paper>
}

function loadSessionId() {
  const storedId = localStorage.getItem('sessionId')
  if (storedId) {
    return storedId
  } else {
    const newId = uuid()
    localStorage.setItem('sessionId', newId)
    return newId
  }
}

type Message = {id: string, user: string, message: string, createdAt: string}

export const App = () => {
  const [messages, setMessages] = useState<Record<string, Message>>({})
  const [message, setMessage] = useState<string>('')
  const [user, setUser] = useState<string>(localStorage.getItem('username') || 'anonymous')
  const [errors, setErrors] = useState<string[]>([])
  const [stream, setStream] = useState<MediaStream>()
  const [sessions, setSessions] = useState<Record<string, VideoFrame>>({})
  const [camera, setCamera] = useState(false)
  const [delay, setDelay] = useState(5)
  const [degrees, setDegrees] = useState(0)

  const sessionId = loadSessionId()

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


  type MessageType = 'AddMessage' | 'LoadMessages' | 'SendSnapshot'
  const send = useCallback(
    (type: MessageType, content: object = {}) => sendMessage(JSON.stringify({...content, type})),
    [sendMessage]
  )
  const add = (message: string, user: string) => Promise.resolve(send('AddMessage', {message, user}))

  useEffect(() => {
    if (!lastMessage && ReadyState[readyState] === 'OPEN') { send('LoadMessages') }
  }, [readyState, lastMessage, ReadyState, send])

  useEffect(() => {
    if (lastMessage) {
      const incomingMessage = JSON.parse(lastMessage.data);
      switch (incomingMessage.type) {
        case 'Message':
          setMessages((prev) => ({...prev, [incomingMessage.id]: incomingMessage}))
          break;
        case 'VideoFrame':
          setSessions((prev) => ({...prev, [incomingMessage.sessionId]: incomingMessage}))
          break;
        default: break;
      }
    }
  }, [lastMessage])


  useEffect(() => {
    if (camera) {
      if (!stream) {
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // width: {ideal: 1920},
            // height: {ideal: 1080},
            noiseSuppression: true,
            // frameRate: {ideal: 1, max: 1}
            facingMode: {
              ideal: "environment"
            }
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
    } else {
      if (stream) {
        stream.getTracks()
          .forEach((track) => track.stop())
        setStream(undefined)
        setErrors([])
      }
    }
  }, [camera, stream])

  const sendSnapshot = () => {
    if (ReadyState[readyState] === 'OPEN' && stream?.getVideoTracks()[0]?.readyState === 'live') {
      // @ts-ignore ImageCapture
      new ImageCapture(stream.getVideoTracks()[0]).takePhoto()
        .then((blob: Blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob)
          reader.onloadend = (() => { send('SendSnapshot', {
            sessionId: sessionId,
            frame: reader.result,
            user: user,
            rotation: degrees
          }) })
        })
    }
  }

  const sendSnapShotCallback = useCallback(sendSnapshot, [ReadyState, readyState, stream])

  useEffect(() => {
    if (camera) {
      const timeout = setInterval(() => sendSnapShotCallback(), delay * 1000)

      return () => {clearTimeout(timeout)}
    }
  }, [camera, delay, sendSnapShotCallback])

  const sendTextMessage = () => {
    if (message.trim()) {
      add(message.trim(), user)
        .then(() => setMessage(''))
    }
  }

  return <>
    <Grid container>
      <Grid container item lg={10}>
        {
          Object.values(sessions).map(frame =>
            <Grid key={frame.sessionId} item>
              <TableTop frame={frame} />
            </Grid>
          )
        }
      </Grid>
      <Grid item lg={2}>
        <div>Websocket is {ReadyState[readyState]}</div>
        <Button
          variant="contained"
          onClick={() => setCamera(prev => !prev)}>Toggle video ({camera ? 'On' : 'Off'})</Button>
        <ul>{errors.map(error => <li>{error}</li>)}</ul>
        <TextField
          variant="filled"
          label="Snapshot delay (s)"
          value={delay}
          type="number"
          onChange={event => {
            if (parseInt(event.target.value, 10) > 0) {
              setDelay(parseInt(event.target.value, 10 ))
            }
          }}
        />
        <Button
          variant="contained"
          onClick={() => setDegrees(prev => (prev + 90) % 360)}
        >Rotation</Button>
        <TextField
          variant="filled"
          label="User"
          autoFocus={true}
          value={user}
          onChange={event => {
            localStorage.setItem('username', event.target.value)
            setUser(event.target.value)
          }}
        />
        <TextField
          variant="filled"
          label="Type your message"
          autoFocus={true}
          value={message}
          onChange={event => setMessage(event.target.value)}
          onKeyUp={event => { if (event.ctrlKey && event.key) { sendTextMessage() } }}
        />
        <Button variant="contained" onClick={sendTextMessage}>Send Message (ctrl+⏎)</Button>
        <List>
          {
            Object.values(messages)
              .sort((a, b) => a.createdAt > b.createdAt ? 1 : (a.createdAt < b.createdAt ? -1 : 0))
              .map(m => <ListItem key={m.createdAt}>{m.createdAt.slice(11, 19)} [{m.user}]: {m.message}</ListItem>)
          }
        </List>

      </Grid>
    </Grid>
  </>
}
