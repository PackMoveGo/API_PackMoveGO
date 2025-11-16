import {Router} from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import {createSubscription,getSubscriptions} from '../controllers/subscriptionController';

const subscriptionRouter=Router();

subscriptionRouter.get('/',(_req,res)=>res.send({title:'Get all subscriptions'}));
subscriptionRouter.get('/:id',(_req,res)=>res.send({title:'Get subscription details'}));
subscriptionRouter.post('/',requireAuth,createSubscription);
subscriptionRouter.put('/:id',(_req,res)=>res.send({title:'UPDATE subscription'}));
subscriptionRouter.delete('/:id',(_req,res)=>res.send({title:'DELETE subscription'}));
subscriptionRouter.get('/user/:id',requireAuth,getSubscriptions);
subscriptionRouter.put('/:id/cancel',(_req,res)=>res.send({title:'CANCEL subscription'}));
subscriptionRouter.get('/upcoming-renewals',(_req,res)=>res.send({title:'GET upcoming renewals'}));

export default subscriptionRouter;

