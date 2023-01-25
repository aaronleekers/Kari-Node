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
    
    module.exports = { realTimeRequest };
