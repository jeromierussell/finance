var mongoose = require('mongoose');

var mutualFundSchema = mongoose.Schema({
    symbol: String,
    shares: Number,
    category: String,
    currentPrice: Number,
    accountId: {type: mongoose.Schema.ObjectId, required: true},
    totalSpend: Number,
    initialPurchaseDate: Date
});

var MutualFund = mongoose.model('MutualFund', mutualFundSchema);

module.exports = MutualFund;

