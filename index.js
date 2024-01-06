if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}
// console.log(process.env)
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN
const geocodingClient = mbxGeocoding({ accessToken: mapToken });


const express = require("express");
const app = express()
const mongoose = require("mongoose")
const listing = require("./models/listing")
const path = require("path")
const methodoverride = require("method-override")
const ejsMate = require("ejs-mate");
const wrapasync = require("./utils/wrapasync")
const expresserror = require("./utils/expresserror");
const MongoStore = require("connect-mongo")
const {listingSchema,reviewSchema} = require("./schema.js");
const Reviews = require("./models/review.js")
const joi = require("joi")
const session = require("express-session")
const flash = require("connect-flash")
const User = require("./models/user.js")
const passport = require("passport")
const LocalStrategy = require("passport-local")


// const joi = require("joi")
// const { escape } = require("querystring");

// app.use(express.static("public"));
app.use(express.urlencoded({extended:true}))
app.set("view engine","ejs")
app.set("views",path.join(__dirname,"views"))
app.use(methodoverride("_method"))
app.engine("ejs",ejsMate)
app.use(express.static(path.join(__dirname,"/public")))


const dburl = process.env.ATLASDB_URL
 //connection with mongodb
 main().then((res) => {console.log("connected")}).catch((err) => {console.log(err)}) 
 async function main(){await mongoose.connect(dburl);}



 const store = MongoStore.create({
     mongoUrl : dburl,
     crypto:{
         secret: process.env.SECRET
     },
     touchAfter:24*3600

 })

 store.on("error",() => {
     console.log("error in mongodb store",err)
 })

const sessionOptions = {
    store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true
}

// const dburl = process.env.ATLASDB_URL
//  //connection with mongodb
//  main().then((res) => {console.log("connected")}).catch((err) => {console.log(err)}) 
//  async function main(){await mongoose.connect(dburl);}


//connection with server
app.listen(8080,() => {console.log("server online")})


app.use(session(sessionOptions))
app.use(flash())





app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))


passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())


app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error")
    res.locals.curruser = req.user;
    return next();
})

// //first route
// app.get("/",(req,res) => {res.send("working")})

// const validatelisting = (req,res,next) =>{
//     let {err} = listingSchema.validate(req.body)
//     if(err){
//         throw new expresserror(400,err)
//     }else{
//         next()
//     }
// }

//sample input route
// app.get("/inp",(req,res) => {
//         let data = new listing({
//             title : "my skyscraper",
//             description : "gotta be rich",
//             price : 12345,
//             location:"New york",
//             country : "USA"
//         })
        
//          data.save().then((e) => {console,log("inserted")}).catch((err) => {console.log(err)})
// })


// const validatelisting = (req,res,next) => {
//     let {error} = listingSchema.validate(req.body)
//     if (error){
//        throw new expresserror(400,error)
//     }else{
//         next()
//     }
// }


const islogged = (req,res,next) => {
    if(!req.isAuthenticated()){
        req.flash("error","you must login")
        res.redirect("/login")
    }
    return next()
}





const validateReview = (req,res,next)=>{
    let {error} = reviewSchema.validate(req.body)
    if(error){
        let ermsg = error.details.map((el) => el.message).join(",")
        throw new expresserror(400,ermsg)
    }else{
       return next()
    }
}

//listing route
app.get("/listing",wrapasync(async(req,res) => {
        const allListings = await listing.find()
        res.render("./listings/index.ejs",{allListings})
}))

//new listing route
app.get("/listing/new",(req,res) =>{
    if(!req.isAuthenticated()){
        req.flash("error","you must login")
        res.redirect("/login")
    }
    res.render("./listings/new.ejs")
})



//show route
app.get("/listings/:id",wrapasync(async(req,res) => {
    let { id } = req.params
    const obj = await listing.findById(id).populate({path : "reviews",populate:{path : "author"}}).populate("owner")
    if (!obj){
        req.flash("error","Listing does not exist")
        res.redirect("/listing")
    }
    res.render("./listings/show.ejs",{obj})
    
}))



