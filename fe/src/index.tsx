import React from 'react';
import ReactDOM from 'react-dom';
import {App} from './App';

ReactDOM.render(<App/>, document.getElementById('root'));

let ws: WebSocket | null = null;
ws = new WebSocket("ws://localhost:8080/socket");
ws.onopen = function() {
  console.log('Info: Connection Established.');
  if (ws) {
    ws.send("Test")
  } else {
    console.log("connection failed")
  }
};

ws.onmessage = function(event) {
  console.log(event.data);
};

ws.onclose = function() {
  console.log('Info: Closing Connection.');
};
