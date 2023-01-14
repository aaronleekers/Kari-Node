const express = require('express');
const app = express();
require('dotenv');

app.get('/', (req, res) => {
    res.send('Hello, World!');
  });



app.get('/processData', (req, res) => {
    const query = req.query.query
    const result = processData(query);
    res.send(result)
  })


app.listen( 3000, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
