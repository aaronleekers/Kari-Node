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
// server listening for requests
server.listen(3000, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:3000');
});
// returns a number 1-7 based on the assigned requestType.
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
      Option 6 (macro-indicators): If the user is asking for any indicators that would give insights about macroeconomic trends, such as CPI or other macroeconomic datapoints.
      Option 7 (fundamentals-crypto): Fundamentals for a cryptocurrency. if the user is asking for info on a cryptocurrency or uses the word crypto or cryptocurrency, choose this category.
      Output: choose a number 1-9 representing the option. output only the number.
      `,
      max_tokens: 3000,
      temperature: .5,
      stop: "/n",
  });
  return response.data.choices[0].text;
} 
// maps possible requestTypes to an array of associated functions for callback. functions are below.
const requestFunctions = {
  1: eodRequest,
  2: fundamentalsStockRequest,
  3: realTimeRequest,
  4: earningsRequest,
  5: bulkRequest,
  6: macroRequest,
  7: fundamentalsCryptoRequest,
}
// overall workflow. Decides which sub-workflow to execute, executes it, then returns the response.
async function api_search(queryString, callback) {
  console.log("api_search called with queryString:", queryString);
  const requestType = await qualifyRequestType(queryString);
  const intRequest = parseInt(requestType);
  console.log("Request Type:",intRequest);
  console.log(typeof intRequest);
  if (requestFunctions[intRequest]) {
    const requestOutput =  requestFunctions[intRequest](queryString);
    console.log("Request Output:", requestOutput);
    callback(requestOutput);
  } else {
    console.log("Invalid request type:", intRequest);
  }
}

// all the possible requestType workflows
  // EOD Historical - Complete -  Not Tested
  async function eodRequest(queryString){
    // workflow Function
    var currentTime = new Date();
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
            periodTime: period. (can only be d, w, or m)
            Defaults if N/A: fromDate: ${currentTime} minus one week, toDate: ${currentTime} interval: 1h
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
        1. Replace the variables in this link with the variables that were passed in.
        2. All variables passed in this link should be, stockName, fromDate, toDate, period. 
        Link: https://www.eodhistoricaldata.com/api/eod/stockName.US?api_token=63a2477acc2587.58203009&fmt=json&from=fromDate&to=toDate&period=periodTime
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
    const data = response.json();
    return data;
  }
  
  // summarizeData function
  async function summarizeData(apiCallData, queryString) {
    const apiCallDataString = json.stringify(apiCallData)
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Craft a brief response and summary of this data. 
        Make values properly formatted with decimals and commas.
        Answer the question using the data.
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

  // Real Time - Complete - Not Tested
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
          Defaults if N/A: stockName: SPY
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
          Make values properly formatted with decimals and commas.
          Answer the question using the data.
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

  // Earnings Historical - Complete - Not Tested
  async function earningsRequest(queryString){
    // workflow Function
  var currentTime = new Date();
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
          fromDate: fromDate in YYYY-MM-DD
          toDate: todate in YYYY-MM-DD
          Defaults if N/A: stockName: AAPL, fromDate: ${currentTime} minus one week. ToDate: ${currentTime}
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
          1. Replace the variables in this link with the variables that were passed in.
          2. All variables passed in this link should be, stockName, fromDate, toDate. 
          Link: https://www.eodhistoricaldata.com/api/earnings/calendar/stockName.US?api_token=63a2477acc2587.58203009&fmt=json&from=fromDate&to=toDate
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
          Make values properly formatted with decimals and commas.
          Answer the question using the data.
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

  // Stock Fundamentals - Not Complete & Nuanced - Not Tested
  async function fundamentalsStockRequest(queryString){

  }

  // bulkStocks - Complete & Nuanced - Not Tested
  async function bulkRequest(queryString){
    // Overall Workflow
    console.log("Starting Bulk stock Search!")
    var currentTime = new Date();
    var typeOfCall = await quantifyRequestType(queryString);
    var extractedDate = await extractDate(queryString);
    var extractedSecurities = await extractSecurities(queryString);
    var apiLink = await createApiLink(typeOfCall, extractedDate, extractedSecurities);
    var apiCallData = await apiCall(apiLink);
    var summarizeData = await summarizeData(apiCallData);

    async function quantifyRequestType(queryString){
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        View this query. If you see the word dividend, or feel that the 
        user is trying to get information about dividends, respond only with dividend. 
        Likewise, if a user uses the word split, or is attempting to get info about stock splits, 
        respond with the word split.
        Here is the query: ${queryString}`,
        max_tokens: 3000,
        stop: "/n",
      })
    return response.data.choices[0].text;
    }

    async function extractDate(queryString){
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        View this query, extract the relevant date from it and respond with the extracted datapoints in the below formatting:
        date: YYYY-MM-DD
        If there is no date, respond with N/A.
        Here is the query: ${queryString}`,
        max_tokens: 3000,
        stop: "/n"
      })
      return response.data.choices[0].text;
    }

    async function extractSecurities(queryString){
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `View this query, look for stock tickers or company names. Format names or stock tickers into list separated by commas.
        For example, if someone is asking for microsoft, apple, and tesla, respond with MSFT,AAPL,TSLA. If there is only one stock request, respond with the one stock ticker with nothing else.
        Here is the query: ${queryString}`,
        max_tokens: 3000,
        stop: "/n"
      })
      return response.data.choices[0].text;
    }
    async function createApiLink(typeOfCall, extractedDate, extractedSecurities){
      const apiLink = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Follow this workflow:
          1. Replace the variables in this link with the variables that were passed in below.
          2. All variables passed in this link should be: typeOfCall, queryDate, stockSymbols. If the word "dividends" or "splits" is present in the typeofRequest, add &type=dividends or &type=splits to the end of the api call depending on what type it is. Don't add &type if neither dividends or splits comes up.
          If the date is N/A, pass in ${currentTime} instead.
          Link: https://www.eodhistoricaldata.com/api/eod-bulk-last-day/US?api_token=63a2477acc2587.58203009&fmt=json&symbols=stockSymbols&date=queryDate
        Variables: ${typeOfCall}, ${extractedDate}, ${extractedSecurities}, `,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    });
    return apiLink.data.choices[0].text;
    }

    async function apiCall(apiLink){
      const response = await fetch(apiLink);
      return response.json();
    }

    async function summarizeData(apiCallData, queryString){
      const apiCallDataString = json.stringify(apiCallData)
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Craft a brief response and summary of this data. 
        Make values properly formatted with decimals and commas.
        Answer the question using the data.
        Data: ${apiCallDataString}
        Question: ${queryString}
        Response:`
      })
      return response.data.choices[0].text;
    }
  }

  // macroIndicators - Complete & Nuanced - Not Tested
  async function macroRequest(queryString){
   // workflow Function
   var country = await extractCountry(queryString);
   var indicator = await extractIndicator(queryString);
   console.log(country, indicator);
   var apiLink = await createApiLink(extractedInfo);
   console.log(apiLink)
   var apiCallData = await apiCall(apiLink);
   console.log(apiCallData);
   var summarizedData = await summarizeData(apiCallData);
   console.log(`Data Returned: ${summarizedData}`);

   // extractCountry function
   async function extractCountry(queryString) {
       const extractedCountryResponse = await openai.createCompletion({
           model: "text-davinci-003",
           prompt: `
           Extract the datapoints in this query. 
           Respond in this format, make sure to format country to the Alpha-3 ISO format country code. If the country is america, replace with USA. If france, FRA, etc.
           country: country,
           Defaults if N/A: country: USA
           Query: ${queryString}`,
           max_tokens: 3000,
           temperature: .5,
           stop: "/n",
       });
       return extractedCountryResponse.data.choices[0].text;
  }
   // extractIndicator function
  async function extractIndicator(queryString) {
      const extractedIndicatorResponse = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Choose What the user is attempting to find based on the input. 
        Choose from a selection of options and respond with the item next to the correct number alone. Basically its a word match and sentiment analysis. 
        Respond in this format: indicatorCode: indicator
        Query: ${queryString}
        Possible Options:
        1. real_interest_rate
        2. population_total
        3. population_growth_annual
        4. inflation_conumser_prices_annual
        5. consumer_price_index
        6. gdp_current_usd
        7. gdp_per_capita_usd
        8. gdp_growth_annual
        9. debt_percent_gdp
        10. net_trades_goods_services
        11. inflation_gdp_deflator_annual
        12. agriculture_value_added_percent_gdp
        13. industry_value_added_percent_gdp
        14. services_value_added_percent_gdp
        15. exports_of_goods_services_percent_gdp
        16. imports_of_goods_services_percent_gdp
        17. gross_capital_formation_percent_gdp
        18. net_migration
        19. gni_usd
        20. gni_per_capita_usd
        21. gni_ppp_usd
        22. gni_per_capita_ppp_usd
        23. income_share_lowest_twenty
        24. life_expectancy
        25. fertility_rate
        26. prevalence_hiv_total
        27. co2_emissions_tons_per_capita
        28. surface_area_km
        29. poverty_poverty_lines_percent_population
        30. revenue_excluding_grants_percent_gdp
        31. cash_surplus_deficit_percent_gdp
        32. startup_procedurs_register
        33. market_cap_domestic_companies_percent_gdp
        34. mobile_subscriptions_per_hundred
        35. internet_users_per_hundred
        36. high_technology_exports_percent_total
        37. merchandise_trade_percent_gdp
        38. total_debt_service_percent_gni
        39. unemployment_total_percent`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
      });
      return extractedIndicatorResponse.data.choices[0].text;
  }
   // createApiLink function
   async function createApiLink(country, indicator) {
       const apiLink = await openai.createCompletion({
           model: "text-davinci-003",
           prompt: `
           Follow this workflow:
           1. Replace the variables in this link with the variables that were passed in.
           2. All variables passed in this link should be, country, indicatorCode,
           link: https://eodhistoricaldata.com/api/macro-indicator/country?api_token=63a2477acc2587.58203009&fmt=json&indicator=indicatorCode
           Variables: ${country} ${indicator}`,
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
           Make values properly formatted with decimals and commas.
           Answer the question using the data.
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

  // cryptoFundamentals - Complete - Not Tested
  async function fundamentalsCryptoRequest(queryString){
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
          cryptoCurrency: extractedCryptoCurrencyPair, 
          cryptoTradingPair: extractedTradingPair
          Defaults if N/A: cryptoCurrency: BTC, cryptoTradingPair: USD
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
            1. Replace the variables in this link with the variables that were passed in.
            2. All variables passed in this link should be, cryptoCurrency, extractedTradingPair.
            Link: https://www.eodhistoricaldata.com/api/fundamentals/cryptoCurrency-extractedTradingPair.CC?api_token=63a2477acc2587.58203009&fmt=json
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
          Make values properly formatted with decimals and commas.
          Answer the question using the data.
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
  