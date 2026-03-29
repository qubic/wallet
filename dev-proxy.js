var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser');

function createProxy(targetURL, port) {
    var app = express();
    var myLimit = typeof(process.argv[2]) != 'undefined' ? process.argv[2] : '500kb';
    console.log('Using limit: ', myLimit);

    app.use(bodyParser.json({limit: myLimit}));

    app.all('*', function (req, res, next) {

        // allow CORS
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
        res.header("Access-Control-Allow-Headers", req.header('access-control-request-headers'));

        if (req.method === 'OPTIONS') {
            // CORS Preflight
            res.send();
        } else {
            if (!targetURL) {
                res.status(500).send({ error: 'There is no Target-Endpoint header in the request' });
                return;
            }
            console.log("API CALL: " + req.method  + "\t" + targetURL + req.url);
            request({ url: targetURL + req.url, method: req.method, json: req.body, headers: {'Authorization': req.header('Authorization')} },
                function (error, response, body) {
                    if (error) {
                        console.error('error: ' + (response ? response.statusCode : error.message));
                    }
                }).pipe(res);
        }
    });

    app.set('port', port);

    app.listen(app.get('port'), function () {
        console.log('Proxy server listening on port ' + app.get('port'));
    });
}

// Create two proxy instances with different target URLs and ports
createProxy("https://api.qubic.li", 7003);
createProxy("https://rpc.qubic.org", 7004);

function createBanxaProxy(port) {
    var app = express();
    var myLimit = typeof(process.argv[2]) != 'undefined' ? process.argv[2] : '500kb';
    var baseUrl = process.env.BANXA_BASE_URL || 'https://api.banxa-sandbox.com';
    var partner = process.env.BANXA_PARTNER || 'qubic';
    var apiKey = process.env.BANXA_API_KEY || '';

    app.use(bodyParser.json({limit: myLimit}));

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
        res.header("Access-Control-Allow-Headers", req.header('access-control-request-headers'));

        if (req.method === 'OPTIONS') {
            res.send();
            return;
        }

        if (!apiKey) {
            res.status(500).send({ error: 'BANXA_API_KEY is not configured for the local Banxa proxy.' });
            return;
        }

        next();
    });

    function normalizeOptions(items, pickId) {
        return (items || []).map(function(item) {
            return {
                id: pickId ? String(item[pickId] || item.id || item.code || item.name) : undefined,
                code: item.code || item.fiat_code || item.coin_code || item.blockchain || item.name,
                name: item.name || item.description || item.code || item.coin_code || item.fiat_code,
                description: item.description || undefined
            };
        });
    }

    app.get('/banxa/fiats', function(req, res) {
        request({
            url: baseUrl + '/' + partner + '/v2/fiats/buy',
            method: 'GET',
            headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
            json: true
        }, function(error, response, body) {
            if (error) {
                res.status(502).send({ error: error.message });
                return;
            }

            var fiats = body && body.data ? (body.data.fiats || body.data || []) : [];
            res.status(response && response.statusCode ? response.statusCode : 500).send({
                data: normalizeOptions(fiats)
                    .filter(function(item) { return !!item.code; })
                    .map(function(item) { return { code: item.code, name: item.name }; })
            });
        });
    });

    app.get('/banxa/currencies', function(req, res) {
        request({
            url: baseUrl + '/' + partner + '/v2/crypto/buy',
            method: 'GET',
            headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
            json: true
        }, function(error, response, body) {
            if (error) {
                res.status(502).send({ error: error.message });
                return;
            }

            var currencies = body && body.data ? (body.data.crypto || body.data.currencies || body.data || []) : [];
            res.status(response && response.statusCode ? response.statusCode : 500).send({
                data: normalizeOptions(currencies)
                    .filter(function(item) { return !!item.code; })
                    .map(function(item) { return { code: item.code, name: item.name }; })
            });
        });
    });

    app.get('/banxa/payment-methods', function(req, res) {
        request({
            url: baseUrl + '/' + partner + '/v2/payment-methods/buy',
            method: 'GET',
            qs: req.query.fiatCode ? { fiatCode: req.query.fiatCode } : {},
            headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
            json: true
        }, function(error, response, body) {
            if (error) {
                res.status(502).send({ error: error.message });
                return;
            }

            var paymentMethods = body && body.data ? (body.data.paymentMethods || body.data.payment_methods || body.data || []) : [];
            res.status(response && response.statusCode ? response.statusCode : 500).send({
                data: normalizeOptions(paymentMethods, 'id').map(function(item) {
                    return {
                        id: item.id || item.code,
                        name: item.name,
                        code: item.code,
                        description: item.description
                    };
                })
            });
        });
    });

    app.get('/banxa/quotes', function(req, res) {
        request({
            url: baseUrl + '/' + partner + '/v2/quotes/buy',
            method: 'GET',
            qs: {
                source: req.query.fiatCode,
                source_amount: req.query.fiatAmount,
                target: req.query.coinCode,
                wallet_address: req.query.walletAddress,
                blockchain: req.query.blockchain,
                paymentMethodId: req.query.paymentMethodId
            },
            headers: { 'x-api-key': apiKey, 'Accept': 'application/json' },
            json: true
        }, function(error, response, body) {
            if (error) {
                res.status(502).send({ error: error.message });
                return;
            }

            var quote = body && body.data ? (body.data.quote || body.data.prices || body.data) : {};
            res.status(response && response.statusCode ? response.statusCode : 500).send({
                data: {
                    fiatCode: quote.fiat_code || req.query.fiatCode,
                    fiatAmount: Number(quote.fiat_amount || req.query.fiatAmount || 0),
                    coinCode: quote.coin_code || req.query.coinCode,
                    coinAmount: Number(quote.coin_amount || 0),
                    price: Number(quote.spot_price_including_fee || quote.spot_price || 0),
                    networkFee: Number(quote.network_fee || 0),
                    feeAmount: Number(quote.fee_amount || quote.spot_price_fee || 0),
                    paymentMethodId: String(quote.payment_method_id || req.query.paymentMethodId || ''),
                    paymentMethodName: quote.payment_method_name,
                    blockchain: quote.blockchain || req.query.blockchain,
                    walletAddress: quote.wallet_address || req.query.walletAddress
                }
            });
        });
    });

    app.post('/banxa/orders/buy', function(req, res) {
        request({
            url: baseUrl + '/' + partner + '/v2/buy',
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Accept': 'application/json', 'Content-Type': 'application/json' },
            json: {
                account_reference: req.body.accountReference || req.body.walletAddress,
                source: req.body.fiatCode,
                source_amount: req.body.fiatAmount,
                target: req.body.coinCode,
                wallet_address: req.body.walletAddress,
                blockchain: req.body.blockchain,
                paymentMethodId: req.body.paymentMethodId,
                return_url_on_success: req.body.returnUrl
            }
        }, function(error, response, body) {
            if (error) {
                res.status(502).send({ error: error.message });
                return;
            }

            var order = body && body.data ? (body.data.order || body.data) : {};
            res.status(response && response.statusCode ? response.statusCode : 500).send({
                data: {
                    orderId: String(order.id || ''),
                    checkoutUrl: order.checkout_url || order.checkoutUrl || ''
                }
            });
        });
    });

    app.listen(port, function () {
        console.log('Banxa proxy server listening on port ' + port);
    });
}

createBanxaProxy(7005);
