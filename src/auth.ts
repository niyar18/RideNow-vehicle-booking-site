import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db"
import User from "./models/user.model"
import bcrypt from "bcryptjs"
import Google from "next-auth/providers/google"
 

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    name: string;
    email: string;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      name: string;
      email: string;
    }
  }
  interface JWT {
    id: string;
    role: string;
    name: string;
    email: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
        credentials: {
        email: { label: "email",type:"email" },
        password: { label: "password", type: "password" },
      } ,
     async authorize(credentials, request) {
          if (!credentials?.email || !credentials?.password) {
    throw new Error("Missing credentials")
  }
            await connectDb()
            const email=credentials.email
            const password=credentials.password as string
            const user=await User.findOne({email})
            if(!user){
                throw new Error("user does not exist")
            }
            const isMatch=await bcrypt.compare(password,user.password)
            if(!isMatch){
                throw new Error("incorrect password")
            }
            return {
                id:user._id.toString(),
                email:user.email,
                name:user.name,
                role:user.role
            }

          } 
    
    }),
    Google({
      clientId:process.env.GOOGLE_CLIENT_ID as string,
      clientSecret:process.env.GOOGLE_CLIENT_SECRET as string
    })
  ],
  callbacks:{
    // token ke ander user ka data dalta hai
    async signIn({user,account}) {
      console.log(user)
      if(account?.provider=="google"){
        await connectDb()
        let dbUser=await User.findOne({email:user.email})
       if(!dbUser){
         dbUser=await User.create({
          name:user.name,
          email:user.email,
         })
       }

       user.id=dbUser._id.toString()
       user.role=dbUser.role
      }
      return true
    },
    jwt({token,user,trigger,session}) {
        if(user){
            token.id=user.id,
            token.name=user.name,
            token.email=user.email,
            token.role=user.role
        }
  if(trigger=="update"){
    token.role=session.role
  }


        return token
    },
    session({session,token}) {
        if(session.user){
            session.user.id=token.id as string,
            session.user.name=token.name as string,
            session.user.email=token.email as string
             session.user.role=token.role as string
        }
        return session
    },
  },
  pages:{
    signIn:"/",
    error:"/"
  },
  session:{
    strategy:"jwt",
    maxAge:10*24*60*60
  },
  secret:process.env.AUTH_SECRET
})


// connect db
//email check
//password match