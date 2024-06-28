const express=require("express");
const router=express.Router();

//Mongoose DB
const User=require("../models/User.js");

//User Verification DB
const UserVerification = require("../models/UserVerification.js");

//ResetPassword DB
const PasswordReset = require("../models/PasswordReset.js");

//Response Storage DB
const ResponseStorage = require("../models/ResponseStorage.js");

// Axios for Project Related
const axios = require("axios");

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
const { count } = require("console");

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

const sendVerificationEmail= async ({_id,email},res)=>
{
        
        //url to be used in the email
    const currentUrl = "https://react-based-project-updation.onrender.com/";
    const differentUrl = "http://localhost:8080/";
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
                        .deleteMany({ userId })
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

//Password Reset Stuff
router.post("/requestPasswordReset", async (req, res) => {
    const { email, redirectUrl } = req.body;
    await User
        .find({ email })
        .then((result) => {
            if (result.length > 0) {
                // User Exists
                //Check if the User is verified
                if (!result[0].verified) {
                    res.json({
                        status: "FAILED",
                        message: "Email hasn't been Verified Yet.",
                    });
                }
                else {
                    sendPasswordReset(result[0], redirectUrl, res);
                }
            }
            else {
                res.json({
                    status: "FAILED",
                    message: "No Account was Found",
                });
            }
        })
        .catch((err) => {
            console.log(err);
            res.json({
                status: "FAILED",
                message: "There was an error while searching for the record",
            });
        })
});


//Send Passsword Reset
const sendPasswordReset = ({_id,email},redirectUrl,res) =>
{
    const resetString = uuidv4() + _id;
    PasswordReset
        .deleteMany({ userId: _id })
        .then((result) =>
        {
            // Send the Email
            const mailOptions=
                {
                    from:process.env.AUTH_EMAIL,
                    to:email,
                    subject:"Password Reset",
                    html:`
                        <p>We received a request to reset your password. Click the link below to reset your password:</p>
                        <p>The link <b>expires</b> in 60 minutes.</p>
                        <p>Press <a href="${redirectUrl + "/" + _id + "/" + resetString}">here</a> to reset your password.</p>
                        <p>If you did not request a password reset, please ignore this email.</p>
                    `,
            };

            //Hash the Reset String
            const saltRounds = 10;
            bcrypt
                .hash(resetString,saltRounds)
                .then((hashedUniqueString)=>
                    {
                        const newPasswordReset=new PasswordReset(
                            {
                                userId:_id,
                                resetString:hashedUniqueString,
                                createdAt:Date.now(),
                                expiresAt:Date.now()+3600000,
                            }
                        );
                    
                        newPasswordReset
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
                                            message:"Password Reset Email Sent",
                                        })
                                    })
                                .catch((error)=>{
                                    console.log(error);
                                    res.json({
                                        status : "FAILED",
                                        message:"Password Reset Email Couldn't be sent",
                                    });
                                })
                            })
                        .catch((error)=>{
                            console.log(error);
                            res.json({
                                status : "FAILED",
                                message:"Couldn't save Password Reset Data",
                            });
                        })
                    }
                )
                .catch((err)=>{
                    res.json({
                        status : "FAILED",
                        message:"An Error occured while Hashing the Password reset data",
                    });
                })
            

        })
        .catch((err) =>
        { 
            console.log(err);
            res.json({
                status:"FAILED",
                message:"Clearing the Password Reset Record Failed",
            });
        })
}

