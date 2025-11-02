import mongoose from 'mongoose';

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,'User Name is required'],
        trim:true,
        minlength:2,
        maxlength:50,
    },
    email:{
        type:String,
        required:[true,'User Email is required'],
        trim:true,
        lowercase:true,
        match:[/\S+@\S+\.\S+/,'Please fill a valid email address'],
    },
    password:{
        type:String,
        required:[true,'User Password is required'],
        minlength:8,
    },
},{timestamps:true});

// Use existing model if already compiled (prevents OverwriteModelError)
const User=mongoose.models.User || mongoose.model('User',userSchema);

export default User;

