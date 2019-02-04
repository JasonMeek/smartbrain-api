//change the start to node server.js instead of nodemon for running in heroku

const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt-nodejs');
const cors = require("cors");
const knex = require("knex");
const Clarifai = require('clarifai');

const db = knex({
    client: 'pg',
    connection: {
      host : process.env.DATABASE_URL,      //127.0.0.1
      ssl: true,
    }
  });

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/',(req, res) => { res.send("It is working") });

// SIGNIN
app.post('/signin',(req,res) => {
    const { email, password } = req.body;
    if(!email || !password){
        return res.status(400).json("Incorrect form submission")
    }
    db.select("email", "hash").from("login")
        .where("email", "=", email)
        .then(data=>{
            const isValid = bcrypt.compareSync(password, data[0].hash);
            if(isValid){
                db("users")
                .where("email", "=", email)
                .returning("*")
                .then(user => {
                    res.json(user[0]);
                })
                .catch(err => res.status(400).json("Unable to get user"))
            }
            else{
                res.json("Incorrect username or password")
            }
        })
        .catch(err => res.status(400).json("Incorrect username or password"))
});

// REGISTER
app.post('/register',(req,res) => {
    const { email, name, password } = req.body;
    if(!email || !name || !password){
        return res.status(400).json("Incorrect form submission")
    }
    const hash = bcrypt.hashSync(password);
        db.transaction(trx=>{
            trx.insert({
                hash: hash,
                email: email
            })
            .into("login")
            .returning("email")
            .then(loginEmail => {
                return trx("users")
                .returning('*')
                .insert({
                    name: name,
                    email: loginEmail[0],  //this is done since loginEmail returns an array
                    joined: new Date()
                })
                .then(user => {
                    res.json(user[0]);
                })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
        .catch(err => res.json("Unable to join"));
});

//PROFILE:ID
app.get('/profile/:id',(req,res)=>{
    const { id } = req.params;
    // let found = false;
    db.select("*").from("users").where({
        id: id
    })
    .then(user => {
        if(user.length){
            res.json(user[0]);
        }
        else{
            res.json("No such user found")
        }
    });
});

//IMAGE POST (user for ranking numbe rof images uploaded)
app.put('/image',(req,res) => {
    const { id } = req.body;
    db("users").where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then(entries =>{
        console.log(entries);
        res.json(entries);
    })
    .catch(err => res.status(400).json("Unable to get entries"));
});

//LISTEN ON PORT 3000
app.listen(process.env.PORT || 3000, function(){
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
  });
// app.listen(process.env.PORT || 3000, () => {
//     console.log(`App is running on port ${process.env.PORT}`);
// });


// Synchronous hash:
// var hash = bcrypt.hashSync("bacon");

// bcrypt.compareSync("bacon", hash); // true
// bcrypt.compareSync("veggies", hash); // false


// Asynchronous hash:
// bcrypt.hash("bacon", null, null, function(err, hash) {
//     // Store hash in your password DB.
// });

// // Load hash from your password DB.
// bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
// bcrypt.compare("veggies", hash, function(err, res) {
//     // res = false
// });