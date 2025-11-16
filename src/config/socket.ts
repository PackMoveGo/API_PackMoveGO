/**
 * Socket.IO Configuration
 * Extracted from server.ts for better organization
 */

import{Server} from 'socket.io';
import{Server as HttpServer} from 'http';
import SocketUtils from '../util/socket-utils';
import{consoleLogger} from '../util/console-logger';

/**
 * Configure Socket.IO server
 */
export function configureSocketIO(httpServer:HttpServer):Server{
  const io=new Server(httpServer,{
    cors:{
      origin:[
        'https://www.packmovego.com',
        'https://packmovego.com',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5000',
        'http://localhost:5001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:5001'
      ],
      methods:['GET','POST'],
      credentials:true
    }
  });

  // Initialize Socket.IO
  consoleLogger.socketInit();
  const socketUtils=new SocketUtils(io);
  consoleLogger.socketReady();

  // Log connection summary every 5 minutes
  setInterval(()=>{
    const users=socketUtils.getConnectedUsers();
    const admins=socketUtils.getAdminUsers();
    
    if(users.length>0){
      consoleLogger.info('socket','Connection Summary',{
        totalUsers:users.length,
        adminUsers:admins.length,
        users:users.map(u=>({userId:u.userId,email:u.email,role:u.userRole}))
      });
    }
  },5*60*1000); // 5 minutes

  return io;
}

export default configureSocketIO;

