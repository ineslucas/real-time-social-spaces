// Using NeDB: https://github.com/louischatriot/nedb
   // NeDB doesn't require a specific server outside, because it's inside Node.js - it's a module.

   // To install NeDB:
    // npm install nedb --save    # Put latest version in your package.json
    // npm test                   # You'll need the dev dependencies to launch tests
    // bower install nedb         # For the browser versions, which will be in browser-version/out

// If I wanted to store data: //⭐️ Step 1
// let storage = []; // then push msg into array in onMessage
  // When we do server side changes, we need to restart the server.
  // You might have an architecture where you have a central database server (like Mongo or mySQL) and then there's several web servers talking back to it.

// With NeDB, the server is right inside Node.js.
// Typically you would add a timestamp to the JSON object.
// JSON object as opposed to an array.


let Datastore = require('nedb');
let db = new Datastore({filename:'database.db',autoload:true}); // database.db gets created on the first run.

// the express package will run our server
const express = require("express");
const app = express();
app.use(express.static("public")); // this line tells the express app to 'serve' the public folder to clients

// HTTP will expose our server to the web
const http = require("http").createServer(app);

// start our server listening on port 8080 for now (this is standard for HTTP connections)
const server = app.listen(8080);
console.log("Server is running on http://localhost:8080");

/////SOCKET.IO///////
const io = require("socket.io")().listen(server);


io.on("connection", onConnection);


function onConnection(socket){
  // ⭐️ Step 3
  // for (let i = 0; i < storage.length; i++) {
  //   socket.emit('msg', storage[i]);
  // }

  ///////////////////
  // Now usign NeDB:

  db.find({}, function(err, storage) { // Is storage an NeDB object?
    for (let i = 0; i<storage.length; i++) {
      socket.emit('msg', storage[i]);
    }
  })

  ///////////////////

  console.log('Someone connected to our websocket server!');
  console.log('This is their ID: ', socket.id);

  socket.on('msg', onMessage);
}

function onMessage(msg){
  console.log('We received a message from one of the sockets:');
  console.log(msg);
  // storage.push(msg); //⭐️ Step 2

  // NeDB
  msg.ts = Date.now(); // NeDB doesn't have a timestamp, so we need to add one.
  db.insert(msg, function(err, newdoc) {
    console.log(err);
  });
  io.emit('msg', msg); // resends message to everyone.
}

// EPOC: date.now() is the number of milliseconds since 1970, when programmers decided it was the birth of computing.
// ‼️ there's an isDate bug, I don't think we actually checked for it in class.
