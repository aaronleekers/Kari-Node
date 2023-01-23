const http = require('http');
const https = require("https");
const url = require('url');
const querystring = require('querystring');
const { Configuration, OpenAIApi } = require('openai');
const { create } = require('domain');
const axios = require('axios');
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

// all the possible requestType workflows
  // EOD Historical - Not Complete -  Not Tested - 5 Steps 
  async function eodRequest(queryString){
    // workflow Function
    console.log("extracting info!")
    var extractedStock = await extractStock(queryString); // STEP 1 // TESTING TOKENS: 1(AAPL) 2(TSLA) 3(JNJ)
    console.log("extractedStock:",extractedStock);
    var modifiedQueryString = await modifyQueryString(queryString);
    console.log("modifiedQueryString:",modifiedQueryString);
    var extractedTimeRange = await extractTimeRange(queryString, modifiedQueryString); // STEP 1.5 // TESTING TOKENS: 1(y) 2(q) 3(m) 4(w)
    console.log("extractedTimeRange", extractedTimeRange);
    var apiLink = await createApiLink(extractedTimeRange, extractedStock); // STEP 2 // TESTING TOKENS: I
    console.log("apiLink:",apiLink);
    console.log("Making API call now!"); // STEP 3
    const apiCallData = await apiCall(apiLink); // STEP 3.5 
    const summarizedData = await summarizeData(apiCallData); // STEP 4 // TESTING TOKENS: 
    console.log(`Data Returned: ${summarizedData}`);
    return summarizedData; // STEP 5 // FINAL

    // extractStock function
    async function extractStock(queryString) {
      const extractedStock = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Please extract the company name from the following sentence, 
        convert it to a stock ticker format, 
        and format the output as "stockName: (converted stock ticker)"
        For example: "Apple" to "stockName: AAPL" or "Ford" to "stockName: F"
        Sentence: ${queryString}
        `,
        max_tokens: 1024,
        temperature: .5,
        stop: "/n",
      })
      return extractedStock.data.choices[0].text;
    }

    // modifyQueryString
    async function modifyQueryString(queryString) {
      const date = new Date();
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();

      const response = await openai.createCompletion({
       model: "text-davinci-003", 
       prompt: `

       "Please modify the following queryString to correctly calculate the fromDate 
       based on the vague time range specified. Use the provided table to accurately 
       convert the vague time range into a specific from date and make sure that the 
       to date is the current date. Double check your work to ensure accuracy before 
       outputting the modified queryString."

       It is specific if there are two dates. 
       It is vague if it is referring to "x amount of time ago" or "over last x amount of time"


       Table:
       "last day": fromDate = (${year}-${month}-${day}) Minus one day (only subtract one day)
       "last week": fromDate = (${year}-${month}-${day}) Minus one week (only subtract one week)
       "last month": fromDate = (${year}-${month}-${day}) Minus one month (only subtract one month)
       "last quarter": fromDate = (${year}-${month}-${day}) Minus three months (only subtract three months)
       "last year": fromDate = (${year}-${month}-${day}) Minus one year 
       Values in between fill in accordingly. (last 6 months minus 6 months) 
       
       4. Example: (Input: "How has TSLA performed over the last year?" Output: "Get me historical performance for TSLA from 2022-01-23 to ${year}-${month}-${day})
       4.5. queryString: ${queryString}
       5. Output modified queryString: 
       `,
       max_tokens: 2048,
       stop: "/n"
      })
      return response.data.choices[0].text;
    }

    // extractTimeRange function
    async function extractTimeRange(modifiedQueryString, queryString) {
      const date = new Date();
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();


      const extractedTimeRange = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Please understand the current date: It is ${year}-${month}-${day}.
      
        Please review the modifiedQueryString and compare it against the queryString. 
        The modifiedQueryString needs to be modified to correspond to the time range suggested in the queryString.

        ModifiedQueryString: ${modifiedQueryString}
        queryString: ${queryString}
        `,
        max_tokens: 2048,
        stop: "/n"
      })
      return extractedTimeRange.data.choices[0].text;
    }

    // createApiLink function
    async function createApiLink(correctedTimeRange, extractedStock) {
      const date = new Date();
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();
    const apiLink = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Please help me create a link to access financial data for a specific stock by replacing the stock name, from date, to date, and period in the following format:
        apiLink: https://www.eodhistoricaldata.com/api/eod/(stockName).US?api_token=63a2477acc2587.58203009&fmt=json&from=(fromDate)&to=(toDate)&period=(period)
        - The stock name (stockName) should be replaced with the variable ${extractedStock}.
        - The from date (fromDate) should be in the format YYYY-MM-DD and replaced with the first date found in the variable ${correctedTimeRange}.
        - The to date (toDate) should be in the format YYYY-MM-DD and replaced with the second date found in the variable ${correctedTimeRange}.
        - If there is no end date (toDate), use ${year}-${month}-${day}
        - The period should be determined by the length of the range. If the range is one year or longer, make it m. If it is 3 months or longer, make it w. if it is less, make it d.
        - Respond in the format of: "apiLink: (apilink)"
        - Do not respond with anything else. Do not repsond with "Answer:". Do not do it. DONT DO IT. DO NOT RESPOND WITH "Answer:". The only prefix before the link should be apiLink:
        `,
        max_tokens: 2048,
        temperature: .3,
        stop: "/n",
    });
    return apiLink.data.choices[0].text;
    }
    // apiCall function
    async function apiCall(apiLink) {
    const cleanedLink = await cleanLink(apiLink);
    const response = await axios.get(cleanedLink);
    return response.data;

    async function cleanLink(apiLink){
      var cleanedLink = apiLink.replace("apiLink: ","");
      return cleanedLink;
    }
    }
    // summarizeData function
    async function summarizeData(apiCallData, extractedTimeRange) {
    const apiCallDataString = JSON.stringify(apiCallData)
    const date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Be specific with values. Format them to 2 decimals and use USD. 
        Please extract key insights from the following data.
        Write them in a comprehensive manner. The insights should be 
        clear and easy to understand, as the user will ask questions about them. 
        - Provide a bullet point summary of the key insights.
        - Provide a paragraph summary that goes into the nuances of the dataset, 
        current date ${year}-${month}-${day}, time range from ${extractedTimeRange}.
        
        Data: ${apiCallDataString}
        `,
        max_tokens: 2048,
        temperature: .5,
        stop: "/n",
    })
    return response.data.choices[0].text
    }
  }

  // Real Time - Complete - Not Tested
  async function realTimeRequest(queryString){
  // workflow Function
  console.log("extracting info!")
  var extractedInfo = await extractInfo(queryString);
  console.log("information extracted!", extractedInfo);
  var apiLink = await createApiLink(extractedInfo);
  console.log("apiLink:",apiLink);
  console.log("Making API call now!");
  const apiCallData = await apiCall(apiLink);
  const summarizedData = await summarizeData(apiCallData);
  console.log(`Data Returned: ${summarizedData}`);
  return summarizedData;
  // extractInfo function
  async function extractInfo(queryString) {
      const extractedInfo = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `
          Extract the datapoints in this query. 
          Respond in this format: 
          stockName: extractedStockTicker, 
          Defaults if N/A: stockName: SPY
          Convert company names to stock tickers. If you see apple, make it AAPL, likewise with other companies.
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
          Instructions. Replace the variable stockName with the variable passed in below.
          Output in this formatting: apiLink: Link
          Link: https://www.eodhistoricaldata.com/api/real-time/stockName.US?api_token=63a2477acc2587.58203009&fmt=json
          Variables: ${extractedInfo}`,
          max_tokens: 3000,
          temperature: .5,
          stop: "/n",
      });
      return apiLink.data.choices[0].text;
  }


// apiCall function
async function apiCall(apiLink) {
  const cleanedLink = await cleanLink(apiLink);
  const response = await axios.get(cleanedLink);
  return response.data;

  async function cleanLink(apiLink){
    var cleanedLink = apiLink.replace("apiLink: ","");
    return cleanedLink;
  }
}

// summarizeData function
  async function summarizeData(apiCallData) {
    const apiCallDataString = JSON.stringify(apiCallData)
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Instructions: Parse the data, 
        Summarize the insights.
        The user will ask questions about it,
        so make sure it is comprehensive.
        Data: ${apiCallDataString}
        Response:`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    })
    return response.data.choices[0].text
  }
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

    async function apiCall(apiLink) {
      return new Promise((resolve, reject) => {
        https.get(apiLink, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve(JSON.parse(data));
          });
        }).on('error', (err) => {
          reject(err);
        });
      });
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
    return new Promise((resolve, reject) => {
      https.get(apiLink, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(JSON.parse(data));
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
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
    return new Promise((resolve, reject) => {
      https.get(apiLink, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(JSON.parse(data));
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
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
  