const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/gamedb', 
{
    useNewUrlParser: true, 
    useUnifiedTopology: true
});

const Schema = mongoose.Schema;

const roomSchema = new Schema({
    roomid: String,
    fstplayer: {
        username: String,
        avatar: Number,
        socketid: String
    },
    scdplayer: {
        username: String,
        avatar: String,
        socketid: String
    },
    numberofplayers: Number
}, {
    collation: 'rooms_online'
});

const RoomModel = mongoose.model('rooms_online', roomSchema)

module.exports = RoomModel