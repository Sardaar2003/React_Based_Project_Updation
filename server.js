// Mongo DB Connection 
require("./config/db");


//CORS POLICY
const cors=require("cors");
const app=require("express")();
const bodyParser=require("express").json;
const port=8080;
const UserRouter=require("./api/User");

app.use(bodyParser());
app.use(cors());
app.use("/user",UserRouter);

app.listen(port,()=>{
    console.log(`App is Running on Port Number : ${port}`);
})