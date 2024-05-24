// Mongo DB Connection 
require("./config/db");

const app=require("express")();
const bodyParser=require("express").json;
const port=8080;
const UserRouter=require("./api/User");

app.use(bodyParser());

app.use("/user",UserRouter);

app.listen(port,()=>{
    console.log(`App is Running on Port Number : ${port}`);
})