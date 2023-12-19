const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const port = 5000
const dontenv = require("dotenv");
const user = require("./router/User")
const post = require("./router/Post")

dontenv.config();

mongoose.connect(process.env.MONGODB_URL)
.then(()=> { console.log("DB CONNECTED")})
.catch((error) => { console.log(error);})


app.use(cors());
app.use(express.json())
app.use('/api/user', user)
app.use('/api/post', post)

app.listen(port, ()=> {
    console.log(`server is listening on port ${port}`);
})