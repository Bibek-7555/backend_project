import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async() => {
    try{
        console.log(DB_NAME)
       const connectionInstance = await mongoose.connect(`${process.env.MONGoDB_URL}/${DB_NAME}`)
       console.log(`\n MongoDB connected @@ DB HOST: ${connectionInstance.connection.host} `)
    }catch (error) {
        console.log("MONGODB Connection error", error)
        process.exit(1)
    }
}

export default connectDB