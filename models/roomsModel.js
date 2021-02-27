const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin-caroh:hungnguyen81@gamedb.r21s8.mongodb.net/gamedb', 
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
    collation: 'rooms_onlines'
});

const RoomModel = mongoose.model('rooms_onlines', roomSchema)

module.exports = RoomModel