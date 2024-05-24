require("dotenv").config();
const mongoose=require("mongoose");
mongoose.connect(process.env.mongo_db_url).then(()=>{
    console.log("DB Connected");
}).catch((err)=>{
console.log(err);
})
