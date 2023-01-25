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

  // macroIndicators - Complete & Nuanced - Not Tested
  async function macroRequest(queryString){
    // workflow Function
    var country = await extractCountry(queryString);
    var indicator = await extractIndicator(queryString);
    console.log(country, indicator);
    var apiLink = await createApiLink(extractedInfo);
    console.log(apiLink)
    var apiCallData = await apiCall(apiLink);
    console.log(apiCallData);
    var summarizedData = await summarizeData(apiCallData);
    console.log(`Data Returned: ${summarizedData}`);
 
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
            max_tokens: 3000,
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
         Choose What the user is attempting to find based on the input. 
         Choose from a selection of options and respond with the item next to the correct number alone. Basically its a word match and sentiment analysis. 
         Respond in this format: indicatorCode: indicator
         Query: ${queryString}
         Possible Options:
         1. real_interest_rate
         2. population_total
         3. population_growth_annual
         4. inflation_conumser_prices_annual
         5. consumer_price_index
         6. gdp_current_usd
         7. gdp_per_capita_usd
         8. gdp_growth_annual
         9. debt_percent_gdp
         10. net_trades_goods_services
         11. inflation_gdp_deflator_annual
         12. agriculture_value_added_percent_gdp
         13. industry_value_added_percent_gdp
         14. services_value_added_percent_gdp
         15. exports_of_goods_services_percent_gdp
         16. imports_of_goods_services_percent_gdp
         17. gross_capital_formation_percent_gdp
         18. net_migration
         19. gni_usd
         20. gni_per_capita_usd
         21. gni_ppp_usd
         22. gni_per_capita_ppp_usd
         23. income_share_lowest_twenty
         24. life_expectancy
         25. fertility_rate
         26. prevalence_hiv_total
         27. co2_emissions_tons_per_capita
         28. surface_area_km
         29. poverty_poverty_lines_percent_population
         30. revenue_excluding_grants_percent_gdp
         31. cash_surplus_deficit_percent_gdp
         32. startup_procedurs_register
         33. market_cap_domestic_companies_percent_gdp
         34. mobile_subscriptions_per_hundred
         35. internet_users_per_hundred
         36. high_technology_exports_percent_total
         37. merchandise_trade_percent_gdp
         38. total_debt_service_percent_gni
         39. unemployment_total_percent`,
         max_tokens: 3000,
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
            Follow this workflow:
            1. Replace the variables in this link with the variables that were passed in.
            2. All variables passed in this link should be, country, indicatorCode,
            link: https://eodhistoricaldata.com/api/macro-indicator/country?api_token=63a2477acc2587.58203009&fmt=json&indicator=indicatorCode
            Variables: ${country} ${indicator}`,
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
 
   module.exports = { macroRequest };
