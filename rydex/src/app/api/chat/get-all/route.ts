import ChatMessage from "@/models/chatMessage.model"
import connectDb from "@/lib/db"

export async function POST(
 req:Request
){
const {rideId}=await req.json()
 await connectDb()

 const messages=await ChatMessage
 .find({rideId})
 .sort({createdAt:1})

 return Response.json({
  messages
 })
}