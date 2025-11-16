import {Request,Response,NextFunction} from 'express';
import Subscription from '../models/subscriptionModel';

// @ts-ignore - Reserved for future feature
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _HOST=process.env['HOST'] || 'http://localhost:3000';

export const createSubscription=async (req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try{
        const subscription=await (Subscription.create as any)({
            ...req.body,
            user:(req as any).user.id, 
        });
        
        // Subscription created in MongoDB (no Upstash workflow)
        // Implement your own reminder system using MongoDB + cron jobs or node-schedule
        
        res.status(201).json({
            success:true,
            data:{subscription},
            message:'Subscription created successfully'
        });
    }catch(error){
        next(error);
    }
}

export const getSubscriptions=async (req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try{
        if((req as any).user.id!==req.params.id){
            const error=new Error('You are not the owner of this account') as any;
            error.statusCode=401;
            throw error;
        }
        const subscriptions=await (Subscription.find as any)({user:(req as any).user.id});
        res.status(200).json({success:true,data:subscriptions});
    }catch(error){
        next(error);
    }
}

