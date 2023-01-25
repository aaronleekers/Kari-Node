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
    var extractedStock = await extractStock(queryString);
    console.log("stock extracted!", extractedStock);
    var apiLink = await createApiLink(extractedStock);
    console.log("apiLink:",apiLink);
    console.log("Making API call now!");
    const apiCallData = await apiCall(apiLink);
    const summarizedData = await summarizeData(extractedStock, apiCallData);
    console.log(`Data Returned: ${summarizedData}`);
    return summarizedData;
    // extractInfo function
    async function extractStock(queryString) {
        const extractedStock = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: 
            `
            Please extract the company name from the following sentence, 
            convert it to a stock ticker format, 
            and format the output as "stockName: (converted stock ticker)"
            For example: "Apple" to "stockName: AAPL" or "Ford" to "stockName: F"
            Sentence: ${queryString}
            `,
            max_tokens: 1024,
            temperature: .5,
            stop: "/n",
        });
        return extractedStock.data.choices[0].text;
    }
    // createApiLink function
    async function createApiLink(extractedStock) {
        const apiLink = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `
            Please help me create a link to access financial data for a specific stock by replacing the stock name in the following format:
            apiLink: https://www.eodhistoricaldata.com/api/real-time/(stockName).US?api_token=63a2477acc2587.58203009&fmt=json
            - The stock name (stockName) should be replaced with the variable ${extractedStock}.
            - Respond in the format of: "apiLink: (apilink)"
            - Do not respond with anything else. Do not repsond with "Answer:". Do not do it. DONT DO IT. DO NOT RESPOND WITH "Answer:". The only prefix before the link should be apiLink:
            `,
            max_tokens: 512,
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
  async function summarizeData(apiCallData, extractedStock) {
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
        Format: "The current date is: ${year}-${month}-${day}. You requested information on ${extractedStock}. Bullet Point Summary: Point 1, Point 2, Point 3. Paragraph Summary: paragraphsummary.  To get a more in-depth summary of the information, visit www.kariai.xyz"
        Style: Friendly, informative, and indicative of trends.
        Tip: If there is no data in the string, don't just make up data, return the fact that the data is empty.
      
        Data: ${apiCallDataString}
        `,
        temperature: .7,
        stop: "/n",
    })
    return response.data.choices[0].text
    } 
  }
    
    module.exports = { realTimeRequest };
