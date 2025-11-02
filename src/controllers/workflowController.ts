import dayjs from 'dayjs';
import Subscription from '../models/subscriptionModel';
import {Request,Response,NextFunction} from 'express';

const REMINDDERS=[7,5,2,1];

// MongoDB-based reminder endpoint (no Upstash needed)
export const sendReminders=async (req:Request,res:Response,next:NextFunction)=>{
    try{
        const {subscriptionId}=req.body;
        
        if(!subscriptionId){
            return res.status(400).json({
                success:false,
                message:'Subscription ID required'
            });
        }

        const subscription=await (Subscription.findById as any)(subscriptionId)
            .populate('user','name email');

        if(!subscription || subscription.status!=='active'){
            return res.status(404).json({
                success:false,
                message:'Subscription not found or inactive'
            });
        }

        const renewalDate=dayjs(subscription.renewalDate);
        if(renewalDate.isBefore(dayjs())){
            return res.status(400).json({
                success:false,
                message:'Renewal date has passed'
            });
        }

        // Calculate reminder dates
        const reminders=REMINDDERS.map(daysBefore=>({
            daysBefore,
            date:renewalDate.subtract(daysBefore,'day').toDate(),
            label:`${daysBefore} days before renewal`
        })).filter(r=>dayjs(r.date).isAfter(dayjs()));

        // Store reminders in MongoDB or implement a cron job system
        console.log(`Calculated ${reminders.length} reminders for subscription ${subscription._id}`);

        res.status(200).json({ 
            success:true, 
            message:'Reminders calculated',
            data:{
                subscriptionId,
                renewalDate:renewalDate.toISOString(),
                reminders
            }
        });
    }catch(error){
        next(error);
    }
}

