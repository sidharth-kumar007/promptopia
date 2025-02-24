import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import User from '@models/user';
import { connectToDB } from '@utils/database';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async session({ session }) {
      // store the user id from MongoDB to session
      const sessionUser = await User.findOne({ email: session.user.email });
      session.user.id = sessionUser._id.toString();

      return session;
    },
    async signIn({ account, profile, user, credentials }) {
      try {
        await connectToDB();
    
        // check if user already exists
        const userExists = await User.findOne({ email: profile.email });
    
        // if not, create a new document and save user in MongoDB
        if (!userExists) {
          // generate a username:
          // Use the profile name if available; fallback to email local-part.
          let rawUsername = profile.name
            ? profile.name.replace(/\s+/g, '').toLowerCase()
            : profile.email.split('@')[0];
          
          // Ensure username length is between 8 and 20 characters:
          if (rawUsername.length < 8) {
            rawUsername = rawUsername.padEnd(8, '0');
          } else if (rawUsername.length > 20) {
            rawUsername = rawUsername.substring(0, 20);
          }
          
          await User.create({
            email: profile.email,
            username: rawUsername,
            image: profile.picture,
          });
        }
        
        return true;
      } catch (error) {
        console.log("Error checking if user exists: ", error.message);
        return false
      }
    },
    async signOut({ account, profile, user, credentials }) {
      return true;
    }
  }
})

export { handler as GET, handler as POST }