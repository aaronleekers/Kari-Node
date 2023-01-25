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

  module.exports = { fundamentalsCryptoRequest };