// Actually Reseting the Password
router.post("/resetPassword", async (req, res) =>
{
    let { userId, resetString, newPassword } = req.body;

    await PasswordReset
        .find({ userId })
        .then((result) =>
        {
            if (result.length > 0)
            {
                // Password Reset Record Exists
                const { expiresAt } = result[0];
                const HashedResetString = result[0].resetString;
                if (expiresAt < Date.now())
                {
                    PasswordReset
                        .deleteMany({ _id: userId })
                        .then(() =>
                        {
                            // Reset Record Deleted Successfully
                            res.json({
                                status:"FAILED",
                                message:"Password reset Link has Expired",
                            });
                        })
                        .catch(error =>
                        {
                            res.json({
                                status:"FAILED",
                                message:"Clearing Password Reset Record Failed",
                            });
                        })
                }
                else
                {
                    
                    bcrypt.compare(resetString, HashedResetString)
                        .then(result => {
                            if (result){
                                
                                const saltRounds = 10;
                                bcrypt
                                    .hash(newPassword, saltRounds)
                                    .then((hashedNewPassword) =>
                                    {
                                        User
                                            .updateOne({ _id: userId }, { password: hashedNewPassword })
                                            .then(() =>
                                                {
                                                // Update the Password Now Delete the Password Reset Record
                                                PasswordReset
                                                    .deleteMany({ _id: userId })
                                                    .then(() =>
                                                    {
                                                        res.json({
                                                            status:"SUCCESS",
                                                            message:"Password has been set Successfully",
                                                        });
                                                    })
                                                    .catch((err) =>
                                                    {
                                                        console.log(err);
                                                        res.json({
                                                            status:"FAILED",
                                                            message:"An Error Occurred While Finalising Password Reset",
                                                        });
                                                    })
                                                })
                                            .catch((error) =>
                                            {
                                                console.log(error);
                                                res.json({
                                                    status:"FAILED",
                                                    message:"Updating user Password Failed",
                                                });

                                            })
                                        
                                    })
                                    .catch((error) =>
                                    {
                                        console.log(error);
                                        res.json({
                                            status:"FAILED",
                                            message:"An Error Occured while Hashing the New Password",
                                        });
                                    })
                            }
                            else{
                                res.json({
                                    status:"FAILED",
                                    message:"Invalid Password Reset details passed",
                                });
                            }
                    }).catch(err=>{
                        res.json({
                            status:"FAILED",
                            message:"Comparing Password reset strings failed",
                        });
                    })
                }
                
            }
            else
            {
                res.json({
                    status:"FAILED",
                    message:"Password reset request not found",
                });
            }
        })
        .catch((err) =>
        {
            console.log(err);
            res.json({
                status:"FAILED",
                message:"Checking for existing Password Record",
            });

        })

})

