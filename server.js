const http = require('http');
const { Configuration, OpenAIApi } = require('openai');
const { eodRequest } = require('./eodRequest');
const { fundamentalsStockRequest } = require('./fundamentalsStockRequest');
const { bulkRequest } = require('./bulkRequest');
const { fundamentalsCryptoRequest } = require('./fundamentalsCryptoRequest');
const { macroRequest } = require('./macroRequest');
const { realTimeRequest } = require('./realTimeRequest');

const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0";
const apiKey = "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";

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);
// set Cors Headers
  async function setCorsHeaders(req, res) {
      const allowedOrigin = 'https://chat.openai.com';
      const origin = req.headers.origin;
      if (origin === allowedOrigin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
      }
      res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
}
// make Server
  const server = http.createServer((req, res) => {
    //Handle CORS preflight request
    if(req.method === 'OPTIONS') {
      setCorsHeaders(req, res);
      res.end();
    } else {
        setCorsHeaders(req, res);
        handleRequest(req, res);
    }
});
// main handleRequest function, takes in request body and runs it through api_search
async function handleRequest(req, res) {
    if (req.method === 'POST' && req.url === '/api_search') {
        let body = '';
        req.on('data', (chunk) => {
        body += chunk.toString();
        });
        req.on('end', async () => {
          const parsedBody = JSON.parse(body);
          const queryString = JSON.stringify(parsedBody.input.query);
          const requestOutput = await api_search(queryString);
          res.end(JSON.stringify(requestOutput));       
        });
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello, World!');
    } else {
        res.writeHead(404);
        res.end();
    }
}
// server listening for requests
server.listen(3000, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:3000');
});

// returns a number 1-6 based on the assigned requestType.
async function qualifyRequestType(queryString) {
  const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `View the query. Scan for associated keywords and analyze user sentiment. Respond with the appropriate choice, represented only by the associated number. One of these choices is correct. Respond only with one of these choices, do not respond with any other value than 1-6.
      1: eodRequest (Historical stock prices over time) - (keywords/themes: stock price, historical, over a range, performed) (Potential Arguments: from-to time range, stock ticker symbol or stock name)
      2: realTimeRequest (Current prices of one stock) - (keywords/themes: live, current, right now, stock price) (Potential Arguments: stock ticker symbol or stock name) 
      3: fundamentalsStockRequest (Company fundamentals, such as earnings statements, income statements, all sorts of filings for a specific company.) - (keywords/themes: fundamentals, income statement, earnings, balance sheet, dividend yield, etc) (Potential Arguments: stock ticker symbol or stock name)
      4: fundamentalsCryptoRequest (Crypto fundamentals, such as market capitalization, trading volume, max supply, and more metrics specifically related to a cryptocurrency.) - (keywords/themes: fundamentals, cryptocurrency, BTC, ETH, Ripple, Litecoin, Bitcoin, Avalanche) (Potential Arguments: cryptocurrency symbol or name)
      5: bulkRequest (multiple stocks, or whole market data for current EOD, or for historical day.) - (keywords/themes: stock prices, historical, compare, each other, etc) (Potential Arguments: Multiple stock symbols, date)
      6: macroRequest (Macroeconomic indicators of countries, all sorts of macroeconomic indicators) - (keywords/themes: country, gdp, growth, annual, consumer, ppi, cpi, gni, life expectancy, co2 emissions, unemployment, real interest rate, population, inflation, net trades, net migration.) (Potential Arguments: country, indicator)
      Here is the input. ${queryString}`,
      max_tokens: 3000,
      temperature: .5,
      stop: "/n",
  });
  return response.data.choices[0].text;
} 
// maps possible requestTypes to an array of associated functions for callback. functions are below.
const requestFunctions = {
 1: eodRequest, // NOT COMPLETE
 2: realTimeRequest, // NOT COMPLETE 
 3: fundamentalsStockRequest, // NOT COMPLETE
 4: fundamentalsCryptoRequest, // NOT COMPLETE
 5: bulkRequest, // NOT COMPELTE
 6: macroRequest, // NOT COMPLETE 
}

// overall workflow. Decides which sub-workflow to execute, executes it, then returns the response.
async function api_search(queryString) {
  console.log("api_search called with queryString:", queryString);
  const requestType = await qualifyRequestType(queryString);
  const intRequest = parseInt(requestType);
  console.log("Request Type:",intRequest);
  console.log(typeof intRequest);
  const requestOutput = await requestFunctions[intRequest](queryString);
  console.log(requestOutput);
  return requestOutput;
}

