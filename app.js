require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true })

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });


const User = new mongoose.model("User", userSchema)

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", (req, res) => {


    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        newUser.save()
            .then(() => {
                res.render("secrets");
            })
            .catch((err) => {
                console.log(err);
            });
        // Store hash in your password DB.
    });

})

app.post("/login", (req, res) => {
     const username = req.body.username;

    User.findOne({ email: username })
        .then((foundUser) => {
            if (foundUser) {
                bcrypt.compare(req.body.password, foundUser.password, function (err, result) {
                    if (result === true) {
                        res.render("secrets")
                    } else {
                        res.send("password doesn't match")
                    }
                });
            }
        })
        .catch((err) => {
            console.log(err);
        });

})


app.listen(3000, function (req, res) {
    console.log("server started on port 3000")
});