//new listing post req
app.post("/listings",islogged,wrapasync(async(req,res,next) => {
    // let {title,image,price,location,country,description} = req.body
    let coordinates = await geocodingClient.forwardGeocode({
        query: req.body.listings.location,
        limit: 1
      })
        .send()

        // console.log(coordinates.body.features[0].geometry)
        // res.send("done")


        const newlisting = req.body
        let lis =  new listing(newlisting.listings)
        lis.geometry = coordinates.body.features[0].geometry
        lis.owner = req.user._id;
         await lis .save().then((res) => {console.log("inserted")}).catch((err) => {console.log(err)})

        req.flash("success","New listing Created")
       res.redirect("/listing")
}))


//edit get req form
app.get("/listings/:id/edit",islogged,wrapasync(async(req,res) => {
    let {id} = req.params
    let listings = await listing.findById(id)
    if (!listings){
        req.flash("error","Listing does not exist")
        res.redirect("/listing")
    }
    res.render("./listings/editform.ejs",{listings})
}))


//update listings
app.put("/listings/:id",islogged,wrapasync(async(req,res) => {
      let {id} = req.params
    //   let {title,description,location,country,image,price} = req.body
    const listingss = req.body
    await listing.findByIdAndUpdate(id,listingss.listings)
    req.flash("success","Listing Updated")
    res.redirect(`/listings/${id}`)
   
}))


//delete listing
app.post("/del/:id",islogged,wrapasync(async(req,res,next) => {
    try{
        let {id} = req.params
   await listing.findByIdAndDelete(id)
   req.flash("success","Listing Deleted")
   res.redirect("/listing")
    }catch(err){
       return next(err)
    }
   

}))


//reviews route
app.post("/listings/:id/reviews",islogged,wrapasync(async(req,res,next) => {
    let listingg = await listing.findById(req.params.id);
    let {id} = req.params
    let newreview = new Reviews(req.body.review);
    newreview.author = req.user._id
    listingg.reviews.push(newreview)
    await newreview.save()
    await listingg.save()
    console.log(newreview)
    req.flash("success","Review Added")
    res.redirect(`/listings/${id}`)
}))



// const isreview = async(req,res,next) => {
//     let {id,reviewId} = req.params
// let review = await Reviews.findById(reviewId)
// if(!review.author._id.equals(res.locals.curruser._id)){
//     req.flash("error","You cannot ")
//     res.redirect(`/listings/${id}`)
// }
// }




//reviews delete route
app.delete("/listings/:id/reviews/:reviewid",islogged,wrapasync(async(req,res,next) => {
      let {id,reviewid} = req.params;
      await listing.findByIdAndUpdate(id,{$pull : {reviews : reviewid}})
      await Reviews.findByIdAndDelete(reviewid)
      req.flash("success","Review Deleted")
      res.redirect(`/listings/${id}`)
}))


//signup route
app.get("/signup",wrapasync(async(req,res,next) => {
    res.render("./users/signup.ejs")
}))


//signup post 
app.post("/signup",wrapasync(async(req,res,next) => {
    try{
        let {username,password,email} = req.body
        const newuser = new User({
            email : email,
            username : username
        })

        const newRegister = await User.register(newuser,password)
        console.log(newRegister)
        req.flash("success","Welcome")
        res.redirect("/listing")
    }catch(e){
        req.flash("error",e.message)
        res.redirect("/signup")
    }
}))


//login route
app.get("/login",(req,res) => {
    res.render("./users/login.ejs")
})


//login post route
app.post("/login",passport.authenticate("local",{failureRedirect:"/login",failureFlash:true}),wrapasync(async(req,res) => {
     req.flash("success","You're successfully logged in!!")
     res.redirect("/listing")
}))



//logout
app.get("/logout",(req,res,next) => {
    req.logOut((err) => {
        if(err){
            return next(err)
        }
        req.flash("success","You've logged out")
        res.redirect("/listing")
    })

})


//demo user
// app.get("/user",async(req,res) => {
//     let userr = new User({
//         email : "hello123@",
//         username : "manideep",
//     })

//     let newUser = await User.register(userr,"manideep")
//     console.log(newUser)
// })



app.all("*",(req,res,next) => {
    next(new expresserror(404,"page not found"))
    
})


app.use((err,req,res,next) => {
    let {statusCode = 500,message = "somthing went wrong"} = err;
    // res.status(statusCode).send(message)
    res.render("./listings/error.ejs",{message})
})


