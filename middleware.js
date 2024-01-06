module.exports.islogged = (req,res,next) => {
    if(!req.isAuthenticated()){
        req.flash("error","you must login")
        res.redirect("/login")
    }
    next()
}