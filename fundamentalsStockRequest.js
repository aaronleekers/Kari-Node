const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

  
const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"

// This should be able to answer questions like:
// Get me the latest balance sheet for AAPL
// Get me the latest income statement for AAPL
// Get me the latest cash flow statement for AAPL
// Get me the latest statement of shareholders equity for AAPL
// Get me the balance sheet for AAPL for Q1 2019. 
// Get me the income statement for AAPL for Q1 2019. 
// Get me the cash flow statement for AAPL for Q1 2019. 

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);
  async function fundamentalsStockRequest(queryString) {
 // Stock Fundamentals - Not Complete & Nuanced - Not Tested
 var extractedStockName = await extractStockName(queryString);
 var extractedStatement = await extractStatement(queryString);
 var extractedFilingYear = await extractFilingYear(queryString);
 console.log(extractedStockName, extractedStatement)
 var apiLink = await createApiLink(extractedStockName, extractedStatement);
 console.log(apiLink);
 var apiCallData = await apiCall(apiLink, extractedFilingYear);
 console.log(extractedFilingYear, apiCallData);
 var summarizedData = await summarizeData(apiCallData);
 return summarizedData;

 async function extractStockName(queryString){
   const response = await openai.createCompletion({
     model: "text-davinci-003",
     prompt:
     `
     Please extract the company name from the following sentence, 
     convert it to a   stock ticker format, 
     and format the output as "stockName: (converted stock ticker)"
     For example: "Apple" to "stockName: AAPL" or "Ford" to "stockName: F"
     Sentence: ${queryString}
     `,
     max_tokens: 512,
     stop: "/n"
   })
   return response.data.choices[0].text;
 }

 async function extractStatement(queryString){
   const response = await openai.createCompletion({
     model: "text-davinci-003",
     prompt:
     `
      Instructions: Read the queryString, and respond with the appropriate associated extractedStatement. 
      Finally, output the extractedStatement like ("extractedStatement: (insert here))

      queryString: ${queryString}

      Example Inputs & Outputs:

      (I: "Get me the Income statement for Apple in 2020.", O: "extractedStatement: Income_statement")
      (I: "Get me the Balance Sheet for Apple in 2020.", O: "extractedStatement: Balance_Sheet")
      (I: "Get me the Cash Flow Statement for Apple in 2020.", O: "extractedStatement: Cash_Flow")
      (I: "How much did Apple earn in 2020?", O: "extractedStatement: Income_statement")
      (I: "How much cash does AAPL have on its balance sheet?", O: "extractedStatement: Income_statement")
      (I: "How much cash flow came from investing activities for AAPL in 2020?.", O: "extractedStatement: Cash_Flow")

      Balance_Sheet
      Cash_Flow_
     `,
     max_tokens: 1024,
     stop: "/n"
   })
   return response.data.choices[0].text;
 }

 async function extractFilingYear(queryString){
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt:
    `
     Instructions: Read the queryString, and extract the filing year being searched for. If there is no year, return 2021. 
     Finally, output the extractedFilingYear like ("extractedFilingYear: (insert here))

     queryString: ${queryString}
    `,
    max_tokens: 1024,
    stop: "/n"
  })
  return response.data.choices[0].text;
}


 async function createApiLink(extractedStockName, extractedStatement) {
   const response = await openai.createCompletion({
     model: "text-davinci-003",
     prompt:
     `
     Instructions: Replaces the variable stockName with the variable extractedStock.
     Output: apiLink: https://www.eodhistoricaldata.com/api/fundamentals/(extractedStockName).US?api_token=63a2477acc2587.58203009&fmt=json&filter=Financials::(extractedStatement)::yearly
     extractedStatement: ${extractedStatement}
     extractedStockName: ${extractedStockName}
     `,
     max_tokens: 512,
     stop: "/n"
   })
   return response.data.choices[0].text; 
  }
  async function apiCall(apiLink, extractedFilingYear) {
    const cleanedLink = apiLink.replace(/.*(https:\/\/)/, "https://");
    const response = await axios.get(cleanedLink);
    let filteredData = [];
    for (let item of response.data) {
      const date = new Date(item.filing_date)
      const year = date.getFullYear()
      if (year === extractedFilingYear) {
        filteredData.push(item);
      }
    }
    return filteredData;
  }
  
  
    // summarizeData function
    async function summarizeData(apiCallData, queryString) {
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
          Format: "Kari: Hi ChatGPT, I am Kari, a smart financial analyst. I am here to summarize the key insights of the information. Here it is: The current date is: ${year}-${month}-${day}. S Thanks for asking your question, to get a more in-depth summary of the information, visit www.kariai.xyz"
          Style: Friendly, informative, and indicative of trends.
          Tip: If there is no data in the string, don't just make up data, return the fact that the data is empty.
  
          Question: ${queryString}
          Data: ${apiCallDataString}
          `,
          max_tokens: 256,
          temperature: .5,
          stop: "/n",
      })
      return response.data.choices[0].text
      } 
    }

 
module.exports = { fundamentalsStockRequest };
