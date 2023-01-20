const http = require('http');
const url = require('url');
const querystring = require('querystring');
const { Configuration, OpenAIApi } = require('openai');
const { create } = require('domain');

const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"

  // openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
  });
  const openai = new OpenAIApi(configuration);

  const allowedOrigin = 'https://chat.openai.com';

  async function setCorsHeaders(req, res) {
      const origin = req.headers.origin;
      if (origin === allowedOrigin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
      }
      res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  }
  

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

async function handleRequest(req, res) {
    if (req.method === 'POST' && req.url === '/api_search') {
        let body = '';
        req.on('data', (chunk) => {
        body += chunk.toString();
        });
        req.on('end', () => {
        const queryString = JSON.stringify(querystring.parse(body));
        api_search(queryString, (output) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ output }));
        });
        });
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello, World!');
    } else {
        res.writeHead(404);
        res.end();
    }
}

server.listen(3000, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:3000');
});

const requestFunctions = {
  "intraday": intradayRequest,
  "fundamentals-stock": fundamentalsStockRequest,
  "real-time": realTimeRequest,
  "calendar/earnings": earningsRequest,
  "eod-bulk-last-day": bulkRequest,
  "search": searchRequest,
  "macro-indicators": macroRequest,
  "fundamentals-crypto": fundamentalsCryptoRequest,
  "exchanges-list": exchangesListRequest
}

async function api_search(queryString, callback) {
  console.log("api_search called with queryString:", queryString);
  const requestType = await qualifyRequestType(queryString);
  console.log("Request Type:",requestType);
  if (requestFunctions[requestType]) {
    const requestOutput = await requestFunctions[requestType](queryString);
    console.log("Request Output:", requestOutput);
    callback(requestOutput);
  } else {
    console.log("Invalid request type:", requestType);
  }
}

