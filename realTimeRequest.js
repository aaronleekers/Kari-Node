const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

const orgId = process.env.ORG_ID;
const apiKey = process.env.API_KEY;

// KIND OF QUESTIONS THIS SHOULD BE ABLE TO ANSWER
// "What is the current price of SPY?"
// "What are the latest price movements of AMZN?"
// "What the current volume traded for SPY?"

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
    const summarizedData = await summarizeData(apiCallData);
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
        temperature: .5,
        stop: "/n",
    })
    return response.data.choices[0].text
    } 
  }
    
    module.exports = { realTimeRequest };
