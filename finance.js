var express = require('express');

var app = express();
var $q = require('bluebird');

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

    function complete() {
        console.log('complete invoked');
        console.log(account);
        console.log(mutualFunds);

//        if(account !== null && mutualFunds !== null && Object.keys(mutualFundValues).length > 0)
        if(account !== null && mutualFunds !== null)
        {
            console.log('rendering...');

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
        }
    }

    Account.findById(req.params.id).exec(function(err, result) {
        if(err) throw err;

        console.log("ACCOUNT");
        account = result;
        console.log(account);

        complete();
    });

    var baseMutualFundPath = 'http://www.google.com/finance/info?q='
    MutualFund.find({accountId: req.params.id}).exec(function(err, result) {
        if(err) throw err;

        console.log("MUTUAL FUNDS");
        mutualFunds = result;
        console.log(mutualFunds);

        for(var i=0; i < mutualFunds.length; i++)
        {
            console.log('hi');
            console.log('mutual fund i.symbol', mutualFunds[i].symbol);

            client({ path: baseMutualFundPath + mutualFunds[i].symbol}).then(function(response) {
                var dude = response.entity.split("//")
                var dudered = JSON.parse(dude[1]);

                return dudered[0].l;
            }).then(function(theValue) {
                console.log('theValue', theValue);
                console.log('shares', mutualFunds[i-1].shares);

                mutualFunds[i-1]['currentPrice'] = theValue;
                mutualFunds[i-1]['currentValue'] = theValue * mutualFunds[i-1].shares;
                mutualFunds[i-1]['gain'] = mutualFunds[i-1]['currentValue'] - mutualFunds[i-1].totalSpend;
                mutualFunds[i-1]['change'] = mutualFunds[i-1]['gain'] / mutualFunds[i-1].totalSpend;
                if(i == mutualFunds.length)
                {
                    complete();
                }
            });
        }
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


