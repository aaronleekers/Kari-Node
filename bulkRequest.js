const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

  
const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);

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
  module.exports = { bulkRequest };
