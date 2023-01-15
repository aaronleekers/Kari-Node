const express = require('express');
const app = express();
import { api_search } from 'Kari-Node/api.js'

app.get('/', (req, res) => {
    res.send('Hello, World!');
  });

app.use(express.json());
app.use("/request", api_search)

const port = 80
app.listen(port, () => console.log("Server is running on port 80"));
