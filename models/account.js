var mongoose = require('mongoose');

var accountSchema = mongoose.Schema({
    name: String,
    person: String,
    settledFundsAvailable: Number
});

var Account = mongoose.model('Account', accountSchema);

module.exports = Account;
