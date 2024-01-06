const mongoose = require("mongoose")
const initData = require("./data.js")
const listing = require("../models/listing.js")

main().then((res) => {console.log("connected")}).catch((err) => {console.log(err)}) 
async function main(){await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");}

const inda = async() => {
    // let data = new listing({
    //     title : "my skyscraper",
    //     description : "gotta be rich",
    //     price : 12345,
    //     location:"New york",
    //     country : "USA"
    // })
    
    //  data.save().then((e) => {console,log("inserted")}).catch((err) => {console.log(err)})
    await listing.deleteMany({})
    initData.data = initData.data.map((obj) => ({...obj,owner:'65976dbfa582848ee96fa048'}))

    await listing.insertMany(initData.data)
}
inda()
