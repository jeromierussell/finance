Number.prototype.formatMoney = function(c, d, t){
var n = this, 
    c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "." : d, 
    t = t == undefined ? "," : t, 
    s = n < 0 ? "-" : "", 
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 };


var express = require('express');
var app = express();

var Promise = require('bluebird');

var handlebars = require('express-handlebars')
    .create({defaultLayout:'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

var config = require('./config.js');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

var mongoose = require('mongoose');
var opts = {
    server: {
        socketOptions: { keepAlive: 1 }
    }
};

console.log(app.get('env'));

switch(app.get('env')) {
    case 'development':
        mongoose.connect(config.mongo.development.connectionString, opts);
        break;
    case 'production':
        mongoose.connect(config.mongo.production.connectionString, opts);
        break;
    default:
        throw new Error('Unknown environment: ' + app.get('env'));
}

require('./seed.js');

var rest = require('rest');
var mime = require('rest/interceptor/mime');

var client = rest.wrap(mime);
// var _ = require('lodash');

var Account = require('./models/account.js');
var MutualFund = require('./models/mutualFund.js');

var baseMutualFundPath = 'http://www.google.com/finance/info?q='


app.get('/', function(req, res) {

    var allPromises = [];

    var accountsPromise = Account.find().exec(function(err, accounts) {

        return accounts;
    });

    var allMutualFundsPromise = MutualFund.find().exec(function(err, mutualFunds) {
        if(err) throw err;

        mutualFunds.forEach(function (mutualFund) {
            mutualFund.currentValue = mutualFund.currentPrice * mutualFund.shares;
            mutualFund.gain = mutualFund.currentValue - mutualFund.totalSpend;
            mutualFund.change = mutualFund.gain / mutualFund.totalSpend;

            return mutualFund;
        });

        return mutualFunds;
    });

    Promise.join(accountsPromise, allMutualFundsPromise, function(accounts, mutualFunds) {
        var allSpend = 0;
        var allGain = 0;
        var allValue = 0;

        mutualFunds.forEach(function(fund) {
            allSpend = allSpend + fund.totalSpend;
            allGain = allGain + fund.gain;
            allValue = allValue + fund.currentValue;
        });

        res.render('home', {
            accounts: accounts,
            allGain: allGain.formatMoney(2),
            allSpend: allSpend.formatMoney(2),
            allValue: allValue.formatMoney(2),
            allChange: (100 * allGain / allSpend).toFixed(2)
        });
    }); 
});

app.get('/accounts/:id', function(req, res) {
    Account.findById(req.params.id).exec(function(err, result) {
        if(err) throw err;
    }).then(function (account) {
        MutualFund.find({accountId: req.params.id}).exec(function(err, result) {
            if(err) throw err;

            mutualFunds = result;

            var accountSpend = 0;
            var accountGain = 0;
            var accountValue = 0;

            mutualFunds.forEach(function (mutualFund) {
                mutualFund.currentValue = mutualFund.currentPrice * mutualFund.shares;
                mutualFund.gain = mutualFund.currentValue - mutualFund.totalSpend;
                mutualFund.change = (100 * mutualFund.gain / mutualFund.totalSpend).toFixed(2);

                accountSpend = accountSpend + mutualFund.totalSpend;
                accountGain = accountGain + mutualFund.gain;
                accountValue = accountValue + mutualFund.currentValue;

                mutualFund.currentValue = mutualFund.currentValue.formatMoney(2);
                mutualFund.gain = mutualFund.gain.formatMoney(2);

                return mutualFund;
            });

            res.render('account', {
                account: account,
                mutualFunds: mutualFunds,
                accountGain: accountGain.formatMoney(2),
                accountSpend: accountSpend.formatMoney(2),
                accountValue: accountValue.formatMoney(2),
                accountChange: (100 * accountGain / accountSpend).toFixed(2)
            });
        });
    });
});

app.get('/update', function(req, res) {
    MutualFund.find({}).exec(function(err, result) {
        if(err) throw err;

        console.log("Updating current prices...");

        result.forEach(function (mutualFund) {
            console.log(mutualFund.symbol);

            client({path: baseMutualFundPath + mutualFund.symbol}).then(function(response) {
                var dude = response.entity.split("//")
                var dudered = JSON.parse(dude[1]);

                mutualFund.currentPrice = dudered[0].l;
                mutualFund.lastUpdated = new Date();

                mutualFund.save(function (err) {
                    if (err) {
                        console.log('Error updating [' + mutualFund.symbol + ']');
                        console.log(err);                        
                    } else {
                        console.log(mutualFund.symbol + ' saved!');
                    }
                })

                return dudered[0].l;
            });
        });

        res.send('done...cool');
    });
});

app.use(function(req, res, next) {
    // res.status(404);
    res.render('404');
});

app.use(function(err, req, res, next) {
    console.error(err.stack);
    // res.status(500);
    res.render('500');
});

app.listen(app.get('port'), function() {
});


