import {Router} from "express";
import {sendReminders} from "../controllers/workflowController";

const workflowRouter=Router();

workflowRouter.post('/subscription/reminders',sendReminders);

export default workflowRouter;

