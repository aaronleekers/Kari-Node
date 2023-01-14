const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

app.post('/search', (req, res) => {
    const query = req.body.query;
    const searchApi = spawn('node', ['search_api.js', query]);

    searchApi.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    searchApi.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    searchApi.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    res.send('Search query submitted');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
