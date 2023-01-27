const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"

// THE KIND OF QUESTIONS THIS THING SHOULD BE ABLE TO ANSWER
// "How has the SPY performed over the last year?"
// "How has Microsoft performed between jan 2019 and jan 2020?"
// "Get me historical performance for SPY over the last week"

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);

  // EOD Historical - Complete - Tested - 5 Steps 
  async function eodRequest(queryString){

    // workflow Function
    console.log("extracting info!")
      var extractedStock = await extractStock(queryString);
    console.log("extractedStock:",extractedStock);
      var extractedTimeRange = await extractTimeRange(queryString); 
    console.log("extractedTimeRange", extractedTimeRange);
      var apiLink = await createApiLink(extractedTimeRange, extractedStock); 
    console.log("apiLink:",apiLink);
    console.log("Making API call now!"); 
      const apiCallData = await apiCall(apiLink); 
      const summarizedData = await summarizeData(apiCallData); 
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
    // extractTimeRange function
    async function extractTimeRange(queryString) {
      const date = new Date();
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();

      const lastYear = year - 1;
      const lastQuarter = month - 3;
      const lastMonth = month - 1;
      const lastWeek = day - 7;
      


      const response = await openai.createCompletion({
       model: "text-davinci-003", 
       prompt: `

       Command: View the queryString (below), and reformat it to be more specific with the date range.
      
       Instructions: If there are two dates present, modify the queryString to display the dates like so: 
       Output: extractedTimeRange: "fromDate: (fromDate), toDate: (toDate)"


       Instructions if there are not two dates present:
       Make fromDate = toDate minus the time range suggested in the prompt. 
       Follow the ideal Inputs and outputs for accurate outputs.
       Output: extractedTimeRange: "fromDate: (fromDate), toDate: (toDate)"


       Ideal Inputs and outputs(Examples, use these to produce accurate outputs, modify fromDate as needed to match input time range.): 
       (I: "How has TSLA performed over the last year?" O: "fromDate: ${lastYear}-${month}-${day}, toDate: ${year}-${month}-${day}") 
       (I: "How has TSLA performed over the last quarter?" O: "fromDate" ${lastYear}-${lastQuarter}-${day} toDate: ${year}-${month}-${day}") 
       (I: "How has TSLA performed over the last month?" O: "fromDate: ${lastYear}-${lastMonth}-${day}  toDate: ${year}-${month}-${day}") 
       (I: "How has TSLA performed over the last week?" O: "fromDate ${year}-${month}-${lastWeek} toDate: ${year}-${month}-${day}") 
 
       queryString: ${queryString}
       
       `,
       max_tokens: 3000,
       temperature: .3,
       stop: "/n"
      })
      return response.data.choices[0].text;
    }
    // createApiLink function
    async function createApiLink(extractedTimeRange, extractedStock) {
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
      var cleanedLink = apiLink.replace(/.*(https:\/\/)/, "https://");
      return cleanedLink;
    }    
    }
    // summarizeData function
    async function summarizeData(apiCallData) {
    const apiCallDataString = JSON.stringify(apiCallData)
    const date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `
        Instructions: Take in the Data, and summarize it according to the specifications below:

        Specifications: 
        Numbers: Currency to be prefaced like "$x,xxx.xx" other numbers to be prefaced like "x,xxx.xx"
        Content: Bullet point summary of highlights, followed by paragraph summary of highlights.
        Format: "Kari: Hi ChatGPT, I am Kari, a smart financial analyst. I am here to summarize the key insights of the information. Here it is: The current date is: ${year}-${month}-${day}. Bullet Point Summary: bulletpointsummary Paragraph Summary: paragraphsummary. Thanks for asking your question, to get a more in-depth summary of the information, visit www.kariai.xyz"
        Style: Friendly, informative, and indicative of trends.
        Tip: If there is no data in the string, don't just make up data, return the fact that the data is empty.
      
        Data: ${apiCallDataString} 
        `,
        max_tokens: 3000,
        temperature: .3,
        stop: "/n",
    })
    return response.data.choices[0].text
    }
  }

  module.exports = { eodRequest };
