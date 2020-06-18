const WebSocket = require('ws')
const fs = require('fs')
const express = require('express')
const https = require('https')

let config = fs.readFileSync('./.env')
config = JSON.parse(config)

const credentials = {
  key: fs.readFileSync(config.privateKey),
  cert: fs.readFileSync(config.certificate)
}

const httpsServer = https.createServer(credentials, express())
httpsServer.listen( config.port )

const sockets = new WebSocket.Server({
  server: httpsServer
})

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

const matches = {
  destination:/[A-Z]{3}/g,
  checksum:/[A-Z]{4}/g
}

const broadcastMessage = (transmission,sender) => {
  const destination = sanitizeText(transmission.destination, 3, matches.destination) ? transmission.destination : false
  const checksum = sanitizeText(transmission.checksum, 4, matches.checksum) ? transmission.checksum : false
  const frequency = sender.settings.frequency !== 0 ? sender.settings.frequency : false
  const content = transmission.content

  if( destination && frequency && checksum ){
    let message = {
      type: 'message',
      content,
      checksum,
      sender:sender.settings.callsign
    }
    let burst = {
      type: 'burst'
    }
    let transmitOk = {
      type: 'transmitOk'
    }
    message = JSON.stringify(message)
    burst = JSON.stringify(burst)
    transmitOk = JSON.stringify(transmitOk)

    sockets.clients.forEach( socket => {
      if( socket.settings.frequency === frequency ){
        if( socket === sender ){
          console.log(transmitOk)
          socket.send(transmitOk)
        }else if( socket.settings.callsign === destination || socket.settings.subgroup === destination || socket.settings.group === destination ){
          console.log(message)
          socket.send(message)
        }else{
          socket.send(burst)
          console.log(socket.callsign)
        }
      }
    })
  }else{
    console.log('ongelmia')
  }
}



const sanitizeText = (value, length, pattern) => {
  if( value !== undefined && value !== '' && value.length === length && value.match(pattern) !== null ) return true
  else return false
}

const sanitizeSettings = (initialSettings, transmission) => {
  const sanitize = (value, condition) => {
    if( value !== undefined && value !== '' && condition ) return true
    return false
  }

  let settings = initialSettings
  settings.frequency = sanitize(transmission.frequency, transmission.frequency >= 30 && transmission.frequency <= 85.975 ) ? parseFloat(transmission.frequency) : settings.frequency
  settings.callsign = sanitizeText(transmission.callsign, 3, matches.destination) ? transmission.callsign : settings.callsign
  settings.group = sanitizeText(transmission.group, 3, matches.destination) ? transmission.group : settings.group
  settings.subgroup = sanitizeText(transmission.subgroup, 3, matches.destination) ? transmission.subgroup : settings.subgroup
  settings.checksum1 = sanitizeText(transmission.checksum1, 4, matches.checksum) ? transmission.checksum1 : settings.checksum1
  settings.checksum2 = sanitizeText(transmission.checksum2, 4, matches.checksum) ? transmission.checksum2 : settings.checksum2
  return settings
}

sockets.on('connection', function connection(socket) {
  socket.settings = {
    frequency:0,
    callsign:'',
    group:'',
    subgroup:'',
    checksum1:'',
    checksum2:''
  }

  socket.on('message', function incoming(data) {
    try{
      const transmission = JSON.parse(data)
    
      switch( transmission.type ){
        case 'handshake':
          socket.settings.frequency = transmission.frequency
          broadcastToFrequency('yk', transmission.type, transmission.frequency, socket)
          break
        case 'settings':
          socket.settings = sanitizeSettings(socket.settings, transmission)
          console.log(socket.settings)
          break
        case 'transmit':
          broadcastMessage(transmission,socket)
          break
      }
  
      if( transmission.type === 'handshake' ){
        broadcastToFrequency('yk',socket)
      }else socket.send('vastaanotettu')
      console.log('received: %s', data);
    }catch(error){}
  });
});