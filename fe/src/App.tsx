import React, {useEffect, useState} from 'react'
import {Grid, List, ListItem, Paper, TextField} from "@material-ui/core"

export const App = () => {
  const [messages, setMessages] = useState<{message: string, createdAt: string}[]>([])
  const [message, setMessage] = useState<string>('')

  const load = () => fetch('http://localhost:8080/api/messages')
    .then(response => response.json())
    .then(result => setMessages(result))

  const add = (message: string, user: string) => fetch('http://localhost:8080/api/message', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({message, user})
  })

  useEffect(() => { load() }, [])

  return <Paper>
    <Grid container>
      <Grid item lg={9}>
        <List>
          {messages.map(m => <ListItem key={m.createdAt}>{m.createdAt}: {m.message}</ListItem>)}
        </List>
      </Grid>
      <Grid item lg={3}>
        <TextField
          variant="filled"
          label="Type your message"
          autoFocus={true}
          value={message}
          onChange={event => setMessage(event.target.value)}
          onKeyUp={event => {
            if (event.ctrlKey && event.key && message.trim()) {
              add(message, 'anonymous').then(() => setMessage(''))
            }
          }}
        />
      </Grid>
    </Grid>
  </Paper>
}
