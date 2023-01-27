const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

  
const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"

// What kind of questions this should be able to answer
// What are the fundamentals of bitcoin?
// What is the max supply of Avalanche?
// What is the market dominance of Ethereum?

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);

  // cryptoFundamentalsRequest
  async function fundamentalsCryptoRequest(queryString){
  // workflow
  var extractedCrypto = await extractCrypto(queryString);
  console.log("Crypto Extracted:",extractedCrypto);
  var apiLink = await createApiLink(extractedCrypto);
  console.log(apiLink)
  var apiCallData = await apiCall(apiLink);
  var summarizedData = await summarizeData(apiCallData);
  return summarizedData;

  // extractCrypto function
  async function extractCrypto(queryString){
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt:
      `
      Instructions: View the queryString, and extract the cryptocurrency from it.
      Modify cryptocurrrency to match symbol. For example, Bitcoin would be outputted as BTC, Ripple would be XRP. 
      If there is already a crypto symbol, output the symbol in the format like ("Cryptocurrency: SYMBOL").
      
      QueryString: ${queryString}
      `,
      max_tokens: 1024,
      stop: "/n",
    });

    return response.data.choices[0].text;
  }
  // createApiLink function
  async function createApiLink(extractedCrypto){
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt:
      `
      Instructions: Replaces the variable cryptoCurrency with the variable extractedCrypto.
      Output: apiLink: https://www.eodhistoricaldata.com/api/fundamentals/cryptoCurrency-USD.CC?api_token=63a2477acc2587.58203009&fmt=json
      extractedCrypto: ${extractedCrypto}
      `,
      max_tokens: 1024,
      stop: "/n",
    });
    
    return response.data.choices[0].text;
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

  module.exports = { fundamentalsCryptoRequest };
