import {Request,Response,NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel-alt';

const JWT_SECRET=process.env.JWT_SECRET || '';

const authorize=async (req:Request,res:Response,next:NextFunction)=>{
    try{
        let token;
        if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
            token=req.headers.authorization.split(' ')[1];
        }
        if(!token)return res.status(401).json({message:'Unauthorized'});
        const decoded=jwt.verify(token,JWT_SECRET) as {userId:string};
        const user=await (User.findById as any)(decoded.userId);
        if(!user)return res.status(401).json({message:'Unauthorized'});
        (req as any).user=user;
        next();
    }catch(error){
        res.status(401).json({message:'Unauthorized',error:(error as Error).message});
    }
}

export default authorize;

