const mongoose = require('mongoose');

const userShema = new Schema({
    name: {
        type: String,
        required: true,
    },
    emaill:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
    role: {
        type: String,
        default: 'user',
    },
    createdAt:{
        type: Date,
        default: Date.now,
    }
});

const User = mongoose.model('Users',userShema);
