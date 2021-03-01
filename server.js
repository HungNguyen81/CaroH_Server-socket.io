const express   = require('express');
const app       = express();
const server    = require('http').Server(app);
const io        = require('socket.io')(server);
const bodyParser= require('body-parser');
const AccModel  = require('./models/accModel');
const RoomModel = require('./models/roomsModel');
var MongoClient = require('mongodb').MongoClient;
const { render } = require('ejs');

var url = "mongodb+srv://admin-caroh:hungnguyen81@gamedb.r21s8.mongodb.net/";//"mongodb://localhost:27017/";
var rid = '';

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');
var PORT = process.env.PORT || 8080;
server.listen(PORT, ()=>{ console.log(`start server at port: ${PORT}`)});

app.use(bodyParser.urlencoded({ extened: true }));
app.use(bodyParser.json());

app.post('/login', (req, res) => {
    let user = req.body.username;
    let pwd = req.body.password;    
    if(user == '' || pwd == '') return;
    AccModel.findOne({
        username: user,
        password: pwd
    })
    .then(data=>{
        console.log('|___' + user + ' logged in')
        if(data){            
            // if(req.body.isWebapp === '1'){                
            //     res.render('home-page', {
            //         username : user,
            //         avatarid : data.avt
            //     })                
            // } else 
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
                if(res != null)
                if(res.numberofplayers === 2){
                    // socket.emit('confirmJoin', 0) // 0 : failed join
                } else {
                    var other_socketid = ''
                    var other_avatarid = ''
                    var other_username = ''
                    if(res.scdplayer === undefined || res.scdplayer === null) {
                        other_socketid = res.fstplayer.socketid
                        other_avatarid = res.fstplayer.avatar
                        other_username = res.fstplayer.username
                        console.log("second player undefined")
                        dbo.collection('rooms_onlines').updateOne(myquery, {
                            $set: {scdplayer : {
                                username : username,
                                avatar : avatarid,
                                socketid : socket.id
                            }}
                        })
                        dbo.collection('rooms_onlines').updateOne(myquery, {                            
                            $set : {numberofplayers : 2}
                        })
                    } else if(res.fstplayer === undefined || res.fstplayer === null){
                        other_socketid = res.scdplayer.socketid
                        other_avatarid = res.scdplayer.avatar
                        other_username = res.scdplayer.username
                        
                        console.log("first player undefined")
                        dbo.collection('rooms_onlines').updateOne(myquery, {
                            $set: {fstplayer : {
                                username : username,
                                avatar : avatarid,
                                socketid : socket.id
                            }}
                        })
                        dbo.collection('rooms_onlines').updateOne(myquery, {                            
                            $set : {numberofplayers : 2}
                        })
                    }
                    rid = roomid
                    console.log("emit roomFull")
                    io.to(other_socketid).emit("roomFull", username, avatarid)
                    io.to(socket.id).emit("roomFull", other_username, other_avatarid)
                    console.log(other_username, other_avatarid)
                }
            }).catch(e => {if(e) throw e})
          });
    })

    socket.on('leaveRoom', (roomid, username) => {
        console.log(username + " left room " + roomid)
        MongoClient.connect(url, (err, db) => {
            if (err) throw err;

            let dbo = db.db("gamedb")
            let myquery = { roomid: roomid };
            dbo.collection('rooms_onlines').findOne(myquery).then(res => {                                
                if(res){
                    if(res.numberofplayers === 1){
                        dbo.collection('rooms_onlines').deleteOne(myquery).catch(e=>{})
                    } else {
                        dbo.collection("rooms_onlines").updateOne(myquery, {
                            $set: {numberofplayers: 1}
                        });
                        if(socket.id === res.fstplayer.socketid){
                            dbo.collection("rooms_onlines").updateOne(myquery,{
                                $set: {fstplayer: undefined}
                            })
                            io.to(res.scdplayer.socketid).emit("memberLeft")
                        } else if(socket.id === res.scdplayer.socketid){
                            dbo.collection("rooms_onlines").updateOne(myquery,{
                                $set: {scdplayer: undefined}
                            })
                            io.to(res.fstplayer.socketid).emit("memberLeft")
                        }
                    }
                } else {
                    console.log('room invalid')
                }
            }).catch(e => {})
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
                    if(socket.id === res.fstplayer.socketid){
                        dbo.collection("rooms_onlines").updateOne(myquery,{
                            $set: {fstplayer: undefined}
                        })
                        io.to(res.scdplayer.socketid).emit("memberLeft")
                    } else if(socket.id === res.scdplayer.socketid){
                        dbo.collection("rooms_onlines").updateOne(myquery,{
                            $set: {scdplayer: undefined}
                        })
                        io.to(res.fstplayer.socketid).emit("memberLeft")
                    }
                }
            }).catch(e => {})
          });
    })

    // on sendMsg
    socket.on("sendMsg", (roomid, username, message)=>{
        MongoClient.connect(url, (err, db) => {
            if (err) throw err;

            let dbo = db.db("gamedb")
            let myquery = { roomid: roomid };
            dbo.collection('rooms_onlines').findOne(myquery).then(res => {
                console.log("receive message")
                var socketid = ''   // receiver's socket id
                if(username === res.fstplayer.username){
                    socketid = res.scdplayer.socketid;                    
                } else if(username === res.scdplayer.username) {
                    socketid = res.fstplayer.socketid;                
                }
                console.log(socketid)
                io.to(socketid).emit("newMsg", username, message)
            }).catch(e => {})
          });
    })
})

// Request on load page
app.get('/', (req, res)=>{
    res.render('login');
});

app.get('/home', (req, res)=>{
    res.render('home-page');
})

app.post('/home', (req, res) => {
    let user = req.body.username;
    let pwd = req.body.password;    
    if(user == '' || pwd == '') return;
    AccModel.findOne({
        username: user,
        password: pwd
    })
    .then(data=>{
        console.log('|___' + user + ' logged in')
        if(data){              
            res.render('home-page', {
                username : user,
                avatarid : data.avt
            })                            
        } else {
            res.status(400).end('Wrong Username or Password')
        }        
    })
    .catch(err=>{
        res.status(400).end('Error Occurred')
    })
})

app.get('/signup-web', (req, res) => {
    res.render('signup');
})
app.post('/signup-web', (req, res) => {
    let user = req.body.username
    let pwd = req.body.password
    let cpwd = req.body.cpassword
    let email = req.body.email
    let avt = req.body.avt

    if(pwd != cpwd){
        alert("wrong confirm password")
    }

    AccModel.findOne({
        username: user        
    })
    .then(data=>{
        if(data){
            console.log("Username is used")
            res.end('400code:username in used')
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
        res.render('signup-ok')
    })
    .catch(err => {
        res.status(400).end('Somthings wrong')        
    })
})
app.post('/game-lobby', (req, res) => {

})