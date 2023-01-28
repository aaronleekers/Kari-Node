const http = require('http');
const { Configuration, OpenAIApi } = require('openai');
const { eodRequest } = require('./eodRequest');
const { fundamentalsStockRequest } = require('./fundamentalsStockRequest');
const { bulkRequest } = require('./bulkRequest');
const { fundamentalsCryptoRequest } = require('./fundamentalsCryptoRequest');
const { macroRequest } = require('./macroRequest');
const { realTimeRequest } = require('./realTimeRequest');


// Compare the stocks TSLA, AAPL, MCD
// Compare Ford, General Motors, and Tesla's price performance on January 25, 2023.
// Compare The S&P 500 ETF, Coca Cola, and McDonald's price performance on January 6, 2021.
// What are the fundamentals of bitcoin?
// What is the max supply of Avalanche?
// What is the market dominance of Ethereum?
// "How has the SPY performed over the last year?"
// "How has Microsoft performed between jan 2019 and jan 2020?"
// "Get me historical performance for SPY over the last week"
// "What is the current price of SPY?"
// "What are the latest price movements of AMZN?"
// "What the current volume traded for SPY?"
// "What is the current interest rate for the US?"
// "What is the total population of the US?"
// "What is the annual population growth of the US?"
// "What is the current inflation rate of the US?"
// "What is the current CPI for the US?"
// "What is the current GDP of the US?"
// "What is the current GDP per capita of the US?"
// "What is the GDP growth of the US this year?"
// "What is the current debt to GDP ratio?"
// "What is the current GNI?"
// "What is the current GNI per capita?"
// "What is the current fertility rate of the US?"
// "What is the current unemployment rate?"
// Get me the latest balance sheet for AAPL
// Get me the latest income statement for AAPL
// Get me the latest cash flow statement for AAPL
// Get me the latest statement of shareholders equity for AAPL
// How much did Apple earn this year?
// How much cash does AAPL have on its balance sheet?
// How much cash flow came from investing activities for AAPL 

const orgId = process.env.ORG_ID;
const apiKey = process.env.API_KEY;

// openAI auths
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);


const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://chat.openai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  //Handle CORS preflight request
  if(req.method === 'OPTIONS') {
    res.end();
  } else {
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
 1: eodRequest, // COMPLETE
 2: realTimeRequest, // COMPLETE 
 3: fundamentalsStockRequest, // NOT COMPLETE // TO BE CHECKED OFF AFTER 6
 4: fundamentalsCryptoRequest, // COMPLETE 
 5: bulkRequest, // COMPELTE
 6: macroRequest, // COMPLETE 
}

// overall workflow. Decides which sub-workflow to execute, executes it, then returns the response.
async function api_search(queryString) {
  console.log("api_search called with queryString:", queryString);
  const requestType = await qualifyRequestType(queryString);
  const intRequest = parseInt(requestType);
  console.log("Request Type:",intRequest);
  const requestOutput = await requestFunctions[intRequest](queryString);
  return requestOutput;
}

