const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/gamedb', 
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
    collation: 'player_acounts'
});

const AccModel = mongoose.model('player_accounts', AccSchema)

module.exports = AccModel