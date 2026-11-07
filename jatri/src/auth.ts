import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import connectDb from "./lib/db"
import User from "./models/user.model"
import bcrypt from "bcryptjs"
import Google from "next-auth/providers/google"
import { rateLimiter } from "./lib/rateLimit"
import { verifyOtpCode } from "./lib/cryptoOtp"
 

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    name: string;
    email: string;
    image?: string;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      name: string;
      email: string;
      image?: string;
    }
  }
  interface JWT {
    id: string;
    role: string;
    name: string;
    email: string;
    picture?: string;
    lastRoleCheck?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "email", type: "email" },
        password: { label: "password", type: "password" },
        phone: { label: "phone", type: "text" },
        otp: { label: "otp", type: "text" },
        isPhoneLogin: { label: "isPhoneLogin", type: "text" },
      },
      async authorize(credentials, request) {
        await connectDb();

        // 📱 1. PHONE + WHATSAPP OTP LOGIN
        if (credentials?.isPhoneLogin === "true") {
          const rawPhone = credentials.phone as string;
          const otp = credentials.otp as string;

          if (!rawPhone || !otp) {
            throw new Error("Phone number and OTP are required");
          }

          const cleaned = rawPhone.replace(/\D/g, "");
          const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

          const user = await User.findOne({ mobileNumber: tenDigits });

          if (!user) {
            throw new Error("No account found with this mobile number");
          }

          // Check DB-level lockout
          if (user.otpLockedUntil && new Date() < user.otpLockedUntil) {
            const minutesLeft = Math.ceil((user.otpLockedUntil.getTime() - Date.now()) / (60 * 1000));
            throw new Error(`Account locked due to multiple failed OTP attempts. Please wait ${minutesLeft} minute(s).`);
          }

          // Rate Limiting & Brute-Force Lockout (synced with route-level limiter)
          const phoneLimitKey = `phone:${tenDigits}:verify-otp`;
          const phoneCheck = rateLimiter.check(phoneLimitKey, 5, 5 * 60 * 1000);

          if (!phoneCheck.allowed) {
            rateLimiter.lockout(phoneLimitKey, 15 * 60 * 1000);
            await User.findByIdAndUpdate(user._id, {
              otpLockedUntil: new Date(Date.now() + 15 * 60 * 1000),
            });
            throw new Error("Too many failed attempts. Account temporarily locked for 15 minutes for your security.");
          }

          const isValidOtp = await verifyOtpCode(otp, user.otp);

          if (!isValidOtp) {
            const failedAttempts = (user.otpFailedAttempts || 0) + 1;
            const willLock = failedAttempts >= 5;
            await User.findByIdAndUpdate(user._id, {
              $inc: { otpFailedAttempts: 1 },
              ...(willLock ? { otpLockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}),
            });

            if (willLock) {
              rateLimiter.lockout(phoneLimitKey, 15 * 60 * 1000);
              throw new Error("Too many failed attempts. Account locked for 15 minutes. Please request a new OTP later.");
            }

            const remaining = Math.max(0, 5 - failedAttempts);
            throw new Error(
              remaining > 0
                ? `Invalid OTP code. ${remaining} attempt(s) remaining.`
                : "Invalid OTP code. Too many failed attempts. Please request a new OTP."
            );
          }

          if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
            throw new Error("OTP has expired. Please request a new one.");
          }

          // Reset rate limiter & DB lockout on successful verification
          rateLimiter.reset(phoneLimitKey);

          user.isMobileVerified = true;
          user.otp = undefined;
          user.otpExpiresAt = undefined;
          user.otpFailedAttempts = 0;
          user.otpLockedUntil = null;
          await user.save();

          return {
            id: user._id.toString(),
            email: user.email || `${tenDigits}@ridenow.in`,
            name: user.name || `User ${tenDigits.slice(-4)}`,
            role: user.role || "user",
          };
        }

        // ✉️ 2. EMAIL + PASSWORD LOGIN
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        // Rate limiting for password attempts (5 attempts per 5 minutes)
        const emailLimitKey = `email:${email}:login`;
        const emailCheck = rateLimiter.check(emailLimitKey, 5, 5 * 60 * 1000);
        if (!emailCheck.allowed) {
          rateLimiter.lockout(emailLimitKey, 15 * 60 * 1000);
          throw new Error("Too many failed login attempts. Temporarily locked for 15 minutes.");
        }

        const user = await User.findOne({ email });

        if (!user) {
          throw new Error("User does not exist");
        }

        if (!user.password) {
          throw new Error("Account was created using Google or Phone login. Please use that method.");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          throw new Error("Incorrect password");
        }

        // Reset rate limiter on successful password login
        rateLimiter.reset(emailLimitKey);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    Google({
      clientId: (process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "").trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "").trim(),
      allowDangerousEmailAccountLinking: true,
    })
  ],
  callbacks:{
    // token ke ander user ka data dalta hai
    async signIn({user,account}) {
      if(account?.provider=="google"){
        await connectDb()
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;
        let dbUser = await User.findOne({ email });
        if(!dbUser){
          dbUser = await User.create({
            name: user.name || "User",
            email,
            profilePicture: user.image || undefined,
            isEmailVerified: true,
            role: "user",
          });
        } else {
          let hasUpdates = false;
          if (!dbUser.isEmailVerified) {
            dbUser.isEmailVerified = true;
            hasUpdates = true;
          }
          if (!dbUser.profilePicture && user.image) {
            dbUser.profilePicture = user.image;
            hasUpdates = true;
          }
          if (hasUpdates) {
            await dbUser.save();
          }
        }

        user.id = dbUser._id.toString();
        user.role = dbUser.role || "user";
      }
      return true;
    },
    async jwt({token,user,trigger,session}) {
        const now = Date.now();

        if(user){
            token.id=user.id;
            token.name=user.name;
            token.email=user.email;
            token.role=user.role;
            if (user.image) token.picture = user.image;
            token.lastRoleCheck = now;
            return token;
        }

        // On explicit role transition or profile update, refresh immediately from DB
        if (trigger === "update") {
            if (token.id) {
                await connectDb();
                const dbUser = await User.findById(token.id).select("role name email");
                if (dbUser) {
                    token.role = dbUser.role;
                    if (dbUser.name) token.name = dbUser.name;
                    if (dbUser.email) token.email = dbUser.email;
                    token.lastRoleCheck = now;
                }
            }
            return token;
        }

        // ⚡ INSTANT IN-MEMORY AUTH (<0.5ms): If role is present and verified within last 5 minutes, bypass DB
        const lastCheck = (token.lastRoleCheck as number) || 0;
        const isStale = (now - lastCheck) > (5 * 60 * 1000);

        if (!token.role || isStale) {
            const targetUserId = token.id as string;
            if (targetUserId) {
                await connectDb();
                const dbUser = await User.findById(targetUserId).select("role email name");
                if (dbUser) {
                    token.role = dbUser.role;
                    token.id = dbUser._id.toString();
                    if (dbUser.email && !token.email) token.email = dbUser.email;
                    token.lastRoleCheck = now;
                }
            } else if (token.email) {
                await connectDb();
                const dbUser = await User.findOne({ email: token.email }).select("role");
                if (dbUser) {
                    token.role = dbUser.role;
                    token.id = dbUser._id.toString();
                    token.lastRoleCheck = now;
                }
            }
        }

        return token;
    },
    session({session,token}) {
        if(session.user){
            session.user.id=token.id as string;
            session.user.name=token.name as string;
            session.user.email=token.email as string;
            session.user.role=token.role as string;
            if (token.picture) session.user.image = token.picture as string;
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
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "jaatri-nextauth-fallback-secret-key-at-least-32-chars-long"
})


// connect db
//email check
//password match