const express   = require('express');
const app       = express();
const server    = require('http').Server(app);
const io        = require('socket.io')(server);
const bodyParser= require('body-parser');
const AccModel  = require('./models/accModel');
const RoomModel = require('./models/roomsModel');
var MongoClient = require('mongodb').MongoClient;
const { emit } = require('./models/accModel');
var url = "mongodb://localhost:27017/";

app.use(express.static('public'));
// app.set('view engine', 'ejs');
server.listen(process.env.PORT || 3000, ()=>{ console.log('start server') });

app.use(bodyParser.urlencoded({ extened: true }));
app.use(bodyParser.json());

app.post('/login', (req, res) => {
    let user = req.body.username;
    let pwd = req.body.password;
    AccModel.findOne({
        username: user,
        password: pwd
    })
    .then(data=>{
        console.log('|___' + user + ' logged in')
        if(data){            
            res.status(200).end('Login OK,' + data.avt + ',' + data.email)
        } else {
            res.status(400).end('Wrong Username or Password')
        }        
    })
    .catch(err=>{
        res.status(400).end('Error Occurred')
    })
})

app.post('/signup', (req, res) => {
    let user = req.body.username
    let pwd = req.body.password
    let email = req.body.email
    let avt = req.body.avt

    AccModel.findOne({
        username: user        
    })
    .then(data=>{
        if(data){
            console.log("Username is used")
            res.end('400code:username')
        } else {
            console.log('|___a new signup: ' + user + ", avt: " + avt)
            return AccModel.create({
                username: user,
                password: pwd,
                email: email,
                avt: avt
            })
        }        
    })
    .then(data =>{
        res.status(200).end('Signup OK')
    })
    .catch(err => {
        res.status(400).end('Wrong Username or Password')
    })
})
var rid = ''
io.on('connection', (socket)=>{    
    console.log("Mot ket noi duoc mo! Socket ID: " + socket.id);

    // on createRoom msg
    socket.on('createRoom', (roomid, username, avatarid)=>{        
        rid = roomid
        RoomModel.findOne({
            roomid: roomid
        })
        .then(data => {
            if(data){
                console.log("room " + roomid + " already exist")
                res.status(400).end("400code:room " + roomid + " already exist")
            } else {
                console.log('save room ' + roomid + ' to DB')                
                return RoomModel.create({
                    roomid: roomid,
                    fstplayer: {
                        username: username,
                        avatar: avatarid,
                        socketid: socket.id
                    },
                    scdplayer: null,
                    numberofplayers: 1
                })
            }
        })
    })

    // on joinRoom msg
    socket.on("joinRoom", (roomid, username, avatarid) => {
        console.log("new player: " + username + "\n|__join in room: " + roomid)
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            let dbo = db.db("gamedb")
            let myquery = { roomid: roomid };
            dbo.collection('rooms_onlines').findOne(myquery).then(res => {
                console.log(roomid + '|' + username + '|' + avatarid)                                
                if(res.numberofplayers === 2){
                    socket.emit('confirmJoin', 0) // 0 : failed join
                } else {
                    // dbo.collection("rooms_onlines").updateOne(myquery, {
                    //     $set: {numberofplayers: 2}                
                    // });
                    if(res.scdplayer === undefined) {
                        console.log("second player undefined")
                        dbo.collection('rooms_onlines').updateOne(myquery, {
                            $set: {scdplayer : {
                                username : username,
                                avatarid : avatarid,
                                socketid : socket.id
                            }}
                        })
                        dbo.collection('rooms_onlines').updateOne(myquery, {                            
                            $set : {numberofplayers : 2}
                        })
                    } else if(res.fstplayer === undefined){
                        console.log("first player undefined")
                        dbo.collection('rooms_onlines').updateOne(myquery, {
                            $set: {fstplayer : {
                                username : username,
                                avatarid : avatarid,
                                socketid : socket.id
                            }},
                            $set : {numberofplayers : 2}
                        })
                    }
                    socket.emit('confirmJoin', 1) // 1 : join successfully
                }
            })                        
          });
    })

    // on disconnect socket
    socket.on('disconnect', () => {
        console.log('Disconnect socket! ' + rid)
        MongoClient.connect(url, (err, db) => {
            if (err) throw err;

            let dbo = db.db("gamedb")
            let myquery = { roomid: rid };
            dbo.collection('rooms_onlines').findOne(myquery).then(res => {
                console.log("res")                
                if(res.numberofplayers === 1){
                    dbo.collection('rooms_onlines').deleteOne(myquery).catch(e=>{})
                } else {
                    dbo.collection("rooms_onlines").updateOne(myquery, {
                        $set: {numberofplayers: 1}
                    });
                }
            }).catch(e => {})
          });
    })

    // on sendMsg
    socket.on("sendMsg", (roomid, usernumber, message)=>{
        MongoClient.connect(url, (err, db) => {
            if (err) throw err;

            let dbo = db.db("gamedb")
            let myquery = { roomid: roomid };
            dbo.collection('rooms_onlines').findOne(myquery).then(res => {
                console.log("receive message")
                var socketid = ''   // receiver's socket id
                var username = ''   // sender's username
                if(usernumber === 1){
                    socketid = res.scdplayer.socketid;
                    username = res.fstplayer.username;
                } else {
                    socketid = res.fstplayer.socketid;
                    username = res.scdplayer.username;
                }
                console.log(socketid)
                io.to(socketid).emit("newMsg", username, message)
            }).catch(e => {})
          });
    })
})

// Request on load page
app.get('/', (req, res)=>{
    res.end("HI WORLD")
})