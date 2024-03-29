require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook')
const findOrCreate = require('mongoose-findorcreate');
import axios from 'axios';

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "Our little sentence.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true })
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)


// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });


const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/', async(req, res)=>{
    try{
        const result = await axios.get("https://secrets-api.appbrewery.com/random")
        res.render('index.ejs', {secret: result.data.secret, user: result.data.username})
    }catch{
        console.log(error.response.data)
        res.status(500)
    }
})

app.get('/auth/google', 
    passport.authenticate("google", {scope: ['profile']})
)

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});


app.get('/secrets', function(req,res){
    User.find({ "secret": { $ne: null } })
    .then(foundUser => {
      if (foundUser) {
        res.render('secrets', { usersWithSecrets: foundUser });
      }
    })
    .catch(err => {
      console.log(err);
    });
  
})

app.get('/logout', function(req, res){
    req.logout(function(err){
        if(err){
            console.log(err)
        }
    });
    res.redirect('/');
});


app.get('/submit', function(req,res){
    if(req.isAuthenticated()){
        res.render('submit');
    } else{
        res.redirect('/login');
    }
})

app.post("/submit", function(req,res){
    const submittedSecret = req.body.secret;
    User.findByIdAndUpdate(req.user.id, { secret: submittedSecret })
  .then(foundUser => {
    res.redirect('/secrets');
  })
  .catch(err => {
    console.log(err);
  });
  

})


app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect('/register')
        } else{
            passport.authenticate('local')(req, res, function(){
                res.redirect('/secrets')
            })
        }
    })


})

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user, function(err){
        if(err){
            console.log(err)
        } else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })
     
})

app.listen(3000, function (req, res) {
    console.log("server started on port 3000");
});
