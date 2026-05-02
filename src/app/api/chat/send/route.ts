import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import ChatMessage from "@/models/chatMessage.model";

export async function POST(req:Request){

 await connectDb()

 const {rideId,text,sender}=await req.json()

 const msg=await ChatMessage.create({
  rideId,
  text,
  sender
 })

 return NextResponse.json({
  success:true,
  message:msg
 })
}