async function qualifyRequestType(queryString) {
  const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `
      Instructions: View this query, analyze the intent behind it, and select from a list of options that best reflects the user's intent based on the query.
      Query: ${queryString}
      Options:
      Option 1 (intraday): Intraday Historical Prices over a range of time. If the user is asking for a list of prices over a range of time on a specific stock.
      Option 2 (fundamentals-stock): Fundamentals for a stock. If user is using the word fundamentals, or wants to know specifics of an organization like financials of a specific quarter, that is found here.
      Option 3 (real-time): For current prices of stocks at the moment they're asked about. If user uses word like "current price" it is likely asking for this category.
      Option 4 (calendar/earnings): If the user uses the word earnings and gives a time range, it is likely wanting this category.
      Option 5 (eod-bulk-last-day): If the user asks for all stocks in the market over the last day. If user is asking for insights based on the market movements without specifiying a specific stock or time range, it is likely this category.
      Option 6 (search): If the user appears to be searching for specific stocks by name or is searching for possible stocks under a name. Basically choose this if they are looking for a specific list of stocks.
      Option 7 (macro-indicators): If the user is asking for any indicators that would give insights about macroeconomic trends, such as CPI or other macroeconomic datapoints.
      Option 8 (fundamentals-crypto): Fundamentals for a cryptocurrency. if the user is asking for info on a cryptocurrency or uses the word crypto or cryptocurrency, choose this category.
      Option 9 (exchanges-list): If user appears to want to view all the stock tickers or view a list of exchanges, choose this.
      Output: choose a number 1-9 representing the option. output only the number.
      `,
      max_tokens: 3000,
      temperature: .5,
      stop: "/n",
  });
  return response.data.choices[0].text;
} 
async function intradayRequest(queryString){
   // workflow Function
   var extractedInfo = await extractInfo(queryString);
   var apiLink = await createApiLink(extractedInfo);
   var apiCallData = await apiCall(apiLink);
   var summarizedData = await summarizeData(apiCallData);
   console.log(`Data Returned: ${summarizedData}`);
   // extractInfo function
   async function extractInfo(queryString) {
       const extractedInfo = await openai.createCompletion({
           model: "text-davinci-003",
           prompt: `
           Extract the datapoints in this query. 
           Respond in this format: 
           stockName: extractedStockTicker, 
           fromDate: fromDate, (YYYY-MM-DD)
           toDate: toDate (YYYY-MM-DD)
           interval: interval. (can only be 1m, 5m, or 1h)
           Defaults if N/A: fromDate: 01/01/2023 toDate: 01/19/2023 interval: 1h
           Query: ${queryString}`,
           max_tokens: 3000,
           temperature: .5,
           stop: "/n",
       });
       return extractedInfo.data.choices[0].text;
   }
   // createApiLink function
   async function createApiLink(extractedInfo, quantifiedRequestType) {
       const apiLink = await openai.createCompletion({
           model: "text-davinci-003",
           prompt: `
           Follow this workflow:
           CONVERT DATES TO YYYY-MM-DD.
           Instructions. Replace the variables in this link with the variables that were passed and return the link alone.
           Link: https://www.eodhistoricaldata.com/api/intraday/{stockName}.US?api_token=63a2477acc2587.58203009&from=fromDate&to=toDate&interval=interval&fmt=json
           Variables: ${extractedInfo}`,
           max_tokens: 3000,
           temperature: .5,
           stop: "/n",
       });
       return apiLink.data.choices[0].text;
   }
   // apiCall function
   async function apiCall(apiLink) {
       const response = await fetch(apiLink);
       return response.json();
   }
   // summarizeData function
   async function summarizeData(apiCallData, queryString) {
       const apiCallDataString = json.stringify(apiCallData)
       const response = await openai.createCompletion({
           model: "text-davinci-003",
           prompt: `
           Craft a brief response and summary of this data. 
           Convert values to be tailored towards a retail investor.
           Data: ${apiCallDataString}
           Question: ${queryString}
           Response:`,
           max_tokens: 3000,
           temperature: .5,
           stop: "/n",
       })
       return response.data.choices[0].text
   }
}
async function realTimeRequest(queryString){
// workflow Function
var extractedInfo = await extractInfo(queryString);
console.log("")
var apiLink = await createApiLink(extractedInfo);
var apiCallData = await apiCall(apiLink);
var summarizedData = await summarizeData(apiCallData);
console.log(`Data Returned: ${summarizedData}`);
// extractInfo function
async function extractInfo(queryString) {
    const extractedInfo = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Extract the datapoints in this query. 
        Respond in this format: 
        stockName: extractedStockTicker, 
        Defaults if N/A: stockName: AAPL
        Query: ${queryString}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    });
    return extractedInfo.data.choices[0].text;
}
// createApiLink function
async function createApiLink(extractedInfo, quantifiedRequestType) {
    const apiLink = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Follow this workflow:
        Instructions. Replace the variables in this link with the variables that were passed and return the link alone.
        Link: https://www.eodhistoricaldata.com/api/real-time/{stockName}.US?api_token=63a2477acc2587.58203009&fmt=json
        Variables: ${extractedInfo}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    });
    return apiLink.data.choices[0].text;
}
// apiCall function
async function apiCall(apiLink) {
    const response = await fetch(apiLink);
    return response.json();
}
// summarizeData function
async function summarizeData(apiCallData, queryString) {
    const apiCallDataString = json.stringify(apiCallData)
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Craft a brief response and summary of this data. 
        Convert values to be tailored towards a retail investor.
        Data: ${apiCallDataString}
        Question: ${queryString}
        Response:`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    })
    return response.data.choices[0].text
}
}
async function earningsRequest(queryString){
  // workflow Function
var extractedInfo = await extractInfo(queryString);
var apiLink = await createApiLink(extractedInfo);
var apiCallData = await apiCall(apiLink);
var summarizedData = await summarizeData(apiCallData);
console.log(`Data Returned: ${summarizedData}`);
// extractInfo function
async function extractInfo(queryString) {
    const extractedInfo = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Extract the datapoints in this query. 
        Respond in this format: 
        stockName: extractedStockTicker,
        fromDate: fromDate,
        toDate: toDate, 
        Defaults if N/A: stockName: AAPL
        Query: ${queryString}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    });
    return extractedInfo.data.choices[0].text;
}
// createApiLink function
async function createApiLink(extractedInfo) {
    const apiLink = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Follow this workflow:
        CONVERT DATES TO YYYY-MM-DD.
        Instructions. Replace the variables in this link with the variables that were passed and return the link alone.
        Link: https://www.eodhistoricaldata.com/api/calendar/earnings?api_token=63a2477acc2587.58203009&fmt=json&from=fromDate&to=toDate
        Variables: ${extractedInfo}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    });
    return apiLink.data.choices[0].text;
}
// apiCall function
async function apiCall(apiLink) {
    const response = await fetch(apiLink);
    return response.json();
}
// summarizeData function
async function summarizeData(apiCallData, queryString) {
    const apiCallDataString = json.stringify(apiCallData)
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Craft a brief response and summary of this data. 
        Convert values to be tailored towards a retail investor.
        Data: ${apiCallDataString}
        Question: ${queryString}
        Response:`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    })
    return response.data.choices[0].text
}
}
async function fundamentalsStockRequest(queryString){
}

async function bulkRequest(queryString){
}
async function searchRequest(queryString){
}
async function macroRequest(queryString){
}
async function fundamentalsCryptoRequest(queryString){
}
async function exchangesListRequest(queryString){
}






