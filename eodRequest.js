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

    // modifyQueeryString
    async function modifyQueryString(queryString) {
      const date = new Date();
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();

      const response = await openai.createCompletion({
       model: "text-davinci-003", 
       prompt: `

       Command: View the queryString (below), and reformat it to be more specific with the date range.
      
       Instructions: If there are two dates present, modify the queryString to display the dates like so: 
       (get me historical performance for stockName "from YYYY-MM-DD to YYYY-MM-DD")
       Instructions if there are not two dates present:
       Make toDate = ${year}-${month}-${day}
       Make fromDate = toDate minus the time range suggested in the prompt.
       Output: modifiedQueryString: (Modified Query String)

       Ideal Inputs and outputs: 
       (I: "How has TSLA performed over the last year?" O: "Get me information for TSLA from 2022-01-24 to ${year}-${month}-${day}") 
       (I: "How has TSLA performed over the last quarter?" O: "Get me information for TSLA from 2022-10-24 to ${year}-${month}-${day}") 
       (I: "How has TSLA performed over the last month?" O: "Get me information for TSLA from 2022-12-24 to ${year}-${month}-${day}") 
       (I: "How has TSLA performed over the last week?" O: "Get me information for TSLA from 2023-01-17 to ${year}-${month}-${day}") 
       (I: "How has TSLA performed over the last day?" O: "Get me information for TSLA from 2023-01-23 to ${year}-${month}-${day}") 

       Use analysis to decide the fromDate based on the currentDate and the suggested time Range.

       queryString: ${queryString}
       
       `,
       max_tokens: 3000,
       temperature: .3,
       stop: "/n"
      })
      return response.data.choices[0].text;
    }

    // extractTimeRange function
    async function extractTimeRange(modifiedQueryString) {
      const extractedTimeRange = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `

        Command: extract the time range from the modifiedQueryString.
        Instructions: read the modifiedQueryString, and output the date range in the format of: (fromDate = YYYY-MM-DD, toDate = YYYY-MM-DD)
      
        Please review the modifiedQueryString and compare it against the queryString. 
        The modifiedQueryString needs to be modified to correspond to the time range suggested in the queryString.

        ModifiedQueryString: ${modifiedQueryString}
        `,
        max_tokens: 3000,
        temperature: .3,
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
        - The from date (fromDate) should be in the format YYYY-MM-DD and replaced with the first date found in the variable ${extractedTimeRange}.
        - The to date (toDate) should be in the format YYYY-MM-DD and replaced with the second date found in the variable ${extractedTimeRange}.
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
  module.exports = { eodRequest };
