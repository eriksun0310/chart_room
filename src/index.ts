import devServer from "@/server/dev";
import prodServer from "@/server/prod";
import express from "express";
import { Server } from 'socket.io'
import http from 'http'
import UserService from "@/service/UserService";
import moment from "moment";

import { name } from "@/utils";

const port = 3008;
const app = express();
const server = http.createServer(app)
const io = new Server(server)
const userService = new UserService()


// socket.on:用來接收訊息
// socket.emit:用來傳遞訊息

// 監測連接
io.on('connection', (socket)=>{

  socket.emit("userID", socket.id)

  socket.on('join', ({userName, roomName}:{userName:string, roomName:string})=>{
    const userData = userService.userDataInfoHandler(
      socket.id,
      userName,
      roomName
    )

    //用 roomName 創建一個唯一的空間
    socket.join(userData?.roomName)

    // 新增用戶 (socket.broadcast.to: 自己看不到自己發出的訊息
    userService.addUser(userData)
    socket.broadcast.to(userData.roomName).emit('join',`${userName}加入了${roomName}聊天室`)
    // io.emit('join',`${userName}加入了${roomName}聊天室`)
  })

  // 後端收到從前端傳來的msg
  socket.on('chat', (msg)=>{
    const time  = moment.utc()
    const userData = userService.getUser(socket.id)
    if(userData){
      // 發送給 特定的[roomName] 訊息( io.to:是指自己也要看到訊息
      io.to(userData?.roomName).emit('chat', {userData, msg , time})
      // io.emit('chat', msg)
    }

  })

  // 斷開連結
  socket.on('disconnect',()=>{
    // 取得用戶
    const userData = userService.getUser(socket.id)
    const userName = userData?.userName
    if(userName){
      socket.broadcast.to(userData?.roomName).emit('leave', `${userName}離開聊天室`)
      // io.emit('leave', `${userName}離開聊天室`)
    }
    // 移除用戶
    userService.removeUser(socket.id)
  })
})


// 執行npm run dev本地開發 or 執行npm run start部署後啟動線上伺服器
if (process.env.NODE_ENV === "development") {
  devServer(app);
} else {
  prodServer(app);
}



console.log("server side", name);

server.listen(port, () => {
  console.log(`The application is running on port ${port}.`);
});
