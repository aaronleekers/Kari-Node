const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

  
const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"

// What kind of questions this should be able to answer:
// "What is the current interest rate for the US?"
// "What is the total population of the US?"
// "What is the annual population growth of the US?"
// "What is the current inflation rate of the US?"
// "What is the current CPI for the US?"
// "What is the current GDP of the US?"
// "What is the current GDP per capita of the US?"
// "What is the GDP growth of the US this year?"
// "What is the current debt to GDP ratio?"
// "What is the current GNI?"
// "What is the current GNI per capita?"
// "What is the current fertility rate of the US?"
// "What is the current unemployment rate?"

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);

  // macroIndicators - Complete & Nuanced - Not Tested
  async function macroRequest(queryString){
    // workflow Function
    var country = await extractCountry(queryString);
    var indicator = await extractIndicator(queryString);
    console.log(country, indicator)
    var apiLink = await createApiLink(country, indicator);
    console.log(apiLink)
    var apiCallData = await apiCall(apiLink);
    var summarizedData = await summarizeData(apiCallData);
    return summarizedData;
 
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
            max_tokens: 512,
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

         Instructions: View the query, and weigh it against the possible options. 
         Determine what the user is asking for based on the request. 
         Finally, output the matched option like: "indicatorCode: (insert here)"

         Possible Options:
         1. real_interest_rate - ("What is the current interest rate for the US?")
         2. population_total - ("What is the total population of the US?")
         3. population_growth_annual - ("What is the annual population growth of the US?")
         4. inflation_conumser_prices_annual - ("What is the current inflation rate of the US?")
         5. consumer_price_index - ("What is the current CPI for the US?")
         6. gdp_current_usd - ("What is the current GDP of the US?")
         7. gdp_per_capita_usd - ("What is the current GDP per capita of the US?")
         8. gdp_growth_annual - ("What is the GDP growth of the US this year?")
         9. debt_percent_gdp - ("What is the current debt to GDP ratio?")
         10. gni_usd - ("What is the current GNI?")
         11. gni_per_capita_usd - ("What is the current GNI per capita?")
         12. fertility_rate - ("What is the current fertility rate of the US?")
         13. unemployment_total_percent - ("What is the current unemployment rate?")
         
         Query: ${queryString}

         `,
         max_tokens: 512,
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
            Please help me create a link to access financial data for a specific stock by replacing the stock name, from date, to date, and period in the following format:
            apiLink: https://www.eodhistoricaldata.com/api/macro-indicator/(extractedCountry)?api_token=63a2477acc2587.58203009&fmt=json&indicator=(extractedIndicatorCode)
            - The (extractedCountry) area should be replaced with the contents within the extractedCountry below.
            - The (extractedIndicator) area should be replaced with the contents within the extractedCountry below.
            - Respond in the format of: "apiLink: (apilink)"
            
            extractedCountry: ${country}.
            extractedIndicator: ${indicator}.
                       `,
            max_tokens: 1024,
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
 
   module.exports = { macroRequest };
