const http = require('http');
const url = require('url');
const querystring = require('querystring');
const { Configuration, OpenAIApi } = require('openai');
const { create } = require('domain');

const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"
const eodApi = "63a2477acc2587.58203009"

  // openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
  });
  const openai = new OpenAIApi(configuration);

  function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
}

const server = http.createServer((req, res) => {
    //Handle CORS preflight request
    if(req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.end();
    } else {
        handleRequest(req, res);
    }
});

function handleRequest(req, res) {
    if (req.method === 'POST' && req.url === '/api_search') {
        let body = '';
        req.on('data', (chunk) => {
        body += chunk.toString();
        });
        req.on('end', () => {
        const queryString = JSON.stringify(querystring.parse(body));
        api_search(queryString, (output) => {
            setCorsHeaders(res);
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



async function api_search(queryString, callback) {
  console.log("api_search called with queryString:", queryString);
  const isDataValid = await validateData(queryString);
  console.log("validateData returned:", isDataValid);
  console.log("Data is indeed a financial question, quantifying request type.");
  const quantifiedRequestType = await quantifyRequestType(queryString);
  console.log("quantifyRequestType returned:", quantifiedRequestType);
  const extractedInfoByRequest = await extractInfo(queryString, quantifiedRequestType);
  console.log("extractInfo returned:", extractedInfoByRequest);
  const apiLink = await createApiLink(extractedInfoByRequest, quantifiedRequestType);
  console.log("constructApiLink returned:", apiLink);
  const apiCallData = await apiCall(apiLink);
  console.log("apiCall returned:", apiCallData);
  const summarizedData = await summarizeData(apiCallData);
  console.log("summarizeData returned:", summarizedData);
return summarizedData;
}

async function validateData(queryString) {
  const response = await openai.createCompletion({
      model: "text-ada-001",
      prompt: `View this query, analyze it, determine the sentiment. Respond only with y or n depending on if the query is related to financial information. Here is the query: ${queryString}`,
      max_tokens: 1500,
      temperature: .5,
      stop: "/n",
  });
  return response.data.choices[0].text;
}

async function quantifyRequestType(queryString) {
      const requestType = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `View the input, and then select from a list of options what the user is trying to do. 
          RESPOND ONLY WITH THE TITLE OF THE OPTION IN THE PARENTHESIS. DO NOT ADD ANY OTHER COMMENTARY."${queryString}"
          Option 1 (real-time). Getting current price of a specific stock?(if this, respond only with real-time)
          Option 2 (fundamentals). Getting fundamentals of a cryptocurrency or stock(if this, respond only with fundamentals)
          Option 3 (insider-transactions). Getting insider transactions(if this, respond only with insider-transactions)
          Option 4 (calendar/earnings). Getting upcoming earnings of a stock(if this, respond only with calendar/earnings
          Option 5 (calendar/ipos). Getting upcoming ipo filings, (if this, respond only with calendar/ipos))`,
          max_tokens: 3000,
          temperature: .5,
          stop: "/n",
      });
      return requestType.data.choices[0].text; 
}
// modified extractInfo function that will work by running one call and extracting the info from it.
async function extractInfo(queryString) {
  const reformattedInput = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Extract the datapoints in this query. Respond in this format. If there is an N/A in any of the variables, don't include them in the response. (stockName: {extractedStockTicker}, fromDate: {fromDate}, toDate: {toDate}) 
             Here are potential datapoints: 
             Stock Ticker Name (formatted as ticker symbol alone)
             from date(mm-dd-yyyy)
             to date(mm-dd-yyyy).
             Here is the query: ${queryString}`,
             max_tokens: 3000,
             temperature: .5,
             stop: "/n",  
  });
  return reformattedInput.data.choices[0].text;
}

// modified formatToApiLinkConstructors function that will work in one step to take in the extractInfo and the request type and construct a whole link.
async function createApiLink(extractedInfoByRequest, quantifiedRequestType) {
  const firstResponse = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Follow this workflow.
             1.Take the extractedInfo data that is being passed in and apply api link formatting to them. Here are potential formattings: {extractedStockTicker}.us?, &from={fromDate}, &to={toDate}.
             2.Take the reformatted extractedInfo data, processed in step 1, and construct an API link. Follow this formatting. If there are other points, add them to the link. https://www.eodhistoricaldata.com/api/${quantifiedRequestType}/{reformattedStockName}api_token=63a2477acc2587.58203009{fromDate, if applicable}{toDate, if applicable}
             3. At the end of the link add in &fmt=json
             4. Make sure it's in the correct order: Stockname, api_key, fromDate, toDate, &fmt=json.
             5. Return the constructed apilink. Do not preface it with "Answer:" that shit is annoying.
             Here is the extracted info to modify:${extractedInfoByRequest}.`,
    max_tokens: 3000,
    temperature: .5,
    stop: "/n",
  });
 return firstResponse.data.choices[0].text;
}




async function apiCall(apiLink) {
  const response = await fetch(apiLink);
  return response.json();
}

async function summarizeData(apiCallData, queryString) {
  const apiCallDataString = JSON.stringify(apiCallData)
  const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `Craft a response based on this Make it quick and direct Only give analysis of the data based on the question about it, so if they are asking for a specific point, that means you should only pair it with that point. If it is more of a general question, provide general analysis.. 
              Data: ${apiCallDataString} 
              Question: ${queryString}
              Response:`,
      max_tokens: 3000,
      temperature: .5,
      stop: "/n"
  });
  return response.data.choices[0].text;
}
