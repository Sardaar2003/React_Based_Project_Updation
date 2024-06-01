const express=require("express");
const router=express.Router();

//Mongoose DB
const User=require("../models/User.js");

//Password Handler
const bcrypt=require("bcrypt");

// Checking the Format of date 
function isValidDate(dateOfBirth) {
    const date = new Date(dateOfBirth);
    const time = date.getTime();
    return !isNaN(time);
}

// Sign Up API Call
router.post("/signUp",(req,res)=>{
    let {name,email,password,dateOfBirth}=req.body;
    name=name.trim();
    email=email.trim();
    password=password.trim();
    dateOfBirth=dateOfBirth.trim();
    if (name==""||email==""||password==""||dateOfBirth==""){
        res.json({
            status : "FAILED",
            message:"Entry Input has something Missing"
        });
    }
    else if (!/^[a-zA-z]*$/.test(name)){
            res.json({
                status : "FAILED",
                message:"Invalid Name"
            });
    }
    else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
        res.json({
        status : "FAILED",
        message:"Invalid Email"
        });
    }
    else if (!isValidDate(dateOfBirth)){
        res.json({
            status : "FAILED",
            message:"Invalid DateOfBirth"
            });
    }
    else if (password.length<8){
        res.json({
            status : "FAILED",
            message:"Password Length is Short"
            });
    }
    else{
        User.find({email}).then(result=>{
            console.log(result.length);
            if (result.length>0){
                res.json({
                    status:"FAILED",
                    message:"Sorry, The User Already Exists"
                })
            }
            else{
                const saltRounds=10;
                bcrypt.hash(password,saltRounds).then((hashPassword)=>{
                    const newUser=new User({
                        name,
                        email,
                        password:hashPassword,
                        dateOfBirth
                    });
                    newUser.save().then(result=>{
                        res.json({
                            status : "SUCCESS",
                            message:"User is Successfully Saved",
                            data:result,
                        });
                    }).catch(err=>{
                        res.json({
                            status : "FAILED",
                            message:"Error is saving the user Data onto the database"
                        });
                    })
                }).catch((err)=>{
                    res.json({
                        status :"FAILED",
                        message:"Error Occured While Hashing the Password"
                    });
                })
            }
        }).catch((err)=>{
            console.log(err);
            res.json({
                status : "FAILED",
                message:"An Error Occured in Searching the User in the User DB"
            })
        })
    }

});

// SignIn API Call
router.post("/signIn",(req,res)=>{
    let {email,password}=req.body;
    email=email.trim();
    password=password.trim();
    if (email==""||password==""){
        res.json({
            status : "FAILED",
            message:"Something is Missing while Logging In"
        })
    }
    else{
        User.find({email}).then(dta=>
            {
                // console.log(dta.length," ",dta[0].password);
            if (dta.length>0){
                const hashPassword=dta[0].password;
                bcrypt.compare(password,hashPassword).then(result=>{
                    if (result){
                        res.json({
                            status:"SUCCESS",
                            message:"SigIn Successfull",
                            data:dta,
                        })
                    }
                    else{
                        res.json({
                            status:"FAILED",
                            message:"Password Doesn't Match",
                        })
                    }
                }).catch(err=>{
                    res.json({
                        status:"FAILED",
                        message:"There is an error while comparing the password",
                    });
                })
            }
            else{
                res.json({
                    status :"FAILED",
                    message:"The User doesn't exists in the System",
                });
            }

        }).catch(err=>{
            res.json({
                status:"FAILED",
                message:"There was an error while searching for the record",
            });
        })
    }
    
});
module.exports=router;