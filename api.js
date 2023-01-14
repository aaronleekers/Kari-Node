const orgId = "org-9HfRDuLSYdMqot8sxBpkd5A0"
const apiKey = "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"
const eodApi = "63a2477acc2587.58203009"

  // openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
  });
  const openai = new OpenAIApi(configuration);

async function processData() {    
    const isDataValid = await validateData(query);
        if (isDataValid === 'y'){
            const quantifiedRequestType = await quantifyRequestType(query);
            const extractedInfoByRequest = await extractInfo(query);
            const formattedApiLinkConstructors = await formatToApiLinkConstructors(quantifiedRequestType, extractedInfoByRequest);
            const apiLink = await constructApiLink(formattedApiLinkConstructors);
            const apiCallData = await apiCall(apiLink);
            const summarizedData = await summarizeData(apiCallData);
        return await summarizedData.json();
        }
        else if (isDataValid === 'n') {
        return new Error("Question is not related to financial information")
        } else return new Error("dont work");
    }

async function validateData(query) {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Your job is to take a look at the query, and analyze if it is a question 
        related to anything financial or not. return y or n only. Here is the query: ${query}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    });
    return response.data.choice[0].text;
}
async function quantifyRequestType(query) {
        const requestType = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `View the input, and then select from a list of options what the user is trying to do. 
            RESPOND ONLY WITH THE TITLE OF THE OPTION IN THE PARENTHESIS. DO NOT ADD ANY OTHER COMMENTARY."${input}"
            Option 1 (real-time). Getting current price of a specific stock?(if this, respond only with real-time)
            Option 2 (fundamentals). Getting fundamentals of a cryptocurrency or stock(if this, respond only with fundamentals)
            Option 3 (insider-transactions). Getting insider transactions(if this, respond only with insider-transactions)
            Option 4 (calendar/earnings). Getting upcoming earnings of a stock(if this, respond only with calendar/earnings
            Option 5 (calendar/ipos). Getting upcoming ipo filings, (if this, respond only with calendar/ipos))
            ${query}`,
            max_tokens: 3000,
            temperature: .5,
            stop: "/n",
        });
        return requestType.data.choice[0].text; 
}
async function extractInfo(quantifiedRequestType, query) {
    if (quantifiedRequestType === "real-time"){
        const reformattedInput = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `Extract the specific stock being discussed in this input, and 
            respond only with the stock symbol. For example, if the input is asking 
            for the price of apple stock, you can recognize that and respond only with AAPL. 
            There might be questions about crypto currency pairs as well. So if someone 
            asks about the price of bitcoin, you would respond with BTC-USD only."${query}"`,
            max_tokens: 3000,
            temperature: .3,
            stop: "/n",
        });
        return reformattedInput.data.choices[0].text;
    } else if (quantifiedRequestType === "fundamentals") {
        const reformattedInput = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `"Extract the specific stock being discussed in this input, and respond 
             only with the stock symbol. For example, if the input is asking for the price of
             apple stock, you can recognize that and respond only with AAPL. There might be 
             questions about crypto currency pairs as well. So if someone asks about the price 
             of bitcoin, you would respond with BTC-USD only."${query}"`,
            max_tokens: 3000,
            temperature: .3,
            stop: "/n",
        });
        return reformattedInput.data.choices[0].text;

    } else if (quantifiedRequestType === "insider-transactions") {
        const reformattedInput = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `Extract the specific stock and time range in this input, and respond 
            only with the stock symbol, the from time, and the to time Format it like 
            ( insider-transactions | stockName | from | to )."${query}"`,
            max_tokens: 3000,
            temperature: .5,
            stop: "/n",
        });
        return reformattedInput.data.choices[0].text;
        
    } else if (quantifiedRequestType === "calendar/earnings") {
        const reformattedInput = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `"Extract the specific stock and time range in this input, and respond 
            only with the stock symbol, the from time, and the to time Format it like 
            ( calendar/earnings | stockName | from | to )."${query}`,
            max_tokens: 3000,
            temperature: .5,
            stop: "/n",
        });
        return reformattedInput.data.choices[0].text;
        
    } else if (quantifiedRequestType === "calendar/ipos") {
        const reformattedInput = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `Extract the specific stock and time range in this input, and respond 
            only with the stock symbol, the from time, and the to time Format it like 
            ( calendar/ipos | from | to )."${query}"`,
            max_tokens: 3000,
            temperature: .5,
            stop: "/n",
        });
        return reformattedInput.data.choices[0].text;
    } // future data integrations go here.
}
async function formatToApiLinkConstructors(extractedInfoByRequest) {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Your job is to append inputs with associated api link formatting to set up
        an endpoint call. Respond only with output. Here are the potential arguments that 
        could come through and their associated appendage to respond with.

        Stock Ticker Symbol ({symbol}.US}): If response contains a 1-5 letter all capital letter string, its probably a stock.
        Cryptocurrency Pairing ({Crypto}-USD): If input is BTC, ETH, AVAX, MATIC, or other crypto symbols, follow this rule.
        From Time Date (&from={fromTime}): Sometimes there is a range of dates. Convert date to unix, and follow the rule in the parenthesis.
        From Time Date (&to={toTime}): Sometimes there is a range of dates. Convert date to unix, and follow the rule in the parenthesis.
        Here is the request input: ${extractedInfoByRequest}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n",
    });
    return response.data.choices.text[0].text;
}
async function apiLink(formattedApiLinkConstructors) {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Your job is to assemble the formatted apiLinkConstructors into a usable apilink. Respond only with assembled link. Here is some context about the link
                 endpoint: https://www.eodhistoricaldata.com/api/${quantifiedRequestType}/{stockName}.us?api_token=63a2477acc2587.58203009{&from={fromDate}}{&to={toDate}}{&fmt={json}}
                 things you fill in with data from extractedInfoByRequest:
                    {stockName}
                    {&fromDate=}
                    {&toDate=}
                    {&fmt=}
                 ideal example of a working call: "https://www.eodhistoricaldata.com/api/real-time/AAPL.us?api_token=63a2477acc2587.58203009
                 Lastly, I want to make sure this is a working link, so make sure all variables are mapped into link, and respond only with assembled link.
                 Here is the data to pass into the link. Keep in mind that sometime you won't get a lot of variables, so map link to work accordingly based on variables.
                 ${formattedApiLinkConstructors}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n"
    });
    return response.data.choices[0].text;
}
async function apiCallData(apiLink) {
    const response = await fetch(apiLink);
    return response.json();
}
async function summarizeData(apiCallData, query) {
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Your job is to summarize this data for the user. Use the user's question and the data to create a response.${apiCallData} ${query}`,
        max_tokens: 3000,
        temperature: .5,
        stop: "/n"
    });
    return response.data.choice[0].text;
}