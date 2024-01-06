const mongoose = require("mongoose");
// const Reviews = require("./review.js")
const Schema = mongoose.Schema
const Reviews = require("./review.js")
const User = require("./user.js")

const listingSchema = new Schema({
    title :{
        type : String,
        required : true
    },

         description :{
            type : String,
        }, image :{
            type : String,
            default : "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bm9ydGhlcm4lMjBsaWdodHN8ZW58MHx8MHx8fDA%3D",
             set: (v) => v === "" ? "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bm9ydGhlcm4lMjBsaWdodHN8ZW58MHx8MHx8fDA%3D":v,
        } , price : Number,
         location : String,
          country : String,
          reviews : [
            {
                type : Schema.Types.ObjectId,
                ref : "Review",
            },
          ],
          owner : {
            type : Schema.Types.ObjectId,
            ref:"User",
          },
          geometry: {
            type: {
              type: String, // Don't do `{ location: { type: String } }`
              enum: ['Point'], // 'location.type' must be 'Point'
              required: true
            },
            coordinates: {
              type: [Number],
              required: true
            }
          }

})


listingSchema.post("findOneAndDelete",async(listing) => {
    if(listing){
        await Reviews.deleteMany({_id : {$in :listing.reviews}})
    }
})


const listing = mongoose.model("listing",listingSchema)

module.exports = listing;