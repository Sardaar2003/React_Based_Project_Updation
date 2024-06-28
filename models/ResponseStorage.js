const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const ResponseStorageSchema=new Schema({
    offerId: {
    type: String,
    required: true
  },
  emailId: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  countryCode: {
    type: String,
    required: true
  },
  addressCode: {
    type: String,
    required: true
  },
  cityName: {
    type: String,
    required: true
  },
  stateName: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  cardNumber: {
    type: String,
    required: true
  },
  cardCVV: {
    type: String,
    required: true
  },
  expiryMonth: {
    type: String,
    required: true
  },
  expiryYear: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
  },
  responseData: {
      type: String,
      default: ''
  },
  gateWayResponseID: {
      type: String,
      default: ''
  },
  gateWayID: {
      type: String,
      default: ''
  },
  gateAuthCode: {
      type: String,
      default: ''
  },
  customerID: {
      type: String,
      default: ''
  },
  OrderNotes: {
      type: String,
      default: ''
  },
  message: {
      type: String,
      default: ''
  },
  orderID: {
      type: String,
      default: ''
  }
    
});

const ResponseStorage=mongoose.model("ResponseStorage",ResponseStorageSchema);
module.exports=ResponseStorage;