// OAuth Token 
router.post("/AuthToken", async (req, res) =>
{
    postData = {
        "client_id": "c7a811dc-559d-4faf-897e-70c75f861677",
        "client_secret": "ZEDAeKYfY=2X=8MVbMRCBPKeWwxQqM9k5ZPzdFIxm",
        "grant_type":"client_credentials"
    }
    await axios.post("https://rest.zuora.com/oauth/token", postData,
        {
            headers:
            {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    )
        .then((response) =>
        {
            console.log(response.data);
            res.json({
                status: "SUCCESS",
                access_token: response.data.access_token,
                expires_in: response.data.expires_in,
                JTI: response.data.jti,
                scope: response.data.scope,
                token_type:response.data.token_type
            })

        })
        .catch((error) => {
            
            res.json({
                                status:"FAILED",
                                message:"Error while getting the Authentication Token",
                            });

        })
})

router.post("/APIRequest_01", async (req, res) => {
    const { offerId, emailId, phoneNumber, firstName, lastName, countryCode, addressCode, cityName, stateName, zipCode, cardNumber, cardCVV, expiryMonth, expiryYear } = req.body;
    const postData = {
        "user_id": 37,
        "user_password": "QsouP9!5",
        "connection_id": 1,
        "payment_method_id": 1,
        "campaign_id": 1,
        "offers": [
            {
                "offer_id": offerId,
                "order_offer_quantity": 1
            },
        ],
        "currency_id": 1,
        "email": emailId,
        "phone": phoneNumber,
        "bill_fname": firstName,
        "bill_lname": lastName,
        "bill_country": countryCode,
        "bill_address1": addressCode,
        "bill_city": cityName,
        "bill_state": stateName,
        "bill_zipcode": zipCode,
        "shipping_same": true,
        "card_type_id": 2,
        "card_number": cardNumber,
        "card_cvv": cardCVV,
        "card_exp_month": expiryMonth,
        "card_exp_year": expiryYear,
        "tracking1": "SA",
        "tracking2": "01"
    }
    try {
        const emailCount = await ResponseStorage.countDocuments({ emailId });
        console.log("Checking the count");
        if (emailCount >= 2) {
            return res.json({
                sucess: "FAILURE",
                message: "Limit Exceeded"
            });
        }
    } catch (err) {
        console.log(err);
        res.json({
            sucess: "FAILURE",
            message: "Error while Searching the database for the required emailID"
        });
    }
    console.log(postData);
        
    try {
        const response=await axios.post("https://globalmarketingpartners.sublytics.com/api/order/doAddProcess", postData,
            {
                headers:
                {
                    'Content-Type': 'application/json'
                }
            })
            
                console.log("Response Data : ");
                if (response.data.success) {
                    const transaction = response.data.data.transaction;
                    const order = transaction.order;

                    const responseMessage = transaction.response;
                    const gatewayResponseId = transaction.gateway_response_id;
                    const gatewayGatewayId = transaction.gateway_response_gateway_id;
                    const gatewayAuthCode = transaction.gateway_auth_code;

                    const orderId = order.id;
                    const customerId = order.customer_id;
                    const orderNotes = order.order_notes;
                    const responseValue = new ResponseStorage({
                        offerId: offerId,
                        emailId: emailId,
                        phoneNumber: phoneNumber,
                        firstName: firstName,
                        lastName: lastName,
                        countryCode: countryCode,
                        addressCode: addressCode,
                        cityName: cityName,
                        stateName: stateName,
                        zipCode: zipCode,
                        cardNumber: cardNumber,
                        cardCVV: cardCVV,
                        expiryMonth: expiryMonth,
                        expiryYear: expiryYear,
                        status: response.data.success,
                        responseData: responseMessage,
                        gateWayResponseID: gatewayResponseId,
                        gateWayID: gatewayGatewayId,
                        gateAuthCode: gatewayAuthCode,
                        orderID: orderId,
                        customerID: customerId,
                        OrderNotes: orderNotes,
                    });
                    console.log(responseValue);
                
                    await responseValue.save()
                        .then((cons) => {
                            console.log("Saving Successful ", cons);
                            res.json({
                                status: "SUCCESS",
                                responseData: responseMessage,
                                gateWayResponseID: gatewayResponseId,
                                gateWayID: gatewayGatewayId,
                                gateAuthCode: gatewayAuthCode,
                                ORDERID: orderId,
                                customerID: customerId,
                                OrderNotes: orderNotes,
                            });
                        })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "Error While Saving the Data on the Database"
                            });
                        });

                
                }
                else {
                    const responseData = error.response.data;
                    const messageResposne = responseData.message;
                    const orderId = responseData.data.order_id;
                    const responseValue01 = new ResponseStorage({
                        offerId: offerId,
                        emailId: emailId,
                        phoneNumber: phoneNumber,
                        firstName: firstName,
                        lastName: lastName,
                        countryCode: countryCode,
                        addressCode: addressCode,
                        cityName: cityName,
                        stateName: stateName,
                        zipCode: zipCode,
                        cardNumber: cardNumber,
                        cardCVV: cardCVV,
                        expiryMonth: expiryMonth,
                        expiryYear: expiryYear,
                        status: response.data.success,
                        responseData: messageResposne,
                        orderID: orderId,
                    });
                    console.log(responseValue01);
                    await responseValue01.save()
                        .then(() => {
                            console.log(responseValue01);
                            res.json({
                                status: "FAILED",
                                message: `${messageResposne}`,
                                orderID: orderId,
                                        
                            });
                        })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "Error While Saving the Data on the Database"
                            });
                        });
                }
            
            
    }
    catch (error) {
        console.log(error);
        // const reason = error.data.reason;
        // const orderId = error.data.order_id;
        // const message = error.message;
        const responseValue02 = new ResponseStorage({
                        offerId: offerId,
                        emailId: emailId,
                        phoneNumber: phoneNumber,
                        firstName: firstName,
                        lastName: lastName,
                        countryCode: countryCode,
                        addressCode: addressCode,
                        cityName: cityName,
                        stateName: stateName,
                        zipCode: zipCode,
                        cardNumber: cardNumber,
                        cardCVV: cardCVV,
                        expiryMonth: expiryMonth,
                        expiryYear: expiryYear,
                        status: "false",
                        responseData: reason + " "+message,
                        orderID: orderId,
                    });
                    console.log(responseValue02);
                    await responseValue02.save()
                        .then(() => {
                            console.log(responseValue02);
                            res.json({
                                status: "FAILED",
                                message: `Error While Communicating with the Client Server , Reason : ${reason} , Message : ${message} `,
                                orderID: orderId
                            })
                        })
                        .catch(err => {
                            res.json({
                                status: "FAILED",
                                message: "Error While Saving the Data on the Database"
                            });
                        });
        
    }
})
module.exports=router;