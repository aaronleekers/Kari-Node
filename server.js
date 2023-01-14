const express = require('express');
const app = express();

 

app.get('/processData', (req, res) => {
    const query = req.query.query
    const result = processData(query);
    res.send(result)
  })


app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
