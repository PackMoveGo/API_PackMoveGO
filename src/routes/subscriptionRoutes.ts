import {Router} from 'express';
import authorize from '../middlewares/auth-middleware-alt';
import {createSubscription,getSubscriptions} from '../controllers/subscriptionController';

const subscriptionRouter=Router();

subscriptionRouter.get('/',(req,res)=>res.send({title:'Get all subscriptions'}));
subscriptionRouter.get('/:id',(req,res)=>res.send({title:'Get subscription details'}));
subscriptionRouter.post('/',authorize,createSubscription);
subscriptionRouter.put('/:id',(req,res)=>res.send({title:'UPDATE subscription'}));
subscriptionRouter.delete('/:id',(req,res)=>res.send({title:'DELETE subscription'}));
subscriptionRouter.get('/user/:id',authorize,getSubscriptions);
subscriptionRouter.put('/:id/cancel',(req,res)=>res.send({title:'CANCEL subscription'}));
subscriptionRouter.get('/upcoming-renewals',(req,res)=>res.send({title:'GET upcoming renewals'}));

export default subscriptionRouter;

