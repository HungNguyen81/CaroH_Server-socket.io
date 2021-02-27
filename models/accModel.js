const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin-caroh:hungnguyen81@gamedb.r21s8.mongodb.net/gamedb', 
{
    useNewUrlParser: true, 
    useUnifiedTopology: true
});

const Schema = mongoose.Schema;

const AccSchema = new Schema({
    username: String,
    password: String,
    email: String,
    avt: String
}, {
    collation: 'player_accounts'
});

const AccModel = mongoose.model('player_accounts', AccSchema)

module.exports = AccModel