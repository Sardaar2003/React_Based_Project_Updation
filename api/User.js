const express=require("express");
const router=express.Router();

//Mongoose DB
const User=require("../models/User.js");

//Mongoose DB
const UserVerification=require("../models/UserVerification.js");

//Email Handler
const nodemailer=require("nodemailer");

//UUID
const {v4 : uuidv4}=require("uuid");

//Password Handler
const bcrypt=require("bcrypt");

//Environment Variables
require("dotenv").config();

//Path for static website
const path=require("path");

//Nodemailer Transporter
let transporter=nodemailer.createTransport(
    {
        service:"gmail",
        auth:
        {
            user:process.env.AUTH_EMAIL,
            pass:process.env.PASSWORD,
        }
        
    }
)

//Testing Success
transporter.verify((error,success)=>
    {
        if (error){
            console.log(error);
        }
        else{
            console.log("Ready for sending Messages");
            console.log(success);
        }
    }
)

// Checking the Format of date 
function isValidDate(dateOfBirth) {
    const date = new Date(dateOfBirth);
    const time = date.getTime();
    return !isNaN(time);
}

// Sign Up API Call
router.post("/signUp", async (req,res)=>{
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
        await User.find({email}).then(result=>{
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
                        dateOfBirth,
                        verified:false,
                    });
                    newUser.save().then(result=>{
                        //Handle Account Verification
                        sendVerificationEmail(result,res);
                        // res.json({
                        //     status : "SUCCESS",
                        //     message:"User is Successfully Saved",
                        //     data:result,
                        // });
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

console.log(path.join(__dirname, './../views/verification.html'));
const sendVerificationEmail= async ({_id,email},res)=>
{
        
        //url to be used in the email
        const currentUrl="http://localhost:5000/";
        const uniqueString=uuidv4()+_id;
        const mailOptions=
        {
            from:process.env.AUTH_EMAIL,
            to:email,
            subject:"Verify your Email",
            html:`<p>Verify your email address to complete the signup process and login into your account.</p><p>The link <b>expires</b> in 6 hrs.</p><p>Press <a href=${currentUrl+"user/verify/"+_id+"/"+uniqueString}> here to proceed.</p>`,
        };
        //Hash the Unique String
        const saltRounds=10;
        bcrypt
        .hash(uniqueString,saltRounds)
        .then((hashedUniqueString)=>
            {
                const newVerification=new UserVerification(
                    {
                        userId:_id,
                        uniqueString:hashedUniqueString,
                        createdAt:Date.now(),
                        expiresAt:Date.now()+21600000,
                    }
                );
                newVerification
                .save()
                .then(()=>
                    {
                        transporter
                        .sendMail(mailOptions)
                        .then(()=>
                            {
                                //email sent
                                res.json({
                                    status : "PENDING",
                                    message:"Verification Email Sent",
                                })
                            })
                        .catch((error)=>{
                            console.log(error);
                            res.json({
                                status : "FAILED",
                                message:"Verification Email Couldn't be sent",
                            });
                        })
                    })
                .catch((error)=>{
                    console.log(error);
                    res.json({
                        status : "FAILED",
                        message:"Couldn't save email Verification Data",
                    });
                })
            }
        )
        .catch((err)=>{
            res.json({
                status : "FAILED",
                message:"An Error occured while Hashing the email data",
            });
        })
    }

//Verify Email
router.get("/verify/:userId/:uniqueString", async (req, res) => {
    let { userId, uniqueString } = req.params;
    await UserVerification
        .find({ userId })
        .then((result) => {
            if (result.length > 0) {
                // User Verification Successful
                const { expiresAt } = result[0];
                const hashedUniqueString = result[0].uniqueString;
                if (expiresAt < Date.now()) {
                    // Record has expired
                    UserVerification
                        .deleteOne({ userId })
                        .then((result) => {
                            User
                                .deleteOne({ _id: userId })
                                .then((result) => {
                                    let message = encodeURIComponent("Link has expired. Please sign up again.");
                                    res.redirect(`/user/verified?error=true&message=${message}`);
                                })
                                .catch((err) => {
                                    console.log(err);
                                    let message = encodeURIComponent("Clearing user with expired unique string failed.");
                                    res.redirect(`/user/verified?error=true&message=${message}`);
                                })
                        })
                        .catch((err) => {
                            console.log(err);
                            let message = encodeURIComponent("An error occurred while removing expired user verification.");
                            res.redirect(`/user/verified?error=true&message=${message}`);
                        });
                } else {
                    // Valid record exists so we validate the user string
                    bcrypt
                        .compare(uniqueString, hashedUniqueString)
                        .then((result) => {
                            if (result) {
                                // String matches
                                User
                                    .updateOne({ _id: userId }, { verified: true })
                                    .then(() => {
                                        UserVerification
                                            .deleteOne({ userId })
                                            .then(() => {
                                                res.redirect("/user/verified");
                                            })
                                            .catch((err) => {
                                                let message = encodeURIComponent("An error occurred while removing verified user records.");
                                                res.redirect(`/user/verified?error=true&message=${message}`);
                                            });
                                    })
                                    .catch((err) => {
                                        let message = encodeURIComponent("An error occurred while updating the user verification record to show verified.");
                                        res.redirect(`/user/verified?error=true&message=${message}`);
                                    });
                            } else {
                                let message = encodeURIComponent("Invalid verification details passed. Check your inbox.");
                                res.redirect(`/user/verified?error=true&message=${message}`);
                            }
                        })
                        .catch((err) => {
                            let message = encodeURIComponent("An error occurred while comparing the unique string.");
                            res.redirect(`/user/verified?error=true&message=${message}`);
                        });
                }
            } else {
                // User Verification Unsuccessful
                let message = encodeURIComponent("Account record doesn't exist or has been already verified. Please sign up or login.");
                res.redirect(`/user/verified?error=true&message=${message}`);
            }
        })
        .catch((err) => {
            console.log(err);
            let message = encodeURIComponent("An error occurred while checking the existing user verification record.");
            res.redirect(`/user/verified?error=true&message=${message}`);
        });
});
//Verified Page Route
router.get("/verified",(req,res)=>
    {
        res.sendFile(path.join(__dirname,"./../views/verification.html"));
    })

// SignIn API Call
router.post("/signIn",async (req,res)=>{
    let {email,password}=req.body;
    email=email.trim();
    password=password.trim();
    if (email==""||password==""){
        res.json({
            status : "FAILED",
            message:"Something is Missing while Logging In"
        });
    }
    else{
        await User.find({email}).then(dta=>
            {
                // console.log(dta.length," ",dta[0].password);
            if (dta.length > 0) {
                
                // Checking If the User is verified

                if (!dta[0].verified)
                {
                    res.json({
                        status: "FAILED",
                        message: "Email Hasn't been Verified Yet. Please Check Your Inbox"
                    });

                }
                else
                {
                    const hashPassword=dta[0].password;
                    bcrypt.compare(password,hashPassword).then(result=>{
                        if (result){
                            res.json({
                                status:"SUCCESS",
                                message:"SigIn Successfull",
                                data:dta,
                            });
                        }
                        else{
                            res.json({
                                status:"FAILED",
                                message:"Password Doesn't Match",
                            });
                        }
                    }).catch(err=>{
                        res.json({
                            status:"FAILED",
                            message:"There is an error while comparing the password",
                        });
                    })
                }
                
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