var express = require('express'),
  request = require('request'),
  bodyParser = require('body-parser');

function createProxy(mainnetURL, testnetURL, port) {
  var app = express();
  var myLimit = typeof process.argv[2] != 'undefined' ? process.argv[2] : '500kb';
  console.log('Using limit: ', myLimit);

  app.use(bodyParser.json({ limit: myLimit }));

  app.all('*', function (req, res, next) {
    // Allow CORS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, PATCH, POST, DELETE');
    res.header('Access-Control-Allow-Headers', req.header('access-control-request-headers'));

    if (req.method === 'OPTIONS') {
      // CORS Preflight
      res.sendStatus(204);
    } else {
      let targetURL = mainnetURL;

      if (req.url.includes('/Wallet/NetworkBalances')) {
        handleBalanceRequest(req, res, testnetURL);
      } else if (req.url.includes('/v1/latestTick')) {
        handleTickRequest(req, res, testnetURL);
      } else if (req.url.includes('/v1/status')) {
        handleStatusRequest(req, res, testnetURL);
      } else if (req.url.includes('/broadcast-transaction') || req.url.includes('/querySmartContract')) {
        forwardRequest(req, res, testnetURL);
      } else {
        forwardRequest(req, res, targetURL);
      }
    }
  });

  app.set('port', port);
  app.listen(app.get('port'), function () {
    console.log('Proxy server listening on port ' + app.get('port'));
  });
}

function handleStatusRequest(req, res, testnetURL) {
  let localVarPath = `/tick-info`;
  request(
    {
      url: testnetURL + localVarPath,
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: req.header('Authorization') },
      json: true,
    },
    (error, response, body) => {
      if (error) {
        if (!res.headersSent) {
          res.status(500).send({ error: 'Proxy error' });
        }
      } else {
        const statusResponse = {
          lastProcessedTick: {
            tickNumber: body.tickInfo?.tick,
            epoch: body.tickInfo?.epoch,
          },
          lastProcessedTicksPerEpoch: {
            additionalProp1: 0,
            additionalProp2: 0,
            additionalProp3: 0,
          },
          skippedTicks: [], // Assuming no skipped ticks for simplicity
          processedTickIntervalsPerEpoch: [
            {
              epoch: body.tickInfo?.epoch,
              intervals: [
                {
                  initialProcessedTick: body.tickInfo?.initialTick,
                  lastProcessedTick: body.tickInfo?.tick,
                },
              ],
            },
          ],
        };
        res.status(200).send(statusResponse);
      }
    }
  );
}

function handleBalanceRequest(req, res, testnetURL) {
  let result = [];
  let publicIds = req.body;
  let promises = publicIds.map((publicId) => {
    let localVarPath = `/balances/${publicId}`;
    return new Promise((resolve, reject) => {
      request(
        {
          url: testnetURL + localVarPath,
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: req.header('Authorization') },
          json: true,
        },
        (error, response, body) => {
          if (error) {
            return reject(error);
          }
          let modifiedResponse = {
            publicId: body.balance?.id,
            amount: Number(body.balance?.balance),
            tick: Number(body.balance?.validForTick),
          };
          result.push(modifiedResponse);
          resolve();
        }
      );
    });
  });

  Promise.all(promises)
    .then(() => {
      res.status(200).send(result);
    })
    .catch((error) => {
      if (!res.headersSent) {
        res.status(500).send({ error: 'Proxy error' });
      }
    });
}

function handleTickRequest(req, res, testnetURL) {
  let localVarPath = `/tick-info`;
  request(
    {
      url: testnetURL + localVarPath,
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: req.header('Authorization') },
      json: true,
    },
    (error, response, body) => {
      if (error) {
        console.error('Error: ', error);
        if (!res.headersSent) {
          res.status(500).send({ error: 'Proxy error' });
        }
        return;
      }

      let modifiedResponse = {
        latestTick: body.tickInfo?.tick,
      };

      if (!res.headersSent) {
        res.json(modifiedResponse);
      }
    }
  );
}

function forwardRequest(req, res, targetURL) {
  console.log('API CALL: ' + req.method + '\t' + targetURL + req.url);
  request(
    {
      url: targetURL + req.url,
      method: req.method,
      json: req.body,
      headers: { Authorization: req.header('Authorization') },
    },
    (error, response, body) => {
      if (error) {
        console.error('Error: ', error);
        if (!res.headersSent) {
          res.status(500).send({ error: 'Proxy error' });
        }
        return;
      }
      res.json(body);
    }
  );
}

const apiURL = 'https://api.qubic.li';
const apiArchiverURL = 'https://testapi.qubic.org';
const testnetURL = 'http://116.202.157.215:8000';

// Create a proxy that routes requests based on the URL
createProxy(apiURL, testnetURL, 7003);
createProxy(apiArchiverURL, testnetURL, 7004);
