import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        typeof: Schema.Types.ObjectId, //one who is subscrining
        ref: "User"
    },
    channel: {
        typeof: Schema.Types.ObjectId, //one who owns the channel
        ref: "User"
    }
},{
    timestamps: true
})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)