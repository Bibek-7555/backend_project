import dotenv from 'dotenv'
import express from 'express'
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({
    path: './.env'
});

const port = process.env.PORT || 4000;

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${port}`)
    })

})
.catch((err) => {
    console.log("MongodB connection failed")
})


