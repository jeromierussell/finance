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
console.log(config.mongo.development.connectionString);

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

app.get('/', function(req, res) {
    Account.find().exec(function(err, accounts) {
        res.render('home', {accounts: accounts});
    });
});

app.get('/accounts/:id', function(req, res) {
    var account = null;
    var mutualFunds = null;
    var mutualFundValues = {};

    var baseMutualFundPath = 'http://www.google.com/finance/info?q='

    Account.findById(req.params.id).exec(function(err, result) {
        if(err) throw err;
    }).then(function (account) {
        var fundPromises = [];

        MutualFund.find({accountId: req.params.id}).exec(function(err, result) {
            if(err) throw err;

            // console.log("MUTUAL FUNDS");
            mutualFunds = result;
            // console.log(mutualFunds);

            mutualFunds.forEach(function (mutualFund) {
                // console.log('hi');
                // console.log('mutual fund i.symbol', mutualFund.symbol);

                var fundPromise = client({ path: baseMutualFundPath + mutualFund.symbol}).then(function(response) {
                    var dude = response.entity.split("//")
                    var dudered = JSON.parse(dude[1]);

console.log('RETURNING #1')
console.log(dudered[0].l);

                    return dudered[0].l;
                }).then(function(theValue) {
                    // console.log('theValue', theValue);
                    // console.log('shares', mutualFund.shares);

                    mutualFund.currentPrice = theValue;
                    mutualFund.currentValue = theValue * mutualFund.shares;
                    mutualFund.gain = mutualFund.currentValue - mutualFund.totalSpend;
                    mutualFund.change = mutualFund.gain / mutualFund.totalSpend;

console.log('RETURNING #2')
console.log(mutualFund);

                    return mutualFund;
                });

                fundPromises.push(fundPromise);
            });

            Promise.all(fundPromises).then(function(mutualFunds) {
                console.log('results...');
                console.log(mutualFunds);

                var accountSpend = 0;
                var accountGain = 0;
                var accountValue = 0;

                mutualFunds.forEach(function(fund) {
                    accountSpend = accountSpend + fund.totalSpend;
                    accountGain = accountGain + fund.gain;
                    accountValue = accountValue + fund.currentValue;
                });

                res.render('account', {
                    account: account,
                    mutualFunds: mutualFunds,
                    accountGain: accountGain,
                    accountSpend: accountSpend,
                    accountValue: accountValue,
                    accountChange: accountGain / accountSpend
                });

/*                res.render('account', {
                    account: account
                });
            */
            })

// console.log('RETURNING #3')
// console.log(fundPromises);

            return fundPromises;
        });

// console.log('RETURNING #4')
// console.log(fundPromises);

        return fundPromises;
    });
/*
        mutualFunds.forEach(function(fund) {
            accountSpend = accountSpend + fund.totalSpend;
            accountGain = accountGain + fund.gain;
            accountValue = accountValue + fund.currentValue;
        });


        res.render('account', {
            account: account,
            mutualFunds: mutualFunds,
            accountGain: accountGain,
            accountSpend: accountSpend,
            accountValue: accountValue,
            accountChange: accountGain / accountSpend
        });
*/        

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


