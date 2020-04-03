const WebSocket = require('ws');

const sockets = new WebSocket.Server({ port: 8080 });

const transmitToSocket = (socket,type,message) => {
  let transmission = {
    type,
    message,
    callsign:socket.callsign
  }
  transmission = JSON.stringify(transmission)
  socket.send(transmission)
}

const broadcastToFrequency = (message, type, frequency, ignore) => {
  sockets.clients.forEach( socket => {
    if( ( ignore === undefined || ignore !== socket ) && frequency === socket.frequency ){
      console.log(socket.frequency)
      transmitToSocket(socket,type,message)
      socket.send(message)
    }
  })
}

sockets.on('connection', function connection(socket) {
  socket.callsign = ''
  socket.group = ''
  socket.subgroup = ''
  socket.frequency = 0

  socket.on('message', function incoming(message) {
    try{
      const transmission = JSON.parse(message)
    
      switch( transmission.type ){
        case 'handshake':
          socket.frequency = transmission.frequency
          broadcastToFrequency('yk', transmission.type, transmission.frequency, socket)
          break
      }
  
      if( transmission.type === 'handshake' ){
        broadcastToFrequency('yk',socket)
      }else socket.send('vastaanotettu')
    }catch(error){
      console.log(error)
    }
    console.log('received: %s', message);
  });
});