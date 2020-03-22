import React, {useEffect, useMemo, useState} from 'react'
import {Grid, List, ListItem, Paper, TextField} from "@material-ui/core"
import useWebSocket from 'react-use-websocket';

const {hostname, port, protocol} = window.location
const host = `${protocol}//${hostname}:${port === '3000' ? 8080 : port}`
const wsHost = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}:${port === '3000' ? 8080 : port}`

export const App = () => {
  const [messages, setMessages] = useState<{user: string, message: string, createdAt: string}[]>([])
  const [message, setMessage] = useState<string>('')
  const [user, setUser] = useState<string>('anonymous')

  const STATIC_OPTIONS = useMemo(() => ({
    shouldReconnect: (event: WebSocketEventMap['close']) => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  }), []);

  const [sendMessage, lastMessage, readyState] = useWebSocket(`${wsHost}/socket`, STATIC_OPTIONS);

  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [...prev, JSON.parse(lastMessage.data)])
    }
  }, [lastMessage])

  const load = () => fetch(`${host}/api/messages`)
    .then(response => response.json())
    .then(result => setMessages(result))

  const add = (message: string, user: string) => Promise.resolve(sendMessage(JSON.stringify({message, user})))

  useEffect(() => { load() }, [])

  const ReadyState = [
    "CONNECTING",
    "OPEN",
    "CLOSING",
    "CLOSED"
  ]

  return <Paper>
    Websocket is {ReadyState[readyState]}
    <Grid container>
      <Grid item lg={9}>
        <List>
          {messages.map(m => <ListItem key={m.createdAt}>{m.createdAt.slice(11, 19)} [{m.user}]: {m.message}</ListItem>)}
        </List>
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
      </Grid>
    </Grid>
  </Paper>
}
