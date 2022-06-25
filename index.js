const app = require('./app.js');

const port = "5000";


const server = app.listen(port, () => {
    console.log(`Server listen on port ${port}`);
});

