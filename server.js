// Mongo DB Connection 
require("./config/db");

const path = require("path");
const express = require('express');

//CORS POLICY
const cors=require("cors");
const app=require("express")();
const bodyParser=require("express").json;
const port=8080;
const UserRouter=require("./api/User");

app.use(bodyParser());
app.use(cors());
app.use("/user", UserRouter);
// app.use(express.static(path.join(__dirname)));

app.listen(port,()=>{
    console.log(`App is Running on Port Number : ${port}`);
})

app.get("/hello", (req, res) => {
    console.log('__dirname:', __dirname);  // Log the value of __dirname
    console.log(path.join(__dirname, './views/verification.html'));  // Log the constructed path
    res.sendFile(path.join(__dirname, './views/verification.html'));
});

app.get("/user/bg1.jpg", (req, res) => {
    res.sendFile(path.join(__dirname, './views/bg1.jpg'));